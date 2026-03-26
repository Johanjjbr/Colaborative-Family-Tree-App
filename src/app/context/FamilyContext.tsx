import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { Person, Relationship, Activity } from '../types/family';
import { mockPersons, mockRelationships, mockActivities, currentUserId } from '../data/mockData';
import { useAuth } from './AuthContext';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from 'sonner';

interface FamilyContextType {
  persons: Person[];
  relationships: Relationship[];
  activities: Activity[];
  currentUserId: string;
  selectedPerson: Person | null;
  familyId: string | null;
  familyName: string | null;
  loading: boolean;
  realtimeConnected: boolean;
  setSelectedPerson: (person: Person | null) => void;
  getPersonById: (id: string) => Person | undefined;
  getChildren: (personId: string) => Person[];
  getParents: (personId: string) => Person[];
  getSpouse: (personId: string) => Person | undefined;
  addPerson: (person: Omit<Person, 'id'>, parentId?: string, spouseId?: string) => Promise<Person>;
  updatePerson: (id: string, updates: Partial<Person>) => Promise<void>;
  deletePerson: (id: string) => Promise<void>;
  addRelationship: (relationship: Omit<Relationship, 'id'>) => Promise<void>;
  createFamily: (name: string) => Promise<void>;
  loadFamilyData: () => Promise<void>;
  createInvitation: (email: string) => Promise<string>;
  uploadPhoto: (file: File) => Promise<string>;
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-b3841c63`;

// Supabase client for realtime
const supabase = createClient(`https://${projectId}.supabase.co`, publicAnonKey);

export function FamilyProvider({ children }: { children: ReactNode }) {
  const { user, accessToken } = useAuth();
  const [persons, setPersons]           = useState<Person[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [activities, setActivities]     = useState<Activity[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [familyId, setFamilyId]         = useState<string | null>(null);
  const [familyName, setFamilyName]     = useState<string | null>(null);
  const [loading, setLoading]           = useState(true);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // ── Auth listener ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (user && accessToken) {
      loadFamilyData();
    } else {
      setPersons(mockPersons);
      setRelationships(mockRelationships);
      setActivities(mockActivities);
      setLoading(false);
    }
    // Cleanup realtime on logout
    return () => { channelRef.current?.unsubscribe(); };
  }, [user, accessToken]);

  // ── Realtime subscription ───────────────────────────────────────────────────
  const setupRealtime = (fId: string) => {
    // Unsubscribe from previous channel
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    const channel = supabase
      .channel(`family-${fId}`)
      // Listen for KV store changes (the server updates kv_store_b3841c63)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kv_store_b3841c63' },
        (payload) => {
          const key = (payload.new as any)?.key ?? (payload.old as any)?.key ?? '';

          if (key.startsWith(`person_${fId}_`)) {
            handlePersonChange(payload);
          } else if (key.startsWith(`relationship_${fId}_`)) {
            handleRelationshipChange(payload);
          } else if (key.startsWith(`activity_${fId}_`)) {
            handleActivityChange(payload);
          }
        }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;
  };

  const handlePersonChange = (payload: any) => {
    const { eventType, new: newRow, old: oldRow } = payload;
    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      const person = rowToPerson(newRow.value);
      if (!person) return;
      setPersons(prev => {
        const idx = prev.findIndex(p => p.id === person.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = person;
          return next;
        }
        toast(`📢 ${person.firstName} ${person.lastName} fue añadido al árbol`);
        return [...prev, person];
      });
    } else if (eventType === 'DELETE') {
      const deletedId = oldRow?.value?.id;
      if (deletedId) setPersons(prev => prev.filter(p => p.id !== deletedId));
    }
  };

  const handleRelationshipChange = (payload: any) => {
    const { eventType, new: newRow, old: oldRow } = payload;
    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      const rel = rowToRelationship(newRow.value);
      if (!rel) return;
      setRelationships(prev => {
        if (prev.some(r => r.id === rel.id)) return prev;
        return [...prev, rel];
      });
    } else if (eventType === 'DELETE') {
      const deletedId = oldRow?.value?.id;
      if (deletedId) setRelationships(prev => prev.filter(r => r.id !== deletedId));
    }
  };

  const handleActivityChange = (payload: any) => {
    if (payload.eventType !== 'INSERT') return;
    const act = rowToActivity(payload.new.value);
    if (!act) return;
    setActivities(prev => [act, ...prev].slice(0, 20));
  };

  // ── Mappers ─────────────────────────────────────────────────────────────────
  const rowToPerson = (v: any): Person | null => {
    if (!v?.id) return null;
    return {
      id: v.id,
      firstName: v.firstName ?? '',
      lastName: v.lastName ?? '',
      birthDate: v.birthDate,
      birthPlace: v.birthPlace,
      deathDate: v.deathDate,
      occupation: v.occupation,
      biography: v.biography,
      photoUrl: v.photoUrl,
      gender: v.gender ?? 'other',
    };
  };

  const rowToRelationship = (v: any): Relationship | null => {
    if (!v?.id) return null;
    return { id: v.id, type: v.type, person1Id: v.person1Id, person2Id: v.person2Id };
  };

  const rowToActivity = (v: any): Activity | null => {
    if (!v?.id) return null;
    return {
      id: v.id,
      type: v.type,
      userId: v.userId,
      userName: v.userName ?? '',
      targetPersonName: v.targetPersonName ?? '',
      timestamp: v.timestamp,
    };
  };

  // ── Load family data ─────────────────────────────────────────────────────────
  const loadFamilyData = async () => {
    if (!accessToken) return;
    try {
      setLoading(true);

      const familyResponse = await fetch(`${API_URL}/families/my-family`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!familyResponse.ok) {
        setLoading(false);
        return;
      }

      const familyData = await familyResponse.json();
      if (!familyData.family) {
        setFamilyId(null);
        setFamilyName(null);
        setPersons([]);
        setRelationships([]);
        setActivities([]);
        setLoading(false);
        return;
      }

      const loadedFamilyId = familyData.family.id;
      setFamilyId(loadedFamilyId);
      setFamilyName(familyData.family.name);

      const [personsRes, relationshipsRes, activitiesRes] = await Promise.all([
        fetch(`${API_URL}/families/${loadedFamilyId}/persons`,       { headers: { Authorization: `Bearer ${accessToken}` } }),
        fetch(`${API_URL}/families/${loadedFamilyId}/relationships`,  { headers: { Authorization: `Bearer ${accessToken}` } }),
        fetch(`${API_URL}/families/${loadedFamilyId}/activities`,     { headers: { Authorization: `Bearer ${accessToken}` } }),
      ]);

      const [personsData, relationshipsData, activitiesData] = await Promise.all([
        personsRes.json(),
        relationshipsRes.json(),
        activitiesRes.json(),
      ]);

      setPersons(personsData.persons ?? []);
      setRelationships(relationshipsData.relationships ?? []);
      setActivities(activitiesData.activities ?? []);

      // Setup realtime after data is loaded
      setupRealtime(loadedFamilyId);
    } catch (error) {
      console.error('Error loading family data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ── Create family ────────────────────────────────────────────────────────────
  const createFamily = async (name: string) => {
    if (!accessToken) throw new Error('Not authenticated');
    const response = await fetch(`${API_URL}/families`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ name }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'Failed to create family');
    await loadFamilyData();
  };

  // ── Add person (FIXED: handles parent relation correctly) ────────────────────
  const addPerson = async (
    person: Omit<Person, 'id'>,
    parentId?: string,
    spouseId?: string
  ): Promise<Person> => {
    // Offline / no-family fallback
    if (!accessToken || !familyId) {
      const newPerson: Person = { ...person, id: Date.now().toString() };
      setPersons(prev => [...prev, newPerson]);
      if (parentId) {
        const rel: Relationship = { id: `rel_${Date.now()}`,     type: 'parent', person1Id: parentId,  person2Id: newPerson.id };
        setRelationships(prev => [...prev, rel]);
      }
      if (spouseId) {
        const rel: Relationship = { id: `rel_${Date.now() + 1}`, type: 'spouse', person1Id: newPerson.id, person2Id: spouseId };
        setRelationships(prev => [...prev, rel]);
      }
      return newPerson;
    }

    // 1. Create the person on the server
    const response = await fetch(`${API_URL}/families/${familyId}/persons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(person),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'Failed to add person');

    const newPerson: Person = data.person;

    // Optimistically update local state so the node appears immediately
    setPersons(prev => [...prev, newPerson]);

    // 2. Create relationships sequentially and add them to local state
    if (parentId) {
      await addRelationship({ type: 'parent', person1Id: parentId, person2Id: newPerson.id });
    }
    if (spouseId) {
      await addRelationship({ type: 'spouse', person1Id: newPerson.id, person2Id: spouseId });
    }

    return newPerson;
  };

  // ── Update person ────────────────────────────────────────────────────────────
  const updatePerson = async (id: string, updates: Partial<Person>) => {
    if (!accessToken || !familyId) {
      setPersons(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)));
      return;
    }
    const response = await fetch(`${API_URL}/families/${familyId}/persons/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(updates),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'Failed to update person');
    setPersons(prev => prev.map(p => (p.id === id ? data.person : p)));
  };

  // ── Delete person ────────────────────────────────────────────────────────────
  const deletePerson = async (id: string) => {
    if (!accessToken || !familyId) {
      setPersons(prev => prev.filter(p => p.id !== id));
      setRelationships(prev => prev.filter(r => r.person1Id !== id && r.person2Id !== id));
      return;
    }
    // Optimistic update
    setPersons(prev => prev.filter(p => p.id !== id));
    setRelationships(prev => prev.filter(r => r.person1Id !== id && r.person2Id !== id));

    const response = await fetch(`${API_URL}/families/${familyId}/persons/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      // Revert on failure
      await loadFamilyData();
      throw new Error('Failed to delete person');
    }
  };

  // ── Add relationship ─────────────────────────────────────────────────────────
  const addRelationship = async (relationship: Omit<Relationship, 'id'>) => {
    if (!accessToken || !familyId) {
      const newRel: Relationship = { ...relationship, id: `rel_${Date.now()}` };
      setRelationships(prev => [...prev, newRel]);
      return;
    }
    const response = await fetch(`${API_URL}/families/${familyId}/relationships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(relationship),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'Failed to add relationship');
    // Optimistically update (realtime will also fire, dedup is handled)
    setRelationships(prev => {
      if (prev.some(r => r.id === data.relationship.id)) return prev;
      return [...prev, data.relationship];
    });
  };

  // ── Create invitation ────────────────────────────────────────────────────────
  const createInvitation = async (email: string): Promise<string> => {
    if (!accessToken || !familyId) throw new Error('Not authenticated or no family');
    const response = await fetch(`${API_URL}/families/${familyId}/invitations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'Failed to create invitation');
    return data.invitationLink;
  };

  // ── Upload photo ─────────────────────────────────────────────────────────────
  const uploadPhoto = async (file: File): Promise<string> => {
    if (!accessToken) throw new Error('Not authenticated');
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_URL}/upload-photo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'Failed to upload photo');
    return data.photoUrl;
  };

  // ── Graph helpers ────────────────────────────────────────────────────────────
  const getPersonById = (id: string) => persons.find(p => p.id === id);

  const getChildren = (personId: string) => {
    const childIds = relationships.filter(r => r.type === 'parent' && r.person1Id === personId).map(r => r.person2Id);
    return persons.filter(p => childIds.includes(p.id));
  };

  const getParents = (personId: string) => {
    const parentIds = relationships.filter(r => r.type === 'parent' && r.person2Id === personId).map(r => r.person1Id);
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
        persons, relationships, activities,
        currentUserId: user?.id ?? currentUserId,
        selectedPerson, familyId, familyName, loading, realtimeConnected,
        setSelectedPerson,
        getPersonById, getChildren, getParents, getSpouse,
        addPerson, updatePerson, deletePerson, addRelationship,
        createFamily, loadFamilyData, createInvitation, uploadPhoto,
      }}
    >
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamilyContext() {
  const context = useContext(FamilyContext);
  if (context === undefined) throw new Error('useFamilyContext must be used within a FamilyProvider');
  return context;
}