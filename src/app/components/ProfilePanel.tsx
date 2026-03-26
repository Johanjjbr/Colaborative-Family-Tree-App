import React, { useState } from 'react';
import { Person } from '../types/family';
import { useFamilyContext } from '../context/FamilyContext';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import {
  X, Calendar, MapPin, Briefcase, Users,
  Edit, Trash2, UserPlus, Heart, Baby, Image as ImageIcon,
} from 'lucide-react';
import { PersonFormDialog } from './PersonFormDialog';
import { toast } from 'sonner';

interface ProfilePanelProps {
  person: Person;
  onClose: () => void;
}

function RelativeLine({ person, onClick }: { person: Person; onClick?: () => void }) {
  const initials = `${person.firstName[0]}${person.lastName[0]}`.toUpperCase();
  return (
    <button
      className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors w-full text-left"
      onClick={onClick}
    >
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarImage src={person.photoUrl} />
        <AvatarFallback className="text-xs bg-[#3D6F42] text-white">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{person.firstName} {person.lastName}</p>
        {person.birthDate && (
          <p className="text-xs text-gray-400">{new Date(person.birthDate).getFullYear()}</p>
        )}
      </div>
    </button>
  );
}

export function ProfilePanel({ person, onClose }: ProfilePanelProps) {
  const { getChildren, getParents, getSpouse, deletePerson, setSelectedPerson } = useFamilyContext();

  const [showEditDialog, setShowEditDialog]     = useState(false);
  const [showAddDialog, setShowAddDialog]       = useState(false);
  const [addDialogType, setAddDialogType]       = useState<'parent' | 'spouse' | 'child' | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting]                 = useState(false);

  const children = getChildren(person.id);
  const parents  = getParents(person.id);
  const spouse   = getSpouse(person.id);

  const birthYear = person.birthDate ? new Date(person.birthDate).getFullYear() : null;
  const deathYear = person.deathDate ? new Date(person.deathDate).getFullYear() : null;
  const initials  = `${person.firstName?.[0] ?? ''}${person.lastName?.[0] ?? ''}`.toUpperCase() || '?';

  const handleAddRelation = (type: 'parent' | 'spouse' | 'child') => {
    setAddDialogType(type);
    setShowAddDialog(true);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deletePerson(person.id);
      toast.success(`${person.firstName} eliminado del árbol`);
      onClose();
    } catch {
      toast.error('Error al eliminar. Inténtalo de nuevo.');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const navigateToPerson = (p: Person) => {
    setSelectedPerson(p);
  };

  return (
    <>
      <div className="h-full flex flex-col bg-white">

        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-[#3D6F42] to-[#2F5233] text-white shrink-0">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-semibold">Perfil Familiar</h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost" size="icon"
                className="text-white/80 hover:text-white hover:bg-white/20 h-8 w-8"
                onClick={() => setShowEditDialog(true)}
                title="Editar"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost" size="icon"
                className="text-white/80 hover:text-red-300 hover:bg-white/20 h-8 w-8"
                onClick={() => setShowDeleteConfirm(true)}
                title="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost" size="icon"
                className="text-white hover:bg-white/20 h-8 w-8"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Avatar className="w-18 h-18 ring-4 ring-white/30" style={{ width: 72, height: 72 }}>
              <AvatarImage src={person.photoUrl} alt={`${person.firstName} ${person.lastName}`} />
              <AvatarFallback className="bg-white text-[#3D6F42] text-xl">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-xl font-semibold leading-tight">{person.firstName} {person.lastName}</h3>
              <p className="text-white/70 text-sm mt-0.5">
                {birthYear ?? '?'}{deathYear ? ` — ${deathYear}` : ''}
                {!deathYear && birthYear && ' — Presente'}
              </p>
              {person.occupation && (
                <p className="text-white/60 text-xs mt-1">{person.occupation}</p>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            <Tabs defaultValue="info">
              <TabsList className="w-full mb-4">
                <TabsTrigger value="info"    className="flex-1">Información</TabsTrigger>
                <TabsTrigger value="family"  className="flex-1">Familia</TabsTrigger>
              </TabsList>

              {/* ── Info Tab ─────────────────────────────────────────────────── */}
              <TabsContent value="info" className="space-y-4 mt-0">
                {person.birthDate && (
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-[#3D6F42] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nacimiento</p>
                      <p className="text-sm text-gray-900">
                        {new Date(person.birthDate).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                        {person.birthPlace && ` · ${person.birthPlace}`}
                      </p>
                    </div>
                  </div>
                )}

                {person.deathDate && (
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fallecimiento</p>
                      <p className="text-sm text-gray-900">
                        {new Date(person.deathDate).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                )}

                {person.occupation && (
                  <div className="flex items-start gap-3">
                    <Briefcase className="w-4 h-4 text-[#3D6F42] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ocupación</p>
                      <p className="text-sm text-gray-900">{person.occupation}</p>
                    </div>
                  </div>
                )}

                {person.biography && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Biografía</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{person.biography}</p>
                    </div>
                  </>
                )}

                {!person.birthDate && !person.occupation && !person.biography && (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-400">No hay información adicional.</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowEditDialog(true)}>
                      <Edit className="w-3 h-3 mr-1" /> Completar perfil
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* ── Family Tab ───────────────────────────────────────────────── */}
              <TabsContent value="family" className="space-y-5 mt-0">

                {/* Parents */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Padres
                    </h4>
                    {parents.length < 2 && (
                      <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => handleAddRelation('parent')}>
                        <UserPlus className="w-3 h-3 mr-1" /> Añadir
                      </Button>
                    )}
                  </div>
                  {parents.length > 0
                    ? <div className="space-y-1.5">{parents.map(p => <RelativeLine key={p.id} person={p} onClick={() => navigateToPerson(p)} />)}</div>
                    : <p className="text-sm text-gray-400">No registrados</p>
                  }
                </div>

                <Separator />

                {/* Spouse */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5" /> Pareja
                    </h4>
                    {!spouse && (
                      <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => handleAddRelation('spouse')}>
                        <UserPlus className="w-3 h-3 mr-1" /> Añadir
                      </Button>
                    )}
                  </div>
                  {spouse
                    ? <RelativeLine person={spouse} onClick={() => navigateToPerson(spouse)} />
                    : <p className="text-sm text-gray-400">No registrada</p>
                  }
                </div>

                <Separator />

                {/* Children */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                      <Baby className="w-3.5 h-3.5" /> Hijos ({children.length})
                    </h4>
                    <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => handleAddRelation('child')}>
                      <UserPlus className="w-3 h-3 mr-1" /> Añadir
                    </Button>
                  </div>
                  {children.length > 0
                    ? <div className="space-y-1.5">{children.map(c => <RelativeLine key={c.id} person={c} onClick={() => navigateToPerson(c)} />)}</div>
                    : <p className="text-sm text-gray-400">Sin hijos registrados</p>
                  }
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </div>

      {/* ── Edit dialog ────────────────────────────────────────────────────── */}
      <PersonFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        person={person}
      />

      {/* ── Add relative dialog ───────────────────────────────────────────── */}
      <PersonFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        relationType={addDialogType}
        relativePerson={person}
      />

      {/* ── Delete confirmation ───────────────────────────────────────────── */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar a {person.firstName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán también todas las relaciones
              asociadas a <strong>{person.firstName} {person.lastName}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Eliminando...' : 'Sí, eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}