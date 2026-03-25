import { Hono } from "jsr:@hono/hono@4";
import { cors } from "jsr:@hono/hono@4/cors";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use("*", cors());

const getAdminClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
};

const getUserIdFromAuth = (authHeader: string | undefined): string | null => {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub;
  } catch {
    return null;
  }
};

app.get("/make-server-b3841c63/health", (c) => {
  return c.json({ status: "ok" });
});

// ============= AUTH =============

app.post("/make-server-b3841c63/auth/signup", async (c) => {
  try {
    const { email, password, firstName, lastName } = await c.req.json();
    const supabase = getAdminClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { firstName, lastName },
      email_confirm: true
    });
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ user: data.user });
  } catch (error) {
    return c.json({ error: 'Failed to sign up user' }, 500);
  }
});

// ============= FAMILIES =============

app.post("/make-server-b3841c63/families", async (c) => {
  try {
    const userId = getUserIdFromAuth(c.req.header('Authorization'));
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

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

    return c.json({ familyId, message: 'Family tree created successfully' });
  } catch (error) {
    return c.json({ error: 'Failed to create family tree' }, 500);
  }
});

app.get("/make-server-b3841c63/families/my-family", async (c) => {
  try {
    const userId = getUserIdFromAuth(c.req.header('Authorization'));
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const familyId = await kv.get(`family_member_${userId}`);
    if (!familyId) return c.json({ family: null });

    const family = await kv.get(familyId);
    return c.json({ family });
  } catch (error) {
    return c.json({ error: 'Failed to get family' }, 500);
  }
});

// ============= PERSONS =============

app.get("/make-server-b3841c63/families/:familyId/persons", async (c) => {
  try {
    const userId = getUserIdFromAuth(c.req.header('Authorization'));
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const familyId = c.req.param('familyId');
    const persons = await kv.getByPrefix(`person_${familyId}_`);
    return c.json({ persons: persons || [] });
  } catch (error) {
    return c.json({ error: 'Failed to get persons' }, 500);
  }
});

app.post("/make-server-b3841c63/families/:familyId/persons", async (c) => {
  try {
    const userId = getUserIdFromAuth(c.req.header('Authorization'));
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const familyId = c.req.param('familyId');
    const personData = await c.req.json();

    const personId = `person_${familyId}_${Date.now()}`;
    const person = {
      ...personData,
      id: personId,
      familyId,
      createdAt: new Date().toISOString(),
    };

    await kv.set(personId, person);

    // Log activity
    const activityId = `activity_${familyId}_${Date.now()}`;
    await kv.set(activityId, {
      id: activityId,
      type: 'added_person',
      userId,
      userName: personData.firstName || userId,
      targetPersonName: `${personData.firstName} ${personData.lastName}`,
      timestamp: new Date().toISOString(),
    });

    return c.json({ person });
  } catch (error) {
    return c.json({ error: 'Failed to add person' }, 500);
  }
});

app.put("/make-server-b3841c63/families/:familyId/persons/:personId", async (c) => {
  try {
    const userId = getUserIdFromAuth(c.req.header('Authorization'));
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const personId = c.req.param('personId');
    const updates = await c.req.json();

    const existingPerson = await kv.get(personId);
    if (!existingPerson) return c.json({ error: 'Person not found' }, 404);

    const updatedPerson = { ...existingPerson, ...updates };
    await kv.set(personId, updatedPerson);

    return c.json({ person: updatedPerson });
  } catch (error) {
    return c.json({ error: 'Failed to update person' }, 500);
  }
});

app.delete("/make-server-b3841c63/families/:familyId/persons/:personId", async (c) => {
  try {
    const userId = getUserIdFromAuth(c.req.header('Authorization'));
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const familyId = c.req.param('familyId');
    const personId = c.req.param('personId');

    await kv.del(personId);

    const relationships = await kv.getByPrefix(`relationship_${familyId}_`);
    for (const rel of relationships || []) {
      if (rel.person1Id === personId || rel.person2Id === personId) {
        await kv.del(rel.id);
      }
    }

    return c.json({ message: 'Person deleted successfully' });
  } catch (error) {
    return c.json({ error: 'Failed to delete person' }, 500);
  }
});

// ============= RELATIONSHIPS =============

app.get("/make-server-b3841c63/families/:familyId/relationships", async (c) => {
  try {
    const userId = getUserIdFromAuth(c.req.header('Authorization'));
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const familyId = c.req.param('familyId');
    const relationships = await kv.getByPrefix(`relationship_${familyId}_`);
    return c.json({ relationships: relationships || [] });
  } catch (error) {
    return c.json({ error: 'Failed to get relationships' }, 500);
  }
});

app.post("/make-server-b3841c63/families/:familyId/relationships", async (c) => {
  try {
    const userId = getUserIdFromAuth(c.req.header('Authorization'));
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const familyId = c.req.param('familyId');
    const relationshipData = await c.req.json();

    const relationshipId = `relationship_${familyId}_${Date.now()}`;
    const relationship = {
      ...relationshipData,
      id: relationshipId,
      familyId,
    };

    await kv.set(relationshipId, relationship);
    return c.json({ relationship });
  } catch (error) {
    return c.json({ error: 'Failed to add relationship' }, 500);
  }
});

// ============= ACTIVITIES =============

app.get("/make-server-b3841c63/families/:familyId/activities", async (c) => {
  try {
    const userId = getUserIdFromAuth(c.req.header('Authorization'));
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const familyId = c.req.param('familyId');
    const activities = await kv.getByPrefix(`activity_${familyId}_`);

    const sorted = (activities || []).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return c.json({ activities: sorted.slice(0, 10) });
  } catch (error) {
    return c.json({ error: 'Failed to get activities' }, 500);
  }
});

// ============= INVITATIONS =============

app.post("/make-server-b3841c63/families/:familyId/invitations", async (c) => {
  try {
    const userId = getUserIdFromAuth(c.req.header('Authorization'));
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const familyId = c.req.param('familyId');
    const { email } = await c.req.json();

    const invitationId = `invitation_${Date.now()}`;
    const invitation = {
      id: invitationId,
      familyId,
      email,
      invitedBy: userId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    await kv.set(invitationId, invitation);

    const origin = c.req.header('origin') || 'https://your-app.com';
    const invitationLink = `${origin}/invitation/${invitationId}`;

    return c.json({ invitation, invitationLink });
  } catch (error) {
    return c.json({ error: 'Failed to create invitation' }, 500);
  }
});

app.get("/make-server-b3841c63/invitations/:invitationId", async (c) => {
  try {
    const invitationId = c.req.param('invitationId');
    const invitation = await kv.get(invitationId);
    if (!invitation) return c.json({ error: 'Invitation not found' }, 404);

    const family = await kv.get(invitation.familyId);
    return c.json({ invitation, familyName: family?.name });
  } catch (error) {
    return c.json({ error: 'Failed to get invitation' }, 500);
  }
});

app.post("/make-server-b3841c63/invitations/:invitationId/accept", async (c) => {
  try {
    const userId = getUserIdFromAuth(c.req.header('Authorization'));
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const invitationId = c.req.param('invitationId');
    const invitation = await kv.get(invitationId);
    if (!invitation) return c.json({ error: 'Invitation not found' }, 404);

    const family = await kv.get(invitation.familyId);
    if (family) {
      family.memberIds = [...(family.memberIds || []), userId];
      await kv.set(invitation.familyId, family);
    }

    await kv.set(`family_member_${userId}`, invitation.familyId);
    invitation.status = 'accepted';
    await kv.set(invitationId, invitation);

    return c.json({ message: 'Invitation accepted', familyId: invitation.familyId });
  } catch (error) {
    return c.json({ error: 'Failed to accept invitation' }, 500);
  }
});

// ============= PHOTO UPLOAD =============

app.post("/make-server-b3841c63/upload-photo", async (c) => {
  try {
    const userId = getUserIdFromAuth(c.req.header('Authorization'));
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    if (!file) return c.json({ error: 'No file provided' }, 400);

    const supabase = getAdminClient();
    const bucketName = 'make-b3841c63-family-photos';
    const fileName = `${userId}/${Date.now()}_${file.name}`;

    const { error } = await supabase.storage.from(bucketName).upload(fileName, file);
    if (error) return c.json({ error: error.message }, 500);

    const { data: signedUrlData } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 31536000);

    return c.json({ photoUrl: signedUrlData?.signedUrl });
  } catch (error) {
    return c.json({ error: 'Failed to upload photo' }, 500);
  }
});

export default app;