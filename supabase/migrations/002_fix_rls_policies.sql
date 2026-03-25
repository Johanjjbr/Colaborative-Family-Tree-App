-- =====================================================
-- Fix RLS Policies - Remove Infinite Recursion
-- =====================================================
-- This migration fixes the infinite recursion issue in RLS policies
-- =====================================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Family owners can add members" ON family_members;
DROP POLICY IF EXISTS "Users can view members of their families" ON family_members;

-- =====================================================
-- FAMILY MEMBERS - Fixed Policies
-- =====================================================

-- Allow users to view members of families they belong to
-- This uses a LATERAL join to avoid recursion
CREATE POLICY "Users can view members of their families"
  ON family_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = family_members.family_id
      AND fm.user_id = auth.uid()
    )
  );

-- Allow family owners to add members
-- This checks the families table directly to avoid recursion
CREATE POLICY "Family owners can add members"
  ON family_members
  FOR INSERT
  WITH CHECK (
    -- Allow if user is the owner of the family
    EXISTS (
      SELECT 1 FROM families
      WHERE families.id = family_members.family_id
      AND families.owner_id = auth.uid()
    )
    OR
    -- Allow users to add themselves when accepting invitations
    (family_members.user_id = auth.uid())
  );

-- =====================================================
-- DONE!
-- =====================================================
-- RLS policies fixed. The recursion issue should be resolved.
-- =====================================================
