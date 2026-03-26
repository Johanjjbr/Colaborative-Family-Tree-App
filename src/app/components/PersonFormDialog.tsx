import React, { useState, useRef } from 'react';
import { Person } from '../types/family';
import { useFamilyContext } from '../context/FamilyContext';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
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

export function PersonFormDialog({ open, onOpenChange, person, relationType, relativePerson }: PersonFormDialogProps) {
  const { addPerson, updatePerson, addRelationship, uploadPhoto } = useFamilyContext();

  const blank = { firstName: '', lastName: '', birthDate: '', birthPlace: '', occupation: '', biography: '', deathDate: '', photoUrl: '', gender: 'other' as const };
  const [formData, setFormData] = useState<Partial<Person>>(person || blank);
  const [isDeceased, setIsDeceased] = useState(!!person?.deathDate);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => { setFormData(blank); setIsDeceased(false); };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('La imagen debe ser menor a 5MB'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Selecciona una imagen válida'); return; }
    setUploadingPhoto(true);
    try {
      const url = await uploadPhoto(file);
      setFormData(f => ({ ...f, photoUrl: url }));
      toast.success('Foto subida');
    } catch { toast.error('Error al subir la foto'); }
    finally { setUploadingPhoto(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName) { toast.error('Completa nombre y apellido'); return; }
    setSaving(true);
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
        gender: (formData.gender || 'other') as 'male' | 'female' | 'other',
      };

      if (person) {
        await updatePerson(person.id, personPayload);
        toast.success('Persona actualizada');
      } else {
        if (!relationType || !relativePerson) {
          // Sin relación
          await addPerson(personPayload);
        } else if (relationType === 'child') {
          // relativePerson = padre/madre → nueva persona es hijo/a
          await addPerson(personPayload, relativePerson.id, undefined);
        } else if (relationType === 'spouse') {
          // relativePerson = la pareja → nueva persona se casa con ella
          await addPerson(personPayload, undefined, relativePerson.id);
        } else if (relationType === 'parent') {
          // relativePerson = hijo/a existente → nueva persona es padre/madre
          // Creamos la persona primero y obtenemos su ID real del servidor
          const created = await addPerson(personPayload, undefined, undefined);
          // Relación: created (padre) → relativePerson (hijo)
          await addRelationship({ type: 'parent', person1Id: created.id, person2Id: relativePerson.id });
        }
        toast.success('Persona añadida');
      }

      onOpenChange(false);
      reset();
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar la persona');
    } finally {
      setSaving(false);
    }
  };

  const title = () => {
    if (person) return 'Editar Persona';
    if (relationType === 'parent') return `Añadir Padre/Madre de ${relativePerson?.firstName}`;
    if (relationType === 'spouse') return `Añadir Pareja de ${relativePerson?.firstName}`;
    if (relationType === 'child') return `Añadir Hijo/a de ${relativePerson?.firstName}`;
    return 'Añadir Nueva Persona';
  };

  const initials = (formData.firstName || formData.lastName)
    ? `${formData.firstName?.[0] ?? ''}${formData.lastName?.[0] ?? ''}`.toUpperCase()
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title()}</DialogTitle>
          <DialogDescription>Completa la información de la persona.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo */}
          <div className="flex flex-col items-center gap-3">
            <Avatar className="w-24 h-24">
              {formData.photoUrl
                ? <AvatarImage src={formData.photoUrl} />
                : <AvatarFallback className="bg-[#3D6F42] text-white text-2xl">{initials || <User className="w-10 h-10" />}</AvatarFallback>}
            </Avatar>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto}>
              {uploadingPhoto ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Subiendo...</> : <><Upload className="w-4 h-4 mr-2" />Subir foto</>}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={formData.firstName ?? ''} onChange={e => setFormData(f => ({ ...f, firstName: e.target.value }))} placeholder="María" required />
            </div>
            <div className="space-y-2">
              <Label>Apellidos *</Label>
              <Input value={formData.lastName ?? ''} onChange={e => setFormData(f => ({ ...f, lastName: e.target.value }))} placeholder="García López" required />
            </div>
            <div className="space-y-2">
              <Label>Género</Label>
              <Select value={formData.gender} onValueChange={v => setFormData(f => ({ ...f, gender: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Masculino</SelectItem>
                  <SelectItem value="female">Femenino</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fecha de nacimiento</Label>
              <Input type="date" value={formData.birthDate ?? ''} onChange={e => setFormData(f => ({ ...f, birthDate: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Lugar de nacimiento</Label>
              <Input value={formData.birthPlace ?? ''} onChange={e => setFormData(f => ({ ...f, birthPlace: e.target.value }))} placeholder="Madrid, España" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Ocupación</Label>
              <Input value={formData.occupation ?? ''} onChange={e => setFormData(f => ({ ...f, occupation: e.target.value }))} placeholder="Ingeniero, Maestra..." />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="deceased" checked={isDeceased} onCheckedChange={v => setIsDeceased(!!v)} />
            <Label htmlFor="deceased" className="font-normal cursor-pointer">Esta persona ha fallecido</Label>
          </div>
          {isDeceased && (
            <div className="space-y-2">
              <Label>Fecha de fallecimiento</Label>
              <Input type="date" value={formData.deathDate ?? ''} onChange={e => setFormData(f => ({ ...f, deathDate: e.target.value }))} />
            </div>
          )}

          <div className="space-y-2">
            <Label>Biografía</Label>
            <Textarea value={formData.biography ?? ''} onChange={e => setFormData(f => ({ ...f, biography: e.target.value }))} placeholder="Escribe una breve biografía..." rows={3} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); reset(); }}>Cancelar</Button>
            <Button type="submit" className="bg-[#3D6F42] hover:bg-[#2F5233]" disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : person ? 'Actualizar' : 'Añadir Persona'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}