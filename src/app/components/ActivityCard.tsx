import React from 'react';
import { Activity } from '../types/family';
import { UserPlus, UserCheck, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale/es';

interface ActivityCardProps {
  activity: Activity;
}

export function ActivityCard({ activity }: ActivityCardProps) {
  const getIcon = () => {
    switch (activity.type) {
      case 'added_person':
        return <UserPlus className="w-5 h-5 text-[#3D6F42]" />;
      case 'updated_person':
        return <UserCheck className="w-5 h-5 text-blue-600" />;
      case 'added_relationship':
        return <Users className="w-5 h-5 text-purple-600" />;
    }
  };

  const getDescription = () => {
    switch (activity.type) {
      case 'added_person':
        return `añadió a ${activity.targetPersonName}`;
      case 'updated_person':
        return `actualizó el perfil de ${activity.targetPersonName}`;
      case 'added_relationship':
        return `añadió la relación de ${activity.targetPersonName}`;
    }
  };

  const timeAgo = formatDistanceToNow(new Date(activity.timestamp), {
    addSuffix: true,
    locale: es
  });

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="mt-0.5">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">
          <span className="font-medium">{activity.userName}</span>{' '}
          <span className="text-gray-600">{getDescription()}</span>
        </p>
        <p className="text-xs text-gray-500 mt-1">{timeAgo}</p>
      </div>
    </div>
  );
}