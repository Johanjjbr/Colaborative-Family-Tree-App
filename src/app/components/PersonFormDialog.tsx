import React, { useState, useRef } from 'react';
import { Person } from '../types/family';
import { useFamilyContext } from '../context/FamilyContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Upload, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PersonFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person?: Person;
  relationType?: 'parent' | 'spouse' | 'child' | null;
  relativePerson?: Person;
}

export function PersonFormDialog({
  open,
  onOpenChange,
  person,
  relationType,
  relativePerson
}: PersonFormDialogProps) {
  const { addPerson, updatePerson, addRelationship, uploadPhoto } = useFamilyContext();

  const emptyForm: Partial<Person> = {
    firstName: '',
    lastName: '',
    birthDate: '',
    birthPlace: '',
    occupation: '',
    biography: '',
    deathDate: '',
    photoUrl: '',
    gender: 'other',
  };

  const [formData, setFormData] = useState<Partial<Person>>(person ?? emptyForm);
  const [isDeceased, setIsDeceased] = useState(!!person?.deathDate);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when dialog opens/closes or person changes
  React.useEffect(() => {
    if (open) {
      setFormData(person ?? emptyForm);
      setIsDeceased(!!person?.deathDate);
    }
  }, [open, person]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('La imagen debe ser menor a 5MB'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Por favor selecciona una imagen válida'); return; }

    setUploadingPhoto(true);
    try {
      const photoUrl = await uploadPhoto(file);
      setFormData(prev => ({ ...prev, photoUrl }));
      toast.success('Foto subida correctamente');
    } catch {
      toast.error('Error al subir la foto');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName) {
      toast.error('Por favor completa el nombre y apellido');
      return;
    }

    setSubmitting(true);
    try {
      const personPayload = {
        firstName: formData.firstName!,
        lastName: formData.lastName!,
        birthDate: formData.birthDate,
        birthPlace: formData.birthPlace,
        deathDate: isDeceased ? formData.deathDate : undefined,
        occupation: formData.occupation,
        biography: formData.biography,
        photoUrl: formData.photoUrl,
        gender: formData.gender ?? 'other',
      };

      if (person) {
        // Edit existing
        await updatePerson(person.id, personPayload);
        toast.success('Persona actualizada correctamente');
      } else {
        // Add new — figure out relationship args
        let parentId: string | undefined;
        let spouseId: string | undefined;

        if (relationType && relativePerson) {
          if (relationType === 'child') {
            // relativePerson is the parent of the new person
            parentId = relativePerson.id;
          } else if (relationType === 'spouse') {
            spouseId = relativePerson.id;
          }
          // 'parent' case: the new person IS the parent of relativePerson
          // We handle that after creation below
        }

        const createdPerson = await addPerson(personPayload, parentId, spouseId);

        // If we're adding a parent, link new person → relativePerson
        if (relationType === 'parent' && relativePerson) {
          await addRelationship({
            type: 'parent',
            person1Id: createdPerson.id,
            person2Id: relativePerson.id,
          });
        }

        toast.success('Persona añadida correctamente');
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Form submit error:', error);
      toast.error('Error al guardar la persona');
    } finally {
      setSubmitting(false);
    }
  };

  const getDialogTitle = () => {
    if (person) return 'Editar Persona';
    if (relationType === 'parent') return `Añadir Padre/Madre de ${relativePerson?.firstName}`;
    if (relationType === 'spouse') return `Añadir Pareja de ${relativePerson?.firstName}`;
    if (relationType === 'child') return `Añadir Hijo/a de ${relativePerson?.firstName}`;
    return 'Añadir Nueva Persona';
  };

  const getInitials = () => {
    const f = formData.firstName?.[0] ?? '';
    const l = formData.lastName?.[0] ?? '';
    return f || l ? `${f}${l}`.toUpperCase() : null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>
            Completa la información de la persona. Los campos marcados con * son obligatorios.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-4">
            <Avatar className="w-24 h-24">
              {formData.photoUrl ? (
                <AvatarImage src={formData.photoUrl} />
              ) : (
                <AvatarFallback className="bg-[#3D6F42] text-white text-2xl">
                  {getInitials() ?? <User className="w-12 h-12" />}
                </AvatarFallback>
              )}
            </Avatar>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Subiendo...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" />Subir foto</>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nombre *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                placeholder="Ej: María"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Apellidos *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                placeholder="Ej: García López"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Género</Label>
              <Select
                value={formData.gender}
                onValueChange={(value: 'male' | 'female' | 'other') =>
                  setFormData(prev => ({ ...prev, gender: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar género" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Masculino</SelectItem>
                  <SelectItem value="female">Femenino</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthDate">Fecha de nacimiento</Label>
              <Input
                id="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={e => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="birthPlace">Lugar de nacimiento</Label>
              <Input
                id="birthPlace"
                value={formData.birthPlace}
                onChange={e => setFormData(prev => ({ ...prev, birthPlace: e.target.value }))}
                placeholder="Ej: Madrid, España"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="occupation">Ocupación</Label>
              <Input
                id="occupation"
                value={formData.occupation}
                onChange={e => setFormData(prev => ({ ...prev, occupation: e.target.value }))}
                placeholder="Ej: Ingeniero, Maestra, Artista"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="deceased"
              checked={isDeceased}
              onCheckedChange={checked => setIsDeceased(checked as boolean)}
            />
            <Label htmlFor="deceased" className="font-normal cursor-pointer">
              Esta persona ha fallecido
            </Label>
          </div>

          {isDeceased && (
            <div className="space-y-2">
              <Label htmlFor="deathDate">Fecha de fallecimiento</Label>
              <Input
                id="deathDate"
                type="date"
                value={formData.deathDate}
                onChange={e => setFormData(prev => ({ ...prev, deathDate: e.target.value }))}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="biography">Biografía</Label>
            <Textarea
              id="biography"
              value={formData.biography}
              onChange={e => setFormData(prev => ({ ...prev, biography: e.target.value }))}
              placeholder="Escribe una breve biografía o historia de esta persona..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-[#3D6F42] hover:bg-[#2F5233]"
              disabled={submitting || uploadingPhoto}
            >
              {submitting
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{person ? 'Actualizando...' : 'Añadiendo...'}</>
                : person ? 'Actualizar' : 'Añadir Persona'
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}