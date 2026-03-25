import { Hono } from "jsr:@hono/hono@4";
import { cors } from "jsr:@hono/hono@4/cors";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use("*", cors());

const getAdminClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

// ── Auth helper ──────────────────────────────────────────────────────────────
// Verifies the Bearer JWT with Supabase Auth and returns the user id.
const getUserIdFromAuth = async (
  authHeader: string | undefined
): Promise<string | null> => {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
};

// ── Health ───────────────────────────────────────────────────────────────────
app.get("/make-server-b3841c63/health", (c) => c.json({ status: "ok" }));

// ── Auth ─────────────────────────────────────────────────────────────────────
app.post("/make-server-b3841c63/auth/signup", async (c) => {
  try {
    const { email, password, firstName, lastName } = await c.req.json();
    const supabase = getAdminClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { firstName, lastName },
      email_confirm: true,
    });
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ user: data.user });
  } catch (e) {
    return c.json({ error: "Failed to sign up user" }, 500);
  }
});

// ── Families ─────────────────────────────────────────────────────────────────
app.post("/make-server-b3841c63/families", async (c) => {
  const userId = await getUserIdFromAuth(c.req.header("Authorization"));
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const { name } = await c.req.json();
  const familyId = `family_${crypto.randomUUID()}`;
  await kv.set(familyId, {
    id: familyId,
    name,
    ownerId: userId,
    createdAt: new Date().toISOString(),
    memberIds: [userId],
  });
  await kv.set(`family_member_${userId}`, familyId);
  return c.json({ familyId, message: "Family tree created successfully" });
});

app.get("/make-server-b3841c63/families/my-family", async (c) => {
  const userId = await getUserIdFromAuth(c.req.header("Authorization"));
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const familyId = await kv.get(`family_member_${userId}`);
  if (!familyId) return c.json({ family: null });
  const family = await kv.get(familyId);
  return c.json({ family });
});

// ── Persons ───────────────────────────────────────────────────────────────────
app.get("/make-server-b3841c63/families/:familyId/persons", async (c) => {
  const userId = await getUserIdFromAuth(c.req.header("Authorization"));
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const familyId = c.req.param("familyId");
  const persons = await kv.getByPrefix(`person_${familyId}_`);
  return c.json({ persons: persons || [] });
});

app.post("/make-server-b3841c63/families/:familyId/persons", async (c) => {
  const userId = await getUserIdFromAuth(c.req.header("Authorization"));
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const familyId = c.req.param("familyId");
  const personData = await c.req.json();
  const personId = `person_${familyId}_${crypto.randomUUID()}`;
  const person = {
    ...personData,
    id: personId,
    familyId,
    createdAt: new Date().toISOString(),
  };
  await kv.set(personId, person);

  const activityId = `activity_${familyId}_${crypto.randomUUID()}`;
  await kv.set(activityId, {
    id: activityId,
    type: "added_person",
    userId,
    userName: `${personData.firstName ?? ""} ${personData.lastName ?? ""}`.trim(),
    targetPersonName: `${person.firstName} ${person.lastName}`,
    timestamp: new Date().toISOString(),
  });

  return c.json({ person });
});

app.put(
  "/make-server-b3841c63/families/:familyId/persons/:personId",
  async (c) => {
    const userId = await getUserIdFromAuth(c.req.header("Authorization"));
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const personId = c.req.param("personId");
    const updates = await c.req.json();
    const existing = await kv.get(personId);
    if (!existing) return c.json({ error: "Person not found" }, 404);

    const updated = { ...existing, ...updates };
    await kv.set(personId, updated);
    return c.json({ person: updated });
  }
);

app.delete(
  "/make-server-b3841c63/families/:familyId/persons/:personId",
  async (c) => {
    const userId = await getUserIdFromAuth(c.req.header("Authorization"));
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const familyId = c.req.param("familyId");
    const personId = c.req.param("personId");
    await kv.del(personId);

    const rels = await kv.getByPrefix(`relationship_${familyId}_`);
    for (const rel of rels || []) {
      if (rel.person1Id === personId || rel.person2Id === personId) {
        await kv.del(rel.id);
      }
    }
    return c.json({ message: "Person deleted successfully" });
  }
);

// ── Relationships ─────────────────────────────────────────────────────────────
app.get(
  "/make-server-b3841c63/families/:familyId/relationships",
  async (c) => {
    const userId = await getUserIdFromAuth(c.req.header("Authorization"));
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const familyId = c.req.param("familyId");
    const relationships = await kv.getByPrefix(`relationship_${familyId}_`);
    return c.json({ relationships: relationships || [] });
  }
);

app.post(
  "/make-server-b3841c63/families/:familyId/relationships",
  async (c) => {
    const userId = await getUserIdFromAuth(c.req.header("Authorization"));
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const familyId = c.req.param("familyId");
    const data = await c.req.json();
    const relId = `relationship_${familyId}_${crypto.randomUUID()}`;
    const relationship = { ...data, id: relId, familyId };
    await kv.set(relId, relationship);
    return c.json({ relationship });
  }
);

// ── Activities ────────────────────────────────────────────────────────────────
app.get("/make-server-b3841c63/families/:familyId/activities", async (c) => {
  const userId = await getUserIdFromAuth(c.req.header("Authorization"));
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const familyId = c.req.param("familyId");
  const activities = await kv.getByPrefix(`activity_${familyId}_`);
  const sorted = (activities || []).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  return c.json({ activities: sorted.slice(0, 10) });
});

// ── Invitations ───────────────────────────────────────────────────────────────
app.post(
  "/make-server-b3841c63/families/:familyId/invitations",
  async (c) => {
    const userId = await getUserIdFromAuth(c.req.header("Authorization"));
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const familyId = c.req.param("familyId");
    const { email } = await c.req.json();
    const invitationId = `invitation_${crypto.randomUUID()}`;
    const invitation = {
      id: invitationId,
      familyId,
      email,
      invitedBy: userId,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    await kv.set(invitationId, invitation);

    const origin = c.req.header("origin") ?? c.req.header("referer") ?? "";
    const invitationLink = `${origin}/invitation/${invitationId}`;
    return c.json({ invitation, invitationLink });
  }
);

app.get("/make-server-b3841c63/invitations/:invitationId", async (c) => {
  const invitationId = c.req.param("invitationId");
  const invitation = await kv.get(invitationId);
  if (!invitation) return c.json({ error: "Invitation not found" }, 404);
  const family = await kv.get(invitation.familyId);
  return c.json({ invitation, familyName: family?.name });
});

app.post(
  "/make-server-b3841c63/invitations/:invitationId/accept",
  async (c) => {
    const userId = await getUserIdFromAuth(c.req.header("Authorization"));
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const invitationId = c.req.param("invitationId");
    const invitation = await kv.get(invitationId);
    if (!invitation) return c.json({ error: "Invitation not found" }, 404);

    const family = await kv.get(invitation.familyId);
    if (family) {
      family.memberIds = [...new Set([...(family.memberIds || []), userId])];
      await kv.set(invitation.familyId, family);
    }
    await kv.set(`family_member_${userId}`, invitation.familyId);
    invitation.status = "accepted";
    await kv.set(invitationId, invitation);

    return c.json({ message: "Invitation accepted", familyId: invitation.familyId });
  }
);

// ── Photo upload ──────────────────────────────────────────────────────────────
app.post("/make-server-b3841c63/upload-photo", async (c) => {
  const userId = await getUserIdFromAuth(c.req.header("Authorization"));
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const formData = await c.req.formData();
  const file = formData.get("file") as File;
  if (!file) return c.json({ error: "No file provided" }, 400);

  const supabase = getAdminClient();
  const bucketName = "make-b3841c63-family-photos";
  const fileName = `${userId}/${Date.now()}_${file.name}`;

  const { error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, file);
  if (error) return c.json({ error: error.message }, 500);

  const { data: signed } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(fileName, 31536000);

  return c.json({ photoUrl: signed?.signedUrl });
});

export default app;