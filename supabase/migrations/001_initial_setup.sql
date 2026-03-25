-- =====================================================
-- Árbol Genealógico - Initial Database Setup
-- =====================================================
-- This migration creates all the necessary tables for the
-- Family Tree Collaborative application
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- KV STORE TABLE
-- =====================================================
-- Simple key-value store for flexible data storage
CREATE TABLE IF NOT EXISTS kv_store_b3841c63 (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups by key prefix
CREATE INDEX IF NOT EXISTS idx_kv_store_key_prefix
  ON kv_store_b3841c63 USING btree (key text_pattern_ops);

-- Create index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_kv_store_value
  ON kv_store_b3841c63 USING gin (value);

-- =====================================================
-- FAMILIES TABLE (optional - for structured data)
-- =====================================================
-- While we use KV store, having a structured table helps with queries
CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for owner lookups
CREATE INDEX IF NOT EXISTS idx_families_owner
  ON families(owner_id);

-- =====================================================
-- FAMILY MEMBERS TABLE
-- =====================================================
-- Track which users belong to which families
CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_family_members_family
  ON family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user
  ON family_members(user_id);

-- =====================================================
-- PERSONS TABLE
-- =====================================================
-- Store individual family members (nodes in the tree)
CREATE TABLE IF NOT EXISTS persons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  birth_date DATE,
  death_date DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  photo_url TEXT,
  bio TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_persons_family
  ON persons(family_id);
CREATE INDEX IF NOT EXISTS idx_persons_name
  ON persons(first_name, last_name);

-- =====================================================
-- RELATIONSHIPS TABLE
-- =====================================================
-- Store relationships between persons
CREATE TABLE IF NOT EXISTS relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  person1_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  person2_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (
    relationship_type IN ('parent', 'child', 'spouse', 'sibling', 'partner')
  ),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT different_persons CHECK (person1_id != person2_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_relationships_family
  ON relationships(family_id);
CREATE INDEX IF NOT EXISTS idx_relationships_person1
  ON relationships(person1_id);
CREATE INDEX IF NOT EXISTS idx_relationships_person2
  ON relationships(person2_id);

-- =====================================================
-- INVITATIONS TABLE
-- =====================================================
-- Store family invitations
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invitations_family
  ON invitations(family_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email
  ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token
  ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status
  ON invitations(status);

-- =====================================================
-- ACTIVITIES TABLE
-- =====================================================
-- Track activities/history for the family tree
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL CHECK (
    activity_type IN ('added_person', 'updated_person', 'deleted_person',
                      'added_relationship', 'deleted_relationship',
                      'invited_member', 'member_joined')
  ),
  target_person_id UUID REFERENCES persons(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_activities_family
  ON activities(family_id);
CREATE INDEX IF NOT EXISTS idx_activities_user
  ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_created
  ON activities(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================
-- Enable RLS on all tables
ALTER TABLE kv_store_b3841c63 ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- KV Store policies (service role only)
CREATE POLICY "Service role can do anything on kv_store"
  ON kv_store_b3841c63
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Families policies
CREATE POLICY "Users can view families they are members of"
  ON families
  FOR SELECT
  USING (
    id IN (
      SELECT family_id FROM family_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own families"
  ON families
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Family owners can update their families"
  ON families
  FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Family owners can delete their families"
  ON families
  FOR DELETE
  USING (owner_id = auth.uid());

-- Family members policies
CREATE POLICY "Users can view members of their families"
  ON family_members
  FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Family owners can add members"
  ON family_members
  FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT id FROM families
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove themselves from families"
  ON family_members
  FOR DELETE
  USING (user_id = auth.uid());

-- Persons policies
CREATE POLICY "Users can view persons in their families"
  ON persons
  FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can add persons"
  ON persons
  FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can update persons"
  ON persons
  FOR UPDATE
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can delete persons"
  ON persons
  FOR DELETE
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = auth.uid()
    )
  );

-- Relationships policies
CREATE POLICY "Users can view relationships in their families"
  ON relationships
  FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can add relationships"
  ON relationships
  FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can delete relationships"
  ON relationships
  FOR DELETE
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = auth.uid()
    )
  );

-- Invitations policies
CREATE POLICY "Users can view invitations for their families"
  ON invitations
  FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = auth.uid()
    )
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Family members can create invitations"
  ON invitations
  FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = auth.uid()
    )
  );

-- Activities policies
CREATE POLICY "Users can view activities in their families"
  ON activities
  FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can create activities"
  ON activities
  FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_kv_store_updated_at
  BEFORE UPDATE ON kv_store_b3841c63
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_families_updated_at
  BEFORE UPDATE ON families
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_persons_updated_at
  BEFORE UPDATE ON persons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STORAGE BUCKET FOR PHOTOS
-- =====================================================
-- Note: Storage buckets are created via Supabase Dashboard or CLI
-- This is a reminder to create the bucket manually:
-- Bucket name: make-b3841c63-family-photos
-- Public: false
-- File size limit: 5MB
-- Allowed MIME types: image/*

-- =====================================================
-- INITIAL DATA (Optional)
-- =====================================================
-- Add any seed data here if needed

-- =====================================================
-- GRANTS
-- =====================================================
-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- =====================================================
-- DONE!
-- =====================================================
-- Database setup complete.
-- Next steps:
-- 1. Create storage bucket: make-b3841c63-family-photos
-- 2. Deploy Edge Functions
-- 3. Configure authentication settings
-- =====================================================
