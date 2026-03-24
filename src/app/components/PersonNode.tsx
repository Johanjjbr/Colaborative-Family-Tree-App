import React from 'react';
import { Person } from '../types/family';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { User } from 'lucide-react';

interface PersonNodeProps {
  person: Person;
  onClick: () => void;
  isSelected?: boolean;
}

export function PersonNode({ person, onClick, isSelected }: PersonNodeProps) {
  const birthYear = person.birthDate ? new Date(person.birthDate).getFullYear() : '?';
  const deathYear = person.deathDate ? new Date(person.deathDate).getFullYear() : null;
  const initials = person.firstName && person.lastName 
    ? `${person.firstName[0]}${person.lastName[0]}`.toUpperCase()
    : 'NA';

  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-xl shadow-md hover:shadow-xl transition-all cursor-pointer
        border-2 p-4 w-[160px] flex flex-col items-center gap-2
        ${isSelected ? 'border-[#3D6F42] ring-2 ring-[#3D6F42]/20' : 'border-gray-200 hover:border-[#3D6F42]/50'}
      `}
    >
      <Avatar className="w-16 h-16 ring-2 ring-gray-100">
        <AvatarImage src={person.photoUrl} alt={`${person.firstName} ${person.lastName}`} />
        <AvatarFallback className="bg-[#3D6F42] text-white text-lg">
          {initials}
        </AvatarFallback>
      </Avatar>
      
      <div className="text-center w-full">
        <h4 className="font-medium text-sm text-gray-900 truncate">
          {person.firstName}
        </h4>
        <p className="text-xs text-gray-600 truncate">
          {person.lastName}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {birthYear}{deathYear ? ` - ${deathYear}` : ''}
        </p>
      </div>

      {person.deathDate && (
        <div className="w-full h-px bg-gray-300" />
      )}
    </div>
  );
}