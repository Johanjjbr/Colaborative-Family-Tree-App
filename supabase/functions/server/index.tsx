import { Hono } from "jsr:@hono/hono@4";
import { cors } from "jsr:@hono/hono@4/cors";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

// Simple key-value storage using Supabase KV
// Note: In production, this would use Supabase Database tables
const kv = {
  store: new Map<string, any>(),
  
  async get(key: string) {
    return this.store.get(key);
  },
  
  async set(key: string, value: any) {
    this.store.set(key, value);
  },
  
  async del(key: string) {
    this.store.delete(key);
  },
  
  async getByPrefix(prefix: string) {
    const results: any[] = [];
    for (const [key, value] of this.store.entries()) {
      if (key.startsWith(prefix)) {
        results.push(value);
      }
    }
    return results;
  }
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
    const { email, password, firstName, lastName } = await c.req.json();
    const supabase = getAdminClient();

    // Create user with Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { firstName, lastName },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log(`Auth signup error: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ user: data.user });
  } catch (error) {
    console.log(`Signup error: ${error}`);
    return c.json({ error: 'Failed to sign up user' }, 500);
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
    const familyId = `family_${Date.now()}`;

    // Create family
    await kv.set(familyId, {
      id: familyId,
      name,
      ownerId: userId,
      createdAt: new Date().toISOString(),
      memberIds: [userId],
    });

    // Add user to family members list
    await kv.set(`family_member_${userId}`, familyId);

    return c.json({ familyId, message: 'Family tree created successfully' });
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

    // Get family ID for user
    const familyId = await kv.get(`family_member_${userId}`);
    if (!familyId) {
      return c.json({ family: null });
    }

    const family = await kv.get(familyId);
    return c.json({ family });
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
    
    // Get all persons with this familyId prefix
    const persons = await kv.getByPrefix(`person_${familyId}_`);
    
    return c.json({ persons: persons || [] });
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
    
    const personId = `person_${familyId}_${Date.now()}`;
    const person = {
      ...personData,
      id: personId,
      familyId,
      createdAt: new Date().toISOString(),
    };

    await kv.set(personId, person);

    // Add activity
    const activityId = `activity_${familyId}_${Date.now()}`;
    await kv.set(activityId, {
      id: activityId,
      type: 'added_person',
      userId: userId,
      userName: personData.firstName || userId,
      targetPersonName: `${person.firstName} ${person.lastName}`,
      timestamp: new Date().toISOString(),
    });

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
    
    const existingPerson = await kv.get(personId);
    if (!existingPerson) {
      return c.json({ error: 'Person not found' }, 404);
    }

    const updatedPerson = { ...existingPerson, ...updates };
    await kv.set(personId, updatedPerson);

    return c.json({ person: updatedPerson });
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
    await kv.del(personId);

    // Also delete relationships involving this person
    const familyId = c.req.param('familyId');
    const relationships = await kv.getByPrefix(`relationship_${familyId}_`);
    
    for (const rel of relationships || []) {
      if (rel.person1Id === personId || rel.person2Id === personId) {
        await kv.del(rel.id);
      }
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
    const relationships = await kv.getByPrefix(`relationship_${familyId}_`);
    
    return c.json({ relationships: relationships || [] });
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
    
    const relationshipId = `relationship_${familyId}_${Date.now()}`;
    const relationship = {
      ...relationshipData,
      id: relationshipId,
      familyId,
    };

    await kv.set(relationshipId, relationship);

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
    const activities = await kv.getByPrefix(`activity_${familyId}_`);
    
    // Sort by timestamp descending
    const sortedActivities = (activities || []).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    return c.json({ activities: sortedActivities.slice(0, 10) }); // Return last 10
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

    // Generate invitation link
    const invitationLink = `${c.req.header('origin')}/invitation/${invitationId}`;

    return c.json({ invitation, invitationLink });
  } catch (error) {
    console.log(`Create invitation error: ${error}`);
    return c.json({ error: 'Failed to create invitation' }, 500);
  }
});

// Get invitation by ID (public)
app.get("/make-server-b3841c63/invitations/:invitationId", async (c) => {
  try {
    const invitationId = c.req.param('invitationId');
    const invitation = await kv.get(invitationId);
    
    if (!invitation) {
      return c.json({ error: 'Invitation not found' }, 404);
    }

    const family = await kv.get(invitation.familyId);
    
    return c.json({ invitation, familyName: family?.name });
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
    const invitation = await kv.get(invitationId);
    
    if (!invitation) {
      return c.json({ error: 'Invitation not found' }, 404);
    }

    // Add user to family
    const family = await kv.get(invitation.familyId);
    if (family) {
      family.memberIds = [...(family.memberIds || []), userId];
      await kv.set(invitation.familyId, family);
    }

    // Update user's family
    await kv.set(`family_member_${userId}`, invitation.familyId);

    // Update invitation status
    invitation.status = 'accepted';
    await kv.set(invitationId, invitation);

    return c.json({ message: 'Invitation accepted', familyId: invitation.familyId });
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

    return c.json({ photoUrl: signedUrlData?.signedUrl });
  } catch (error) {
    console.log(`Photo upload error: ${error}`);
    return c.json({ error: 'Failed to upload photo' }, 500);
  }
});

// Export the app
export default app;