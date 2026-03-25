import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Person, Relationship, Activity } from '../types/family';
import { mockPersons, mockRelationships, mockActivities, currentUserId } from '../data/mockData';
import { useAuth } from './AuthContext';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { createClient } from '@supabase/supabase-js';

interface FamilyContextType {
  persons: Person[];
  relationships: Relationship[];
  activities: Activity[];
  currentUserId: string;
  selectedPerson: Person | null;
  familyId: string | null;
  familyName: string | null;
  loading: boolean;
  setSelectedPerson: (person: Person | null) => void;
  getPersonById: (id: string) => Person | undefined;
  getChildren: (personId: string) => Person[];
  getParents: (personId: string) => Person[];
  getSpouse: (personId: string) => Person | undefined;
  addPerson: (person: Omit<Person, 'id'>, parentId?: string, spouseId?: string) => Promise<void>;
  updatePerson: (id: string, updates: Partial<Person>) => Promise<void>;
  deletePerson: (id: string) => Promise<void>;
  addRelationship: (relationship: Omit<Relationship, 'id'>) => Promise<void>;
  createFamily: (name: string) => Promise<void>;
  loadFamilyData: () => Promise<void>;
  createInvitation: (email: string) => Promise<string>;
  uploadPhoto: (file: File) => Promise<string>;
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-b3841c63`;

export function FamilyProvider({ children }: { children: ReactNode }) {
  const { user, accessToken } = useAuth();
  const [persons, setPersons] = useState<Person[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [familyName, setFamilyName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [useDirectDB, setUseDirectDB] = useState(false); // Fallback to direct DB access

  // Load family data when user logs in
  useEffect(() => {
    if (user && accessToken) {
      loadFamilyData();
    } else {
      // Use mock data when not logged in (for demo purposes)
      setPersons(mockPersons);
      setRelationships(mockRelationships);
      setActivities(mockActivities);
      setLoading(false);
    }
  }, [user, accessToken]);

  const loadFamilyData = async () => {
    if (!accessToken || !user) {
      console.log('No access token, skipping family load');
      return;
    }
    
    try {
      setLoading(true);
      
      console.log('Loading family data...');
      
      // Try Edge Function first
      let familyDataLoaded = false;
      try {
        const familyResponse = await fetch(`${API_URL}/families/my-family`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (familyResponse.ok) {
          const familyData = await familyResponse.json();
          
          if (!familyData.family) {
            console.log('No family found for user - user needs to create one');
            setFamilyId(null);
            setFamilyName(null);
            setPersons([]);
            setRelationships([]);
            setActivities([]);
            setLoading(false);
            return;
          }

          console.log('✓ Family loaded via Edge Function:', familyData.family.name);

          const loadedFamilyId = familyData.family.id;
          setFamilyId(loadedFamilyId);
          setFamilyName(familyData.family.name);

          // Load persons
          const personsResponse = await fetch(`${API_URL}/families/${loadedFamilyId}/persons`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });
          const personsData = await personsResponse.json();
          setPersons(personsData.persons || []);

          // Load relationships
          const relationshipsResponse = await fetch(`${API_URL}/families/${loadedFamilyId}/relationships`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });
          const relationshipsData = await relationshipsResponse.json();
          setRelationships(relationshipsData.relationships || []);

          // Load activities
          const activitiesResponse = await fetch(`${API_URL}/families/${loadedFamilyId}/activities`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });
          const activitiesData = await activitiesResponse.json();
          setActivities(activitiesData.activities || []);

          familyDataLoaded = true;
        }
      } catch (edgeFunctionError) {
        console.warn('Edge Function not available, using direct DB access:', edgeFunctionError);
      }

      // If Edge Function didn't work, use direct DB access
      if (!familyDataLoaded) {
        console.log('Loading family data via direct DB access...');
        
        // 1. Get family where user is a member
        const { data: memberData, error: memberError } = await supabase
          .from('family_members')
          .select('family_id, families(id, name, owner_id)')
          .eq('user_id', user.id)
          .single();

        if (memberError) {
          if (memberError.code === 'PGRST116') {
            // No rows returned - user has no family yet
            console.log('No family found for user via direct DB - user needs to create one');
            setFamilyId(null);
            setFamilyName(null);
            setPersons([]);
            setRelationships([]);
            setActivities([]);
            setLoading(false);
            return;
          }
          console.error('Error loading family members:', memberError);
          setLoading(false);
          return;
        }

        if (!memberData || !memberData.families) {
          console.log('No family found');
          setFamilyId(null);
          setFamilyName(null);
          setPersons([]);
          setRelationships([]);
          setActivities([]);
          setLoading(false);
          return;
        }

        const family = Array.isArray(memberData.families) ? memberData.families[0] : memberData.families;
        const loadedFamilyId = family.id;
        
        console.log('✓ Family loaded via direct DB:', family.name);
        setFamilyId(loadedFamilyId);
        setFamilyName(family.name);

        // 2. Load persons
        const { data: personsData, error: personsError } = await supabase
          .from('persons')
          .select('*')
          .eq('family_id', loadedFamilyId);

        if (personsError) {
          console.error('Error loading persons:', personsError);
        } else {
          setPersons(personsData || []);
          console.log('✓ Loaded persons via direct DB:', personsData?.length || 0);
        }

        // 3. Load relationships
        const { data: relationshipsData, error: relationshipsError } = await supabase
          .from('relationships')
          .select('*')
          .eq('family_id', loadedFamilyId);

        if (relationshipsError) {
          console.error('Error loading relationships:', relationshipsError);
        } else {
          setRelationships(relationshipsData || []);
          console.log('✓ Loaded relationships via direct DB:', relationshipsData?.length || 0);
        }

        // 4. Load activities
        const { data: activitiesData, error: activitiesError } = await supabase
          .from('activities')
          .select('*')
          .eq('family_id', loadedFamilyId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (activitiesError) {
          console.error('Error loading activities:', activitiesError);
        } else {
          setActivities(activitiesData || []);
          console.log('✓ Loaded activities via direct DB:', activitiesData?.length || 0);
        }
      }

    } catch (error) {
      console.error('Error loading family data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createFamily = async (name: string) => {
    if (!accessToken || !user) {
      console.error('No access token available');
      throw new Error('Not authenticated');
    }

    try {
      console.log('Creating family:', name);
      console.log('Access token available:', !!accessToken);
      
      // Try Edge Function first
      try {
        const response = await fetch(`${API_URL}/families`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ name }),
        });

        const data = await response.json();
        console.log('Create family response:', response.status, data);
        
        if (response.ok) {
          console.log('Family created successfully via Edge Function, reloading data...');
          await loadFamilyData();
          return;
        }
        
        // If Edge Function fails, fall back to direct DB
        console.warn('Edge Function failed, falling back to direct DB access');
      } catch (edgeFunctionError) {
        console.warn('Edge Function not available, using direct DB access:', edgeFunctionError);
      }

      // Fallback: Direct Supabase access
      console.log('Creating family via direct DB access...');
      
      // 1. Create family record
      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .insert({
          name: name,
          owner_id: user.id
        })
        .select()
        .single();

      if (familyError) {
        console.error('Failed to create family in DB:', familyError);
        throw new Error(familyError.message || 'Failed to create family');
      }

      console.log('Family created in DB:', familyData);

      // 2. Add owner as family member
      const { error: memberError } = await supabase
        .from('family_members')
        .insert({
          family_id: familyData.id,
          user_id: user.id,
          role: 'owner'
        });

      if (memberError) {
        console.error('Failed to add family member:', memberError);
        // Continue anyway, family is created
      }

      // 3. Create activity record
      const { error: activityError } = await supabase
        .from('activities')
        .insert({
          family_id: familyData.id,
          user_id: user.id,
          activity_type: 'added_person',
          metadata: { action: 'created_family', family_name: name }
        });

      if (activityError) {
        console.error('Failed to create activity:', activityError);
        // Continue anyway
      }

      console.log('Family created successfully via direct DB, reloading data...');
      // Reload family data
      await loadFamilyData();
    } catch (error) {
      console.error('Create family error:', error);
      throw error;
    }
  };

  const addPerson = async (person: Omit<Person, 'id'>, parentId?: string, spouseId?: string) => {
    if (!accessToken || !familyId) {
      // Fallback to local state for demo
      const newPerson: Person = { ...person, id: Date.now().toString() };
      setPersons([...persons, newPerson]);
      if (parentId) {
        await addRelationship({ type: 'parent', person1Id: parentId, person2Id: newPerson.id });
      }
      if (spouseId) {
        await addRelationship({ type: 'spouse', person1Id: newPerson.id, person2Id: spouseId });
      }
      return;
    }

    try {
      const response = await fetch(`${API_URL}/families/${familyId}/persons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(person),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add person');
      }

      // Add relationships
      if (parentId) {
        await addRelationship({ type: 'parent', person1Id: parentId, person2Id: data.person.id });
      }
      if (spouseId) {
        await addRelationship({ type: 'spouse', person1Id: data.person.id, person2Id: spouseId });
      }

      // Reload data
      await loadFamilyData();
    } catch (error) {
      console.error('Add person error:', error);
      throw error;
    }
  };

  const updatePerson = async (id: string, updates: Partial<Person>) => {
    if (!accessToken || !familyId) {
      // Fallback to local state
      setPersons(persons.map(p => p.id === id ? { ...p, ...updates } : p));
      return;
    }

    try {
      const response = await fetch(`${API_URL}/families/${familyId}/persons/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update person');
      }

      // Update local state
      setPersons(persons.map(p => p.id === id ? data.person : p));
    } catch (error) {
      console.error('Update person error:', error);
      throw error;
    }
  };

  const deletePerson = async (id: string) => {
    if (!accessToken || !familyId) {
      // Fallback to local state
      setPersons(persons.filter(p => p.id !== id));
      setRelationships(relationships.filter(r => r.person1Id !== id && r.person2Id !== id));
      return;
    }

    try {
      const response = await fetch(`${API_URL}/families/${familyId}/persons/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete person');
      }

      // Reload data
      await loadFamilyData();
    } catch (error) {
      console.error('Delete person error:', error);
      throw error;
    }
  };

  const addRelationship = async (relationship: Omit<Relationship, 'id'>) => {
    if (!accessToken || !familyId) {
      // Fallback to local state
      const newRelationship: Relationship = { ...relationship, id: Date.now().toString() };
      setRelationships([...relationships, newRelationship]);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/families/${familyId}/relationships`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(relationship),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add relationship');
      }

      // Update local state
      setRelationships([...relationships, data.relationship]);
    } catch (error) {
      console.error('Add relationship error:', error);
      throw error;
    }
  };

  const createInvitation = async (email: string): Promise<string> => {
    if (!accessToken || !familyId) throw new Error('Not authenticated or no family');

    try {
      const response = await fetch(`${API_URL}/families/${familyId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create invitation');
      }

      return data.invitationLink;
    } catch (error) {
      console.error('Create invitation error:', error);
      throw error;
    }
  };

  const uploadPhoto = async (file: File): Promise<string> => {
    if (!accessToken) throw new Error('Not authenticated');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/upload-photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload photo');
      }

      return data.photoUrl;
    } catch (error) {
      console.error('Upload photo error:', error);
      throw error;
    }
  };

  const getPersonById = (id: string) => {
    return persons.find(p => p.id === id);
  };

  const getChildren = (personId: string) => {
    const childIds = relationships
      .filter(r => r.type === 'parent' && r.person1Id === personId)
      .map(r => r.person2Id);
    return persons.filter(p => childIds.includes(p.id));
  };

  const getParents = (personId: string) => {
    const parentIds = relationships
      .filter(r => r.type === 'parent' && r.person2Id === personId)
      .map(r => r.person1Id);
    return persons.filter(p => parentIds.includes(p.id));
  };

  const getSpouse = (personId: string) => {
    const spouseRel = relationships.find(
      r => r.type === 'spouse' && (r.person1Id === personId || r.person2Id === personId)
    );
    if (!spouseRel) return undefined;
    const spouseId = spouseRel.person1Id === personId ? spouseRel.person2Id : spouseRel.person1Id;
    return persons.find(p => p.id === spouseId);
  };

  return (
    <FamilyContext.Provider
      value={{
        persons,
        relationships,
        activities,
        currentUserId: user?.id || currentUserId,
        selectedPerson,
        familyId,
        familyName,
        loading,
        setSelectedPerson,
        getPersonById,
        getChildren,
        getParents,
        getSpouse,
        addPerson,
        updatePerson,
        deletePerson,
        addRelationship,
        createFamily,
        loadFamilyData,
        createInvitation,
        uploadPhoto,
      }}
    >
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamilyContext() {
  const context = useContext(FamilyContext);
  if (context === undefined) {
    throw new Error('useFamilyContext must be used within a FamilyProvider');
  }
  return context;
}