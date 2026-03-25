import { Hono } from "jsr:@hono/hono@4";
import { cors } from "jsr:@hono/hono@4/cors";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use("*", cors());

const getAdminClient = () => {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
};

const getUserIdFromAuth = (authHeader: string | undefined): string | null => {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub;
  } catch {
    return null;
  }
};

// Health
app.get("/make-server-b3841c63/health", (c) => c.json({ status: "ok" }));

// ── AUTH ──────────────────────────────────────────────────────────────────────

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

// ── FAMILIES ──────────────────────────────────────────────────────────────────

app.post("/make-server-b3841c63/families", async (c) => {
  const userId = getUserIdFromAuth(c.req.header("Authorization"));
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { name } = await c.req.json();
    const familyId = `family_${Date.now()}`;
    await kv.set(familyId, {
      id: familyId,
      name,
      ownerId: userId,
      createdAt: new Date().toISOString(),
      memberIds: [userId],
    });
    await kv.set(`family_member_${userId}`, familyId);
    return c.json({ familyId, message: "Family tree created successfully" });
  } catch (e) {
    return c.json({ error: "Failed to create family tree" }, 500);
  }
});

app.get("/make-server-b3841c63/families/my-family", async (c) => {
  const userId = getUserIdFromAuth(c.req.header("Authorization"));
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  try {
    const familyId = await kv.get(`family_member_${userId}`);
    if (!familyId) return c.json({ family: null });
    const family = await kv.get(familyId);
    return c.json({ family });
  } catch (e) {
    return c.json({ error: "Failed to get family" }, 500);
  }
});

// ── PERSONS ───────────────────────────────────────────────────────────────────

app.get("/make-server-b3841c63/families/:familyId/persons", async (c) => {
  const userId = getUserIdFromAuth(c.req.header("Authorization"));
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { familyId } = c.req.param();
    const persons = await kv.getByPrefix(`person_${familyId}_`);
    return c.json({ persons: persons || [] });
  } catch (e) {
    return c.json({ error: "Failed to get persons" }, 500);
  }
});

app.post("/make-server-b3841c63/families/:familyId/persons", async (c) => {
  const userId = getUserIdFromAuth(c.req.header("Authorization"));
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { familyId } = c.req.param();
    const personData = await c.req.json();
    const personId = `person_${familyId}_${Date.now()}`;
    const person = { ...personData, id: personId, familyId, createdAt: new Date().toISOString() };
    await kv.set(personId, person);
    const activityId = `activity_${familyId}_${Date.now()}`;
    await kv.set(activityId, {
      id: activityId,
      type: "added_person",
      userId,
      userName: personData.firstName || userId,
      targetPersonName: `${person.firstName} ${person.lastName}`,
      timestamp: new Date().toISOString(),
    });
    return c.json({ person });
  } catch (e) {
    return c.json({ error: "Failed to add person" }, 500);
  }
});

app.put("/make-server-b3841c63/families/:familyId/persons/:personId", async (c) => {
  const userId = getUserIdFromAuth(c.req.header("Authorization"));
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { personId } = c.req.param();
    const updates = await c.req.json();
    const existing = await kv.get(personId);
    if (!existing) return c.json({ error: "Person not found" }, 404);
    const updated = { ...existing, ...updates };
    await kv.set(personId, updated);
    return c.json({ person: updated });
  } catch (e) {
    return c.json({ error: "Failed to update person" }, 500);
  }
});

app.delete("/make-server-b3841c63/families/:familyId/persons/:personId", async (c) => {
  const userId = getUserIdFromAuth(c.req.header("Authorization"));
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { familyId, personId } = c.req.param();
    await kv.del(personId);
    const rels = await kv.getByPrefix(`relationship_${familyId}_`);
    for (const rel of rels || []) {
      if (rel.person1Id === personId || rel.person2Id === personId) {
        await kv.del(rel.id);
      }
    }
    return c.json({ message: "Person deleted successfully" });
  } catch (e) {
    return c.json({ error: "Failed to delete person" }, 500);
  }
});

// ── RELATIONSHIPS ─────────────────────────────────────────────────────────────

app.get("/make-server-b3841c63/families/:familyId/relationships", async (c) => {
  const userId = getUserIdFromAuth(c.req.header("Authorization"));
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { familyId } = c.req.param();
    const relationships = await kv.getByPrefix(`relationship_${familyId}_`);
    return c.json({ relationships: relationships || [] });
  } catch (e) {
    return c.json({ error: "Failed to get relationships" }, 500);
  }
});

app.post("/make-server-b3841c63/families/:familyId/relationships", async (c) => {
  const userId = getUserIdFromAuth(c.req.header("Authorization"));
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { familyId } = c.req.param();
    const data = await c.req.json();
    const relId = `relationship_${familyId}_${Date.now()}`;
    const relationship = { ...data, id: relId, familyId };
    await kv.set(relId, relationship);
    return c.json({ relationship });
  } catch (e) {
    return c.json({ error: "Failed to add relationship" }, 500);
  }
});

// ── ACTIVITIES ────────────────────────────────────────────────────────────────

app.get("/make-server-b3841c63/families/:familyId/activities", async (c) => {
  const userId = getUserIdFromAuth(c.req.header("Authorization"));
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { familyId } = c.req.param();
    const activities = await kv.getByPrefix(`activity_${familyId}_`);
    const sorted = (activities || []).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    return c.json({ activities: sorted.slice(0, 10) });
  } catch (e) {
    return c.json({ error: "Failed to get activities" }, 500);
  }
});

// ── INVITATIONS ───────────────────────────────────────────────────────────────

app.post("/make-server-b3841c63/families/:familyId/invitations", async (c) => {
  const userId = getUserIdFromAuth(c.req.header("Authorization"));
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { familyId } = c.req.param();
    const { email } = await c.req.json();
    const invId = `invitation_${Date.now()}`;
    const invitation = {
      id: invId,
      familyId,
      email,
      invitedBy: userId,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    await kv.set(invId, invitation);
    const origin = c.req.header("origin") || c.req.header("referer") || "";
    const invitationLink = `${origin}/invitation/${invId}`;
    return c.json({ invitation, invitationLink });
  } catch (e) {
    return c.json({ error: "Failed to create invitation" }, 500);
  }
});

app.get("/make-server-b3841c63/invitations/:invitationId", async (c) => {
  try {
    const { invitationId } = c.req.param();
    const invitation = await kv.get(invitationId);
    if (!invitation) return c.json({ error: "Invitation not found" }, 404);
    const family = await kv.get(invitation.familyId);
    return c.json({ invitation, familyName: family?.name });
  } catch (e) {
    return c.json({ error: "Failed to get invitation" }, 500);
  }
});

app.post("/make-server-b3841c63/invitations/:invitationId/accept", async (c) => {
  const userId = getUserIdFromAuth(c.req.header("Authorization"));
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { invitationId } = c.req.param();
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
  } catch (e) {
    return c.json({ error: "Failed to accept invitation" }, 500);
  }
});

// ── PHOTO UPLOAD ──────────────────────────────────────────────────────────────

app.post("/make-server-b3841c63/upload-photo", async (c) => {
  const userId = getUserIdFromAuth(c.req.header("Authorization"));
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    if (!file) return c.json({ error: "No file provided" }, 400);
    const supabase = getAdminClient();
    const bucketName = "make-b3841c63-family-photos";
    const fileName = `${userId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from(bucketName).upload(fileName, file);
    if (error) return c.json({ error: error.message }, 500);
    const { data: signedUrlData } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 31536000);
    return c.json({ photoUrl: signedUrlData?.signedUrl });
  } catch (e) {
    return c.json({ error: "Failed to upload photo" }, 500);
  }
});

export default app;