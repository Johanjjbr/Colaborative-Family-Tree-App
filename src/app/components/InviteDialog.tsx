import React, { useState } from 'react';
import { useFamilyContext } from '../context/FamilyContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Mail, Loader2, Check, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteDialog({ open, onOpenChange }: InviteDialogProps) {
  const { createInvitation } = useFamilyContext();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const link = await createInvitation(email);
      setInvitationLink(link);
      toast.success('¡Invitación creada!');
    } catch (error: any) {
      console.error('Create invitation error:', error);
      toast.error(error.message || 'Error al crear invitación');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (invitationLink) {
      navigator.clipboard.writeText(invitationLink);
      setCopied(true);
      toast.success('Link copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setEmail('');
    setInvitationLink(null);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-[#3D6F42]" />
            Invitar Familiar
          </DialogTitle>
          <DialogDescription>
            Invita a un familiar a colaborar en el árbol genealógico
          </DialogDescription>
        </DialogHeader>

        {!invitationLink ? (
          <form onSubmit={handleCreateInvitation}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email del Familiar</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="familiar@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
                <p className="text-sm text-gray-500">
                  Se generará un link de invitación único para este email
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-[#3D6F42] hover:bg-[#2d5331]"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Invitación
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4 py-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800 mb-2">
                ✓ Invitación creada para <strong>{email}</strong>
              </p>
              <p className="text-xs text-green-600">
                Comparte este link para que puedan unirse al árbol familiar
              </p>
            </div>

            <div className="space-y-2">
              <Label>Link de Invitación</Label>
              <div className="flex gap-2">
                <Input
                  value={invitationLink}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyLink}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                onClick={handleClose}
                className="bg-[#3D6F42] hover:bg-[#2d5331] w-full"
              >
                Cerrar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
