export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  occupation?: string;
  biography?: string;
  photoUrl?: string;
  gender: 'male' | 'female' | 'other';
}

export interface Relationship {
  id: string;
  type: 'parent' | 'spouse';
  person1Id: string;
  person2Id: string;
}

export interface Activity {
  id: string;
  type: 'added_person' | 'updated_person' | 'added_relationship';
  userId: string;
  userName: string;
  targetPersonName: string;
  timestamp: string;
}

export interface TreeNode {
  person: Person;
  x: number;
  y: number;
  level: number;
}
