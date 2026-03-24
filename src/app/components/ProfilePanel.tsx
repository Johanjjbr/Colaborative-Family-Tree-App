import React, { useState } from 'react';
import { Person } from '../types/family';
import { useFamilyContext } from '../context/FamilyContext';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import {
  X,
  Calendar,
  MapPin,
  Briefcase,
  Users,
  Edit,
  Trash2,
  UserPlus,
  Heart,
  Baby,
  Image as ImageIcon
} from 'lucide-react';
import { PersonFormDialog } from './PersonFormDialog';
import { useNavigate } from 'react-router';

interface ProfilePanelProps {
  person: Person;
  onClose: () => void;
}

export function ProfilePanel({ person, onClose }: ProfilePanelProps) {
  const { getChildren, getParents, getSpouse, deletePerson } = useFamilyContext();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addDialogType, setAddDialogType] = useState<'parent' | 'spouse' | 'child' | null>(null);
  const navigate = useNavigate();

  const children = getChildren(person.id);
  const parents = getParents(person.id);
  const spouse = getSpouse(person.id);

  const birthYear = person.birthDate ? new Date(person.birthDate).getFullYear() : null;
  const deathYear = person.deathDate ? new Date(person.deathDate).getFullYear() : null;
  const initials = person.firstName && person.lastName
    ? `${person.firstName[0]}${person.lastName[0]}`.toUpperCase()
    : 'NA';

  const handleAddRelation = (type: 'parent' | 'spouse' | 'child') => {
    setAddDialogType(type);
    setShowAddDialog(true);
  };

  return (
    <>
      <div className="h-full flex flex-col bg-white">
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-[#3D6F42] to-[#2F5233] text-white">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-semibold">Perfil Familiar</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20 ring-4 ring-white/30">
              <AvatarImage src={person.photoUrl} alt={`${person.firstName} ${person.lastName}`} />
              <AvatarFallback className="bg-white text-[#3D6F42] text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-xl font-medium">
                {person.firstName} {person.lastName}
              </h3>
              <p className="text-white/80 text-sm mt-1">
                {birthYear}{deathYear ? ` - ${deathYear}` : ' - Presente'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="info" className="flex-1">Información</TabsTrigger>
                <TabsTrigger value="family" className="flex-1">Familia</TabsTrigger>
                <TabsTrigger value="gallery" className="flex-1">Galería</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-4">
                {/* Datos biográficos */}
                {person.birthDate && (
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-[#3D6F42] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Nacimiento</p>
                      <p className="text-sm text-gray-600">
                        {new Date(person.birthDate).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {person.deathDate && (
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Fallecimiento</p>
                      <p className="text-sm text-gray-600">
                        {new Date(person.deathDate).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {person.birthPlace && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-[#3D6F42] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Lugar de nacimiento</p>
                      <p className="text-sm text-gray-600">{person.birthPlace}</p>
                    </div>
                  </div>
                )}

                {person.occupation && (
                  <div className="flex items-start gap-3">
                    <Briefcase className="w-5 h-5 text-[#3D6F42] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Ocupación</p>
                      <p className="text-sm text-gray-600">{person.occupation}</p>
                    </div>
                  </div>
                )}

                {person.biography && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 mb-2">Biografía</p>
                      <p className="text-sm text-gray-600 leading-relaxed">{person.biography}</p>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="family" className="space-y-4 mt-4">
                {/* Padres */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Padres
                    </h4>
                    {parents.length < 2 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddRelation('parent')}
                        className="h-7 text-xs"
                      >
                        <UserPlus className="w-3 h-3 mr-1" />
                        Añadir
                      </Button>
                    )}
                  </div>
                  {parents.length > 0 ? (
                    <div className="space-y-2">
                      {parents.map(parent => (
                        <div key={parent.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={parent.photoUrl} />
                            <AvatarFallback className="text-xs bg-[#3D6F42] text-white">
                              {parent.firstName[0]}{parent.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{parent.firstName} {parent.lastName}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No hay padres registrados</p>
                  )}
                </div>

                <Separator />

                {/* Pareja */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                      <Heart className="w-4 h-4" />
                      Pareja
                    </h4>
                    {!spouse && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddRelation('spouse')}
                        className="h-7 text-xs"
                      >
                        <UserPlus className="w-3 h-3 mr-1" />
                        Añadir
                      </Button>
                    )}
                  </div>
                  {spouse ? (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={spouse.photoUrl} />
                        <AvatarFallback className="text-xs bg-[#3D6F42] text-white">
                          {spouse.firstName[0]}{spouse.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{spouse.firstName} {spouse.lastName}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No hay pareja registrada</p>
                  )}
                </div>

                <Separator />

                {/* Hijos */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                      <Baby className="w-4 h-4" />
                      Hijos
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAddRelation('child')}
                      className="h-7 text-xs"
                    >
                      <UserPlus className="w-3 h-3 mr-1" />
                      Añadir
                    </Button>
                  </div>
                  {children.length > 0 ? (
                    <div className="space-y-2">
                      {children.map(child => (
                        <div key={child.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={child.photoUrl} />
                            <AvatarFallback className="text-xs bg-[#3D6F42] text-white">
                              {child.firstName[0]}{child.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{child.firstName} {child.lastName}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No hay hijos registrados</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="gallery" className="mt-4">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ImageIcon className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="text-sm text-gray-600 mb-4">
                    La galería de fotos estará disponible próximamente
                  </p>
                  <Button variant="outline" size="sm">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Subir foto
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </div>

      <PersonFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        relationType={addDialogType}
        relativePerson={person}
      />
    </>
  );
}