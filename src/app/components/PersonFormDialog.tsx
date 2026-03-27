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
  const [formData, setFormData] = useState<Partial<Person>>(
    person || {
      first_name: '',
      last_name: '',
      birthDate: '',
      birthPlace: '',
      occupation: '',
      biography: '',
      deathDate: '',
      photo_url: '',
      gender: 'other'
    }
  );
  const [isDeceased, setIsDeceased] = useState(!!person?.deathDate);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('La imagen debe ser menor a 5MB'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Por favor selecciona una imagen válida'); return; }
    setUploadingPhoto(true);
    try {
      const photo_url = await uploadPhoto(file);
      setFormData(prev => ({ ...prev, photo_url }));
      toast.success('Foto subida correctamente');
    } catch (error) {
      toast.error('Error al subir la foto');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name || !formData.last_name) {
      toast.error('Por favor completa el nombre y apellido');
      return;
    }
    setLoading(true);
    try {
      if (person) {
        // Edit existing person
        await updatePerson(person.id, {
          first_name: formData.first_name,
          last_name: formData.last_name,
          birthDate: formData.birthDate,
          birthPlace: formData.birthPlace,
          deathDate: isDeceased ? formData.deathDate : undefined,
          occupation: formData.occupation,
          biography: formData.biography,
          photo_url: formData.photo_url,
          gender: formData.gender || 'other'
        });
        toast.success('Persona actualizada correctamente');
      } else {
        // Add new person
        const newPersonData = {
          first_name: formData.first_name!,
          last_name: formData.last_name!,
          birthDate: formData.birthDate,
          birthPlace: formData.birthPlace,
          deathDate: isDeceased ? formData.deathDate : undefined,
          occupation: formData.occupation,
          biography: formData.biography,
          photo_url: formData.photo_url || '',
          gender: (formData.gender || 'other') as 'male' | 'female' | 'other'
        };

        // Determine relationships based on relationType
        // relationType === 'child': relativePerson is the PARENT of the new person
        // relationType === 'spouse': relativePerson is the SPOUSE of the new person
        // relationType === 'parent': relativePerson is the CHILD of the new person (new person is a parent)

        let parentId: string | undefined;
        let spouseId: string | undefined;

        if (relationType === 'child' && relativePerson) {
          // The relative is the parent, new person is the child
          parentId = relativePerson.id;
        } else if (relationType === 'spouse' && relativePerson) {
          spouseId = relativePerson.id;
        }
        // For 'parent' relationType, we handle it separately after creation

        // addPerson now returns the created person
        const createdPerson = await addPerson(newPersonData, parentId, spouseId);

        // If adding a parent: new person IS the parent, relativePerson is the child
        if (relationType === 'parent' && relativePerson && createdPerson) {
          await addRelationship({
            type: 'parent',
            person1Id: createdPerson.id,  // parent
            person2Id: relativePerson.id  // child
          });
        }

        toast.success('Persona añadida correctamente');
      }
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Form submit error:', error);
      toast.error('Error al guardar la persona');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '', last_name: '', birthDate: '', birthPlace: '',
      occupation: '', biography: '', deathDate: '', photo_url: '', gender: 'other'
    });
    setIsDeceased(false);
  };

  const getDialogTitle = () => {
    if (person) return 'Editar Persona';
    if (relationType === 'parent') return `Añadir Padre/Madre de ${relativePerson?.first_name}`;
    if (relationType === 'spouse') return `Añadir Pareja de ${relativePerson?.first_name}`;
    if (relationType === 'child') return `Añadir Hijo/a de ${relativePerson?.first_name}`;
    return 'Añadir Nueva Persona';
  };

  const getInitials = () => {
    if (!formData.first_name && !formData.last_name) return null;
    return `${formData.first_name?.[0] || ''}${formData.last_name?.[0] || ''}`.toUpperCase();
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
              {formData.photo_url ? (
                <AvatarImage src={formData.photo_url} />
              ) : (
                <AvatarFallback className="bg-[#3D6F42] text-white text-2xl">
                  {getInitials() || <User className="w-12 h-12" />}
                </AvatarFallback>
              )}
            </Avatar>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto}>
              {uploadingPhoto ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Subiendo...</> : <><Upload className="w-4 h-4 mr-2" />Subir foto</>}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Nombre *</Label>
              <Input id="first_name" value={formData.first_name} onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))} placeholder="Ej: María" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Apellidos *</Label>
              <Input id="last_name" value={formData.last_name} onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))} placeholder="Ej: García López" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Género</Label>
              <Select value={formData.gender} onValueChange={(value: 'male' | 'female' | 'other') => setFormData(prev => ({ ...prev, gender: value }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar género" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Masculino</SelectItem>
                  <SelectItem value="female">Femenino</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthDate">Fecha de nacimiento</Label>
              <Input id="birthDate" type="date" value={formData.birthDate} onChange={(e) => setFormData(prev => ({ ...prev, birthDate: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="birthPlace">Lugar de nacimiento</Label>
              <Input id="birthPlace" value={formData.birthPlace} onChange={(e) => setFormData(prev => ({ ...prev, birthPlace: e.target.value }))} placeholder="Ej: Caracas, Venezuela" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="occupation">Ocupación</Label>
              <Input id="occupation" value={formData.occupation} onChange={(e) => setFormData(prev => ({ ...prev, occupation: e.target.value }))} placeholder="Ej: Médico, Maestra, Ingeniero" />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="deceased" checked={isDeceased} onCheckedChange={(checked) => setIsDeceased(checked as boolean)} />
            <Label htmlFor="deceased" className="font-normal cursor-pointer">Esta persona ha fallecido</Label>
          </div>

          {isDeceased && (
            <div className="space-y-2">
              <Label htmlFor="deathDate">Fecha de fallecimiento</Label>
              <Input id="deathDate" type="date" value={formData.deathDate} onChange={(e) => setFormData(prev => ({ ...prev, deathDate: e.target.value }))} />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="biography">Biografía</Label>
            <Textarea id="biography" value={formData.biography} onChange={(e) => setFormData(prev => ({ ...prev, biography: e.target.value }))} placeholder="Escribe una breve historia de esta persona..." rows={4} />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); resetForm(); }} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-[#3D6F42] hover:bg-[#2F5233]" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{person ? 'Actualizando...' : 'Añadiendo...'}</> : (person ? 'Actualizar' : 'Añadir Persona')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}