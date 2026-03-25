-- =====================================================
-- QUICK FIX: Simplified RLS Policies (No Recursion)
-- =====================================================
-- Run this script to replace the problematic RLS policies
-- Copy and paste this entire script into the SQL Editor in Supabase
-- =====================================================

-- Step 1: Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view families they are members of" ON families;
DROP POLICY IF EXISTS "Users can create their own families" ON families;
DROP POLICY IF EXISTS "Family owners can update their families" ON families;
DROP POLICY IF EXISTS "Family owners can delete their families" ON families;

DROP POLICY IF EXISTS "Users can view members of their families" ON family_members;
DROP POLICY IF EXISTS "Family owners can add members" ON family_members;
DROP POLICY IF EXISTS "Users can remove themselves from families" ON family_members;

DROP POLICY IF EXISTS "Users can view persons in their families" ON persons;
DROP POLICY IF EXISTS "Family members can add persons" ON persons;
DROP POLICY IF EXISTS "Family members can update persons" ON persons;
DROP POLICY IF EXISTS "Family members can delete persons" ON persons;

DROP POLICY IF EXISTS "Users can view relationships in their families" ON relationships;
DROP POLICY IF EXISTS "Family members can add relationships" ON relationships;
DROP POLICY IF EXISTS "Family members can delete relationships" ON relationships;

DROP POLICY IF EXISTS "Users can view invitations for their families" ON invitations;
DROP POLICY IF EXISTS "Family members can create invitations" ON invitations;

DROP POLICY IF EXISTS "Users can view activities in their families" ON activities;
DROP POLICY IF EXISTS "Family members can create activities" ON activities;

-- =====================================================
-- Step 2: Create SIMPLIFIED policies (NO RECURSION)
-- =====================================================

-- FAMILIES: Simple policies
CREATE POLICY "Users can view their own families"
  ON families FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can create families"
  ON families FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their families"
  ON families FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their families"
  ON families FOR DELETE
  USING (owner_id = auth.uid());

-- FAMILY_MEMBERS: Critical - NO recursion!
CREATE POLICY "Users can view family members"
  ON family_members FOR SELECT
  USING (
    -- Can view if user is the owner of the family
    family_id IN (
      SELECT id FROM families WHERE owner_id = auth.uid()
    )
    OR
    -- Can view own membership record
    user_id = auth.uid()
  );

CREATE POLICY "Users can add family members"
  ON family_members FOR INSERT
  WITH CHECK (
    -- Can add if user is the owner
    family_id IN (
      SELECT id FROM families WHERE owner_id = auth.uid()
    )
    OR
    -- Can add self (for accepting invitations)
    user_id = auth.uid()
  );

CREATE POLICY "Users can remove themselves"
  ON family_members FOR DELETE
  USING (user_id = auth.uid());

-- PERSONS: Check ownership via families table
CREATE POLICY "Users can view persons"
  ON persons FOR SELECT
  USING (
    family_id IN (
      SELECT id FROM families WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can add persons"
  ON persons FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT id FROM families WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update persons"
  ON persons FOR UPDATE
  USING (
    family_id IN (
      SELECT id FROM families WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete persons"
  ON persons FOR DELETE
  USING (
    family_id IN (
      SELECT id FROM families WHERE owner_id = auth.uid()
    )
  );

-- RELATIONSHIPS: Check ownership via families table
CREATE POLICY "Users can view relationships"
  ON relationships FOR SELECT
  USING (
    family_id IN (
      SELECT id FROM families WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can add relationships"
  ON relationships FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT id FROM families WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete relationships"
  ON relationships FOR DELETE
  USING (
    family_id IN (
      SELECT id FROM families WHERE owner_id = auth.uid()
    )
  );

-- INVITATIONS: Check ownership via families table
CREATE POLICY "Users can view invitations"
  ON invitations FOR SELECT
  USING (
    family_id IN (
      SELECT id FROM families WHERE owner_id = auth.uid()
    )
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Users can create invitations"
  ON invitations FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT id FROM families WHERE owner_id = auth.uid()
    )
  );

-- ACTIVITIES: Check ownership via families table
CREATE POLICY "Users can view activities"
  ON activities FOR SELECT
  USING (
    family_id IN (
      SELECT id FROM families WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create activities"
  ON activities FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT id FROM families WHERE owner_id = auth.uid()
    )
  );

-- =====================================================
-- DONE!
-- =====================================================
-- Policies fixed! No more infinite recursion.
-- The trade-off: Only family owners can perform most operations.
-- For collaborative features, you'll need to expand these later.
-- =====================================================
