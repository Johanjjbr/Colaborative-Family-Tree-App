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

// Helper to map camelCase to snake_case for database
const mapPersonData = (data: any) => {
  return {
    first_name: data.firstName,
    last_name: data.lastName,
    birth_date: data.birthDate || null,
    birth_place: data.birthPlace || null,
    death_date: data.deathDate || null,
    gender: data.gender || 'other',
    photo_url: data.photoUrl || null,
    bio: data.biography || null,
    occupation: data.occupation || null,
  };
};

// Helper to map camelCase to snake_case for relationships
const mapRelationshipData = (data: any) => {
  return {
    relationship_type: data.type || data.relationship_type,
    person1_id: data.person1Id || data.person1_id,
    person2_id: data.person2Id || data.person2_id,
  };
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

app.post("/make-server-b3841c63/auth/signin", async (c) => {
  try {
    const { email, password } = await c.req.json();
    const supabase = getAdminClient();
    const { data, error } = await supabase.auth.admin.signInWithPassword({
      email,
      password,
    });
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ user: data.user, session: data.session });
  } catch (error) {
    return c.json({ error: 'Failed to sign in user' }, 500);
  }
});

// ============= FAMILIES =============

app.post("/make-server-b3841c63/families", async (c) => {
  try {
    const userId = getUserIdFromAuth(c.req.header('Authorization'));
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const { name } = await c.req.json();
    const familyId = `family_${Date.now()}`;

    const supabase = getAdminClient();
    
    // Create family in relational table
    const { data: family, error: familyError } = await supabase
      .from('families')
      .insert({
        id: familyId,
        name,
        owner_id: userId,
      })
      .select()
      .single();

    if (familyError) throw familyError;

    // Add owner as family member
    const { error: memberError } = await supabase
      .from('family_members')
      .insert({
        family_id: familyId,
        user_id: userId,
        role: 'owner',
      });

    if (memberError) throw memberError;

    return c.json({ familyId, message: 'Family tree created successfully' });
  } catch (error) {
    return c.json({ error: 'Failed to create family tree' }, 500);
  }
});

app.get("/make-server-b3841c63/families/my-family", async (c) => {
  try {
    const userId = getUserIdFromAuth(c.req.header('Authorization'));
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const supabase = getAdminClient();
    
    // Get family from family_members table
    const { data: memberData, error: memberError } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', userId)
      .single();

    if (memberError || !memberData) {
      return c.json({ family: null });
    }

    // Get family details
    const { data: family, error: familyError } = await supabase
      .from('families')
      .select('*')
      .eq('id', memberData.family_id)
      .single();

    if (familyError) throw familyError;
    
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
    const supabase = getAdminClient();
    const { data: persons, error } = await supabase
      .from('persons')
      .select('*')
      .eq('family_id', familyId);

    if (error) throw error;
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

    // Map camelCase to snake_case for database
    const mappedData = mapPersonData(personData);

    const supabase = getAdminClient();
    const { data: person, error } = await supabase
      .from('persons')
      .insert({
        ...mappedData,
        family_id: familyId,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Insert person error:', error);
      throw error;
    }

    console.log('Person created successfully:', { personId: person.id, familyId, userId });

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
  } catch (error: any) {
    console.error('Failed to add person:', error.message);
    return c.json({ error: error.message || 'Failed to add person' }, 500);
  }
});

app.put("/make-server-b3841c63/families/:familyId/persons/:personId", async (c) => {
  try {
    const userId = getUserIdFromAuth(c.req.header('Authorization'));
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const personId = c.req.param('personId');
    const updates = await c.req.json();

    // Map camelCase to snake_case for database
    const mappedUpdates = mapPersonData(updates);

    const supabase = getAdminClient();
    const { data: updatedPerson, error } = await supabase
      .from('persons')
      .update(mappedUpdates)
      .eq('id', personId)
      .select()
      .single();

    if (error) {
      console.error('Update person error:', error);
      throw error;
    }

    console.log('Person updated successfully:', { personId, userId });
    return c.json({ person: updatedPerson });
  } catch (error: any) {
    console.error('Failed to update person:', error.message);
    return c.json({ error: error.message || 'Failed to update person' }, 500);
  }
});

app.delete("/make-server-b3841c63/families/:familyId/persons/:personId", async (c) => {
  try {
    const userId = getUserIdFromAuth(c.req.header('Authorization'));
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const familyId = c.req.param('familyId');
    const personId = c.req.param('personId');

    const supabase = getAdminClient();
    
    // Delete relationships first
    const { error: relError } = await supabase
      .from('relationships')
      .delete()
      .or(`person1_id.eq.${personId},person2_id.eq.${personId}`);

    if (relError) throw relError;

    // Delete person
    const { error: personError } = await supabase
      .from('persons')
      .delete()
      .eq('id', personId);

    if (personError) throw personError;

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
    const supabase = getAdminClient();
    
    const { data: relationships, error } = await supabase
      .from('relationships')
      .select('*')
      .eq('family_id', familyId);

    if (error) throw error;
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

    // Map camelCase to snake_case
    const mappedData = {
      relationship_type: relationshipData.type || relationshipData.relationship_type,
      person1_id: relationshipData.person1Id || relationshipData.person1_id,
      person2_id: relationshipData.person2Id || relationshipData.person2_id,
      family_id: familyId,
    };

    const supabase = getAdminClient();
    const { data: relationship, error } = await supabase
      .from('relationships')
      .insert(mappedData)
      .select()
      .single();

    if (error) {
      console.error('Insert relationship error:', error);
      throw error;
    }

    console.log('Relationship created successfully:', { relationshipId: relationship.id, familyId, userId });
    return c.json({ relationship });
  } catch (error: any) {
    console.error('Failed to add relationship:', error.message);
    return c.json({ error: error.message || 'Failed to add relationship' }, 500);
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