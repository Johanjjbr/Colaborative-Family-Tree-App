import { Hono } from "jsr:@hono/hono@4";
import { cors } from "jsr:@hono/hono@4/cors";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Enable CORS
app.use("*", cors());

// Initialize Supabase admin client
const getAdminClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
};

// Simple auth - just verify that a user ID is provided
const getUserIdFromAuth = (authHeader: string | undefined): string | null => {
  if (!authHeader?.startsWith('Bearer ')) {
    console.log('No valid auth header');
    return null;
  }
  
  const token = authHeader.split(' ')[1];
  
  // For simplicity, we'll extract user info from the token payload
  // In a real production app, you'd verify the JWT signature
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('User authenticated:', payload.sub);
    return payload.sub; // user ID
  } catch (error) {
    console.log('Failed to parse token:', error);
    return null;
  }
};

// Health check endpoint
app.get("/make-server-b3841c63/health", (c) => {
  return c.json({ status: "ok" });
});

// ============= AUTH ROUTES =============

// Sign up a new user
app.post("/make-server-b3841c63/auth/signup", async (c) => {
  try {
    const { email, password, first_name, last_name } = await c.req.json();

    // Validate input
    if (!email || !password || !first_name || !last_name) {
      return c.json({ error: 'Todos los campos son requeridos' }, 400);
    }

    if (password.length < 6) {
      return c.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, 400);
    }

    const supabase = getAdminClient();

    // Create user with Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { first_name, last_name },
      email_confirm: true
    });

    if (error) {
      console.error('Auth signup error:', error.message);

      // Handle specific error cases
      if (error.message.includes('already registered') || error.message.includes('User already registered')) {
        return c.json({ error: 'Este email ya está registrado' }, 400);
      }

      return c.json({ error: error.message }, 400);
    }

    if (!data.user) {
      return c.json({ error: 'No se pudo crear el usuario' }, 500);
    }

    console.log('User created successfully:', data.user.id);
    return c.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        first_name,
        last_name
      },
      message: 'Usuario creado exitosamente'
    });
  } catch (error) {
    console.error('Signup error:', error);
    return c.json({ error: 'Error al registrar usuario. Por favor intente nuevamente.' }, 500);
  }
});

// ============= FAMILY ROUTES =============

// Create a new family tree
app.post("/make-server-b3841c63/families", async (c) => {
  try {
    const userId = getUserIdFromAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: 'Unauthorized - invalid or missing access token' }, 401);
    }

    const { name } = await c.req.json();
    const supabase = getAdminClient();

    // Create family in structured table
    const { data: familyData, error: familyError } = await supabase
      .from('families')
      .insert({
        name,
        owner_id: userId,
      })
      .select()
      .single();

    if (familyError) {
      console.error('Failed to create family:', familyError.message);
      return c.json({ error: 'Failed to create family tree' }, 500);
    }

    // Add owner as family member
    const { error: memberError } = await supabase
      .from('family_members')
      .insert({
        family_id: familyData.id,
        user_id: userId,
        role: 'owner',
      });

    if (memberError) {
      console.error('Failed to add family member:', memberError.message);
      return c.json({ error: 'Failed to create family member' }, 500);
    }

    // Also store in KV for backward compatibility
    await kv.set(`family_${familyData.id}`, {
      id: familyData.id,
      name: familyData.name,
      ownerId: userId,
      createdAt: familyData.created_at,
      memberIds: [userId],
    });
    await kv.set(`family_member_${userId}`, familyData.id);

    return c.json({ familyId: familyData.id, message: 'Family tree created successfully' });
  } catch (error) {
    console.log(`Create family error: ${error}`);
    return c.json({ error: 'Failed to create family tree' }, 500);
  }
});

// Get user's family
app.get("/make-server-b3841c63/families/my-family", async (c) => {
  try {
    const userId = getUserIdFromAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: 'Unauthorized - invalid or missing access token' }, 401);
    }

    const supabase = getAdminClient();

    // Get family ID from family_members table
    const { data: memberData, error: memberError } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (memberError) {
      console.error('Failed to get family member:', memberError.message);
      return c.json({ error: 'Failed to get family' }, 500);
    }

    if (!memberData) {
      return c.json({ family: null });
    }

    // Get family details
    const { data: familyData, error: familyError } = await supabase
      .from('families')
      .select('*')
      .eq('id', memberData.family_id)
      .single();

    if (familyError) {
      console.error('Failed to get family:', familyError.message);
      return c.json({ error: 'Failed to get family' }, 500);
    }

    return c.json({ family: { id: familyData.id, name: familyData.name, ownerId: familyData.owner_id, createdAt: familyData.created_at } });
  } catch (error) {
    console.log(`Get family error: ${error}`);
    return c.json({ error: 'Failed to get family' }, 500);
  }
});

// ============= PERSON ROUTES =============

// Get all persons in a family
app.get("/make-server-b3841c63/families/:familyId/persons", async (c) => {
  try {
    const userId = getUserIdFromAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: 'Unauthorized - invalid or missing access token' }, 401);
    }

    const familyId = c.req.param('familyId');
    const supabase = getAdminClient();

    // Get all persons from structured table
    const { data: personsData, error: personsError } = await supabase
      .from('persons')
      .select('*')
      .eq('family_id', familyId);

    if (personsError) {
      console.error('Failed to get persons:', personsError.message);
      return c.json({ error: 'Failed to get persons' }, 500);
    }

    // Transform to match expected format
    const persons = (personsData || []).map(p => ({
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      birthDate: p.birth_date,
      birthPlace: p.birth_place,
      deathDate: p.death_date,
      gender: p.gender,
      occupation: p.occupation,
      photo_url: p.photo_url,
      biography: p.bio,
    }));

    return c.json({ persons });
  } catch (error) {
    console.log(`Get persons error: ${error}`);
    return c.json({ error: 'Failed to get persons' }, 500);
  }
});

// Add a person
app.post("/make-server-b3841c63/families/:familyId/persons", async (c) => {
  try {
    const userId = getUserIdFromAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: 'Unauthorized - invalid or missing access token' }, 401);
    }

    const familyId = c.req.param('familyId');
    const personData = await c.req.json();
    const supabase = getAdminClient();

    // Insert person into structured table
    const { data: createdPerson, error: personError } = await supabase
      .from('persons')
      .insert({
        family_id: familyId,
        first_name: personData.first_name,
        last_name: personData.last_name,
        birth_date: personData.birthDate || null,
        birth_place: personData.birthPlace || null,
        death_date: personData.deathDate || null,
        gender: personData.gender || null,
        occupation: personData.occupation || null,
        photo_url: personData.photo_url || null,
        bio: personData.biography || null,
        created_by: userId,
      })
      .select()
      .single();

    if (personError) {
      console.error('Failed to create person:', personError.message);
      return c.json({ error: 'Failed to add person' }, 500);
    }

    // Create activity
    const { error: activityError } = await supabase
      .from('activities')
      .insert({
        family_id: familyId,
        user_id: userId,
        activity_type: 'added_person',
        target_person_id: createdPerson.id,
        metadata: {
          personName: `${createdPerson.first_name} ${createdPerson.last_name}`,
        },
      });

    if (activityError) {
      console.error('Failed to create activity:', activityError.message);
    }

    // Transform to match expected format
    const person = {
      id: createdPerson.id,
      first_name: createdPerson.first_name,
      last_name: createdPerson.last_name,
      birthDate: createdPerson.birth_date,
      birthPlace: createdPerson.birth_place,
      deathDate: createdPerson.death_date,
      gender: createdPerson.gender,
      occupation: createdPerson.occupation,
      photo_url: createdPerson.photo_url,
      biography: createdPerson.bio,
    };

    return c.json({ person });
  } catch (error) {
    console.log(`Add person error: ${error}`);
    return c.json({ error: 'Failed to add person' }, 500);
  }
});

// Update a person
app.put("/make-server-b3841c63/families/:familyId/persons/:personId", async (c) => {
  try {
    const userId = getUserIdFromAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: 'Unauthorized - invalid or missing access token' }, 401);
    }

    const personId = c.req.param('personId');
    const updates = await c.req.json();
    const supabase = getAdminClient();

    // Update person in structured table
    const { data: updatedPerson, error: updateError } = await supabase
      .from('persons')
      .update({
        first_name: updates.first_name,
        last_name: updates.last_name,
        birth_date: updates.birthDate || null,
        birth_place: updates.birthPlace || null,
        death_date: updates.deathDate || null,
        gender: updates.gender || null,
        occupation: updates.occupation || null,
        photo_url: updates.photo_url || null,
        bio: updates.biography || null,
      })
      .eq('id', personId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update person:', updateError.message);
      return c.json({ error: 'Failed to update person' }, 500);
    }

    // Transform to match expected format
    const person = {
      id: updatedPerson.id,
      first_name: updatedPerson.first_name,
      last_name: updatedPerson.last_name,
      birthDate: updatedPerson.birth_date,
      birthPlace: updatedPerson.birth_place,
      deathDate: updatedPerson.death_date,
      gender: updatedPerson.gender,
      occupation: updatedPerson.occupation,
      photo_url: updatedPerson.photo_url,
      biography: updatedPerson.bio,
    };

    return c.json({ person });
  } catch (error) {
    console.log(`Update person error: ${error}`);
    return c.json({ error: 'Failed to update person' }, 500);
  }
});

// Delete a person
app.delete("/make-server-b3841c63/families/:familyId/persons/:personId", async (c) => {
  try {
    const userId = getUserIdFromAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: 'Unauthorized - invalid or missing access token' }, 401);
    }

    const personId = c.req.param('personId');
    const supabase = getAdminClient();

    // Delete relationships first (cascade should handle this, but being explicit)
    await supabase
      .from('relationships')
      .delete()
      .or(`person1_id.eq.${personId},person2_id.eq.${personId}`);

    // Delete person from structured table
    const { error: deleteError } = await supabase
      .from('persons')
      .delete()
      .eq('id', personId);

    if (deleteError) {
      console.error('Failed to delete person:', deleteError.message);
      return c.json({ error: 'Failed to delete person' }, 500);
    }

    return c.json({ message: 'Person deleted successfully' });
  } catch (error) {
    console.log(`Delete person error: ${error}`);
    return c.json({ error: 'Failed to delete person' }, 500);
  }
});

// ============= RELATIONSHIP ROUTES =============

// Get all relationships in a family
app.get("/make-server-b3841c63/families/:familyId/relationships", async (c) => {
  try {
    const userId = getUserIdFromAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: 'Unauthorized - invalid or missing access token' }, 401);
    }

    const familyId = c.req.param('familyId');
    const supabase = getAdminClient();

    // Get all relationships from structured table
    const { data: relationshipsData, error: relationshipsError } = await supabase
      .from('relationships')
      .select('*')
      .eq('family_id', familyId);

    if (relationshipsError) {
      console.error('Failed to get relationships:', relationshipsError.message);
      return c.json({ error: 'Failed to get relationships' }, 500);
    }

    // Transform to match expected format
    const relationships = (relationshipsData || []).map(r => ({
      id: r.id,
      type: r.relationship_type,
      person1Id: r.person1_id,
      person2Id: r.person2_id,
    }));

    return c.json({ relationships });
  } catch (error) {
    console.log(`Get relationships error: ${error}`);
    return c.json({ error: 'Failed to get relationships' }, 500);
  }
});

// Add a relationship
app.post("/make-server-b3841c63/families/:familyId/relationships", async (c) => {
  try {
    const userId = getUserIdFromAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: 'Unauthorized - invalid or missing access token' }, 401);
    }

    const familyId = c.req.param('familyId');
    const relationshipData = await c.req.json();
    const supabase = getAdminClient();

    // Insert relationship into structured table
    const { data: createdRelationship, error: relationshipError } = await supabase
      .from('relationships')
      .insert({
        family_id: familyId,
        person1_id: relationshipData.person1Id,
        person2_id: relationshipData.person2Id,
        relationship_type: relationshipData.type,
      })
      .select()
      .single();

    if (relationshipError) {
      console.error('Failed to create relationship:', relationshipError.message);
      return c.json({ error: 'Failed to add relationship' }, 500);
    }

    // Transform to match expected format
    const relationship = {
      id: createdRelationship.id,
      type: createdRelationship.relationship_type,
      person1Id: createdRelationship.person1_id,
      person2Id: createdRelationship.person2_id,
    };

    return c.json({ relationship });
  } catch (error) {
    console.log(`Add relationship error: ${error}`);
    return c.json({ error: 'Failed to add relationship' }, 500);
  }
});

// ============= ACTIVITY ROUTES =============

// Get recent activities
app.get("/make-server-b3841c63/families/:familyId/activities", async (c) => {
  try {
    const userId = getUserIdFromAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: 'Unauthorized - invalid or missing access token' }, 401);
    }

    const familyId = c.req.param('familyId');
    const supabase = getAdminClient();

    // Get activities from structured table with user info
    const { data: activitiesData, error: activitiesError } = await supabase
      .from('activities')
      .select(`
        *,
        user:user_id (id, email, raw_user_meta_data),
        person:target_person_id (id, first_name, last_name)
      `)
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (activitiesError) {
      console.error('Failed to get activities:', activitiesError.message);
      return c.json({ error: 'Failed to get activities' }, 500);
    }

    // Transform to match expected format
    const activities = (activitiesData || []).map(a => ({
      id: a.id,
      type: a.activity_type,
      userId: a.user_id,
      userName: a.user?.raw_user_meta_data?.first_name || a.user?.email || 'Usuario',
      targetPersonName: a.person ? `${a.person.first_name} ${a.person.last_name}` : a.metadata?.personName || 'Desconocido',
      timestamp: a.created_at,
    }));

    return c.json({ activities });
  } catch (error) {
    console.log(`Get activities error: ${error}`);
    return c.json({ error: 'Failed to get activities' }, 500);
  }
});

// ============= INVITATION ROUTES =============

// Create invitation
app.post("/make-server-b3841c63/families/:familyId/invitations", async (c) => {
  try {
    const userId = getUserIdFromAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: 'Unauthorized - invalid or missing access token' }, 401);
    }

    const familyId = c.req.param('familyId');
    const { email } = await c.req.json();
    const supabase = getAdminClient();

    // Generate unique token
    const token = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Insert invitation into structured table
    const { data: createdInvitation, error: invitationError } = await supabase
      .from('invitations')
      .insert({
        family_id: familyId,
        email,
        invited_by: userId,
        token,
        status: 'pending',
      })
      .select()
      .single();

    if (invitationError) {
      console.error('Failed to create invitation:', invitationError.message);
      return c.json({ error: 'Failed to create invitation' }, 500);
    }

    // Generate invitation link
    const invitationLink = `${c.req.header('origin')}/invitation/${createdInvitation.id}`;

    return c.json({ invitation: createdInvitation, invitationLink });
  } catch (error) {
    console.log(`Create invitation error: ${error}`);
    return c.json({ error: 'Failed to create invitation' }, 500);
  }
});

// Get invitation by ID (public)
app.get("/make-server-b3841c63/invitations/:invitationId", async (c) => {
  try {
    const invitationId = c.req.param('invitationId');
    const supabase = getAdminClient();

    // Get invitation from structured table
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select('*, family:family_id (name)')
      .eq('id', invitationId)
      .single();

    if (invitationError || !invitation) {
      return c.json({ error: 'Invitation not found' }, 404);
    }

    return c.json({ invitation, familyName: invitation.family?.name });
  } catch (error) {
    console.log(`Get invitation error: ${error}`);
    return c.json({ error: 'Failed to get invitation' }, 500);
  }
});

// Accept invitation
app.post("/make-server-b3841c63/invitations/:invitationId/accept", async (c) => {
  try {
    const userId = getUserIdFromAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: 'Unauthorized - invalid or missing access token' }, 401);
    }

    const invitationId = c.req.param('invitationId');
    const supabase = getAdminClient();

    // Get invitation from structured table
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', invitationId)
      .single();

    if (invitationError || !invitation) {
      return c.json({ error: 'Invitation not found' }, 404);
    }

    // Add user to family_members
    const { error: memberError } = await supabase
      .from('family_members')
      .insert({
        family_id: invitation.family_id,
        user_id: userId,
        role: 'member',
      });

    if (memberError) {
      console.error('Failed to add family member:', memberError.message);
      // Check if user is already a member
      if (memberError.code === '23505') {
        return c.json({ message: 'You are already a member of this family', familyId: invitation.family_id });
      }
      return c.json({ error: 'Failed to join family' }, 500);
    }

    // Update invitation status
    await supabase
      .from('invitations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invitationId);

    return c.json({ message: 'Invitation accepted', familyId: invitation.family_id });
  } catch (error) {
    console.log(`Accept invitation error: ${error}`);
    return c.json({ error: 'Failed to accept invitation' }, 500);
  }
});

// ============= PHOTO UPLOAD ROUTES =============

// Upload photo
app.post("/make-server-b3841c63/upload-photo", async (c) => {
  try {
    const userId = getUserIdFromAuth(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: 'Unauthorized - invalid or missing access token' }, 401);
    }

    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    const supabase = getAdminClient();
    const bucketName = 'make-b3841c63-family-photos';
    const fileName = `${userId}/${Date.now()}_${file.name}`;
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file);

    if (error) {
      console.log(`Upload error: ${error.message}`);
      return c.json({ error: error.message }, 500);
    }

    // Generate signed URL (valid for 1 year)
    const { data: signedUrlData } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 31536000);

    return c.json({ photo_url: signedUrlData?.signedUrl });
  } catch (error) {
    console.log(`Photo upload error: ${error}`);
    return c.json({ error: 'Failed to upload photo' }, 500);
  }
});

// Export the app
export default app;