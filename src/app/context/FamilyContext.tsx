import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Person, Relationship, Activity } from '../types/family';
import { mockPersons, mockRelationships, mockActivities, currentUserId } from '../data/mockData';
import { useAuth } from './AuthContext';
import { projectId, publicAnonKey } from '/utils/supabase/info';

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

export function FamilyProvider({ children }: { children: ReactNode }) {
  const { user, accessToken } = useAuth();
  const [persons, setPersons] = useState<Person[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [familyName, setFamilyName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && accessToken) {
      loadFamilyData();
    } else {
      setPersons(mockPersons);
      setRelationships(mockRelationships);
      setActivities(mockActivities);
      setLoading(false);
    }
  }, [user, accessToken]);

  const loadFamilyData = async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      const familyResponse = await fetch(`${API_URL}/families/my-family`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const familyData = await familyResponse.json();
      if (!familyResponse.ok) {
        if (familyResponse.status === 401) { setLoading(false); return; }
        setLoading(false); return;
      }
      if (!familyData.family) {
        setFamilyId(null); setFamilyName(null);
        setPersons([]); setRelationships([]); setActivities([]);
        setLoading(false); return;
      }
      const loadedFamilyId = familyData.family.id;
      setFamilyId(loadedFamilyId);
      setFamilyName(familyData.family.name);

      const [personsRes, relationshipsRes, activitiesRes] = await Promise.all([
        fetch(`${API_URL}/families/${loadedFamilyId}/persons`, { headers: { 'Authorization': `Bearer ${accessToken}` } }),
        fetch(`${API_URL}/families/${loadedFamilyId}/relationships`, { headers: { 'Authorization': `Bearer ${accessToken}` } }),
        fetch(`${API_URL}/families/${loadedFamilyId}/activities`, { headers: { 'Authorization': `Bearer ${accessToken}` } }),
      ]);

      const [personsData, relationshipsData, activitiesData] = await Promise.all([
        personsRes.json(), relationshipsRes.json(), activitiesRes.json()
      ]);

      setPersons(personsData.persons || []);
      setRelationships(relationshipsData.relationships || []);
      setActivities(activitiesData.activities || []);
    } catch (error) {
      console.error('Error loading family data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createFamily = async (name: string) => {
    if (!accessToken) throw new Error('Not authenticated');
    const response = await fetch(`${API_URL}/families`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify({ name }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to create family');
    await loadFamilyData();
  };

  const addPerson = async (person: Omit<Person, 'id'>, parentId?: string, spouseId?: string): Promise<Person> => {
    if (!accessToken || !familyId) {
      // Fallback local state
      const newPerson: Person = { ...person, id: Date.now().toString() };
      setPersons(prev => [...prev, newPerson]);
      if (parentId) {
        const rel: Relationship = { id: Date.now().toString(), type: 'parent', person1Id: parentId, person2Id: newPerson.id };
        setRelationships(prev => [...prev, rel]);
      }
      if (spouseId) {
        const rel: Relationship = { id: Date.now().toString(), type: 'spouse', person1Id: newPerson.id, person2Id: spouseId };
        setRelationships(prev => [...prev, rel]);
      }
      return newPerson;
    }

    const response = await fetch(`${API_URL}/families/${familyId}/persons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify(person),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to add person');

    const createdPerson: Person = data.person;

    // Update local state immediately (optimistic)
    setPersons(prev => [...prev, createdPerson]);

    // Add relationships
    if (parentId) {
      await addRelationship({ type: 'parent', person1Id: parentId, person2Id: createdPerson.id });
    }
    if (spouseId) {
      await addRelationship({ type: 'spouse', person1Id: createdPerson.id, person2Id: spouseId });
    }

    return createdPerson;
  };

  const updatePerson = async (id: string, updates: Partial<Person>) => {
    if (!accessToken || !familyId) {
      setPersons(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      return;
    }
    const response = await fetch(`${API_URL}/families/${familyId}/persons/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify(updates),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to update person');
    setPersons(prev => prev.map(p => p.id === id ? data.person : p));
  };

  const deletePerson = async (id: string) => {
    if (!accessToken || !familyId) {
      setPersons(prev => prev.filter(p => p.id !== id));
      setRelationships(prev => prev.filter(r => r.person1Id !== id && r.person2Id !== id));
      return;
    }
    const response = await fetch(`${API_URL}/families/${familyId}/persons/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to delete person');
    setPersons(prev => prev.filter(p => p.id !== id));
    setRelationships(prev => prev.filter(r => r.person1Id !== id && r.person2Id !== id));
  };

  const addRelationship = async (relationship: Omit<Relationship, 'id'>) => {
    if (!accessToken || !familyId) {
      const newRel: Relationship = { ...relationship, id: Date.now().toString() };
      setRelationships(prev => [...prev, newRel]);
      return;
    }
    const response = await fetch(`${API_URL}/families/${familyId}/relationships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify(relationship),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to add relationship');
    setRelationships(prev => [...prev, data.relationship]);
  };

  const createInvitation = async (email: string): Promise<string> => {
    if (!accessToken || !familyId) throw new Error('Not authenticated or no family');
    const response = await fetch(`${API_URL}/families/${familyId}/invitations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to create invitation');
    return data.invitationLink;
  };

  const uploadPhoto = async (file: File): Promise<string> => {
    if (!accessToken) throw new Error('Not authenticated');
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_URL}/upload-photo`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to upload photo');
    return data.photo_url;
  };

  const getPersonById = (id: string) => persons.find(p => p.id === id);

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
    <FamilyContext.Provider value={{
      persons, relationships, activities,
      currentUserId: user?.id || currentUserId,
      selectedPerson, familyId, familyName, loading,
      setSelectedPerson, getPersonById, getChildren, getParents, getSpouse,
      addPerson, updatePerson, deletePerson, addRelationship,
      createFamily, loadFamilyData, createInvitation, uploadPhoto,
    }}>
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamilyContext() {
  const context = useContext(FamilyContext);
  if (context === undefined) throw new Error('useFamilyContext must be used within a FamilyProvider');
  return context;
}