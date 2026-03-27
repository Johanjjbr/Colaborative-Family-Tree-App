export interface Person {
  id: string;
  first_name: string;
  last_name: string;
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  occupation?: string;
  biography?: string;
  photo_url?: string;
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
