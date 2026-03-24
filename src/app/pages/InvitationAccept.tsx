import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Users, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-b3841c63`;

export default function InvitationAccept() {
  const { invitationId } = useParams<{ invitationId: string }>();
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const [invitation, setInvitation] = useState<any>(null);
  const [familyName, setFamilyName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInvitation();
  }, [invitationId]);

  const loadInvitation = async () => {
    try {
      const response = await fetch(`${API_URL}/invitations/${invitationId}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invitación no encontrada');
        return;
      }

      setInvitation(data.invitation);
      setFamilyName(data.familyName || 'Familia');
    } catch (error) {
      console.error('Load invitation error:', error);
      setError('Error al cargar la invitación');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!user || !accessToken) {
      // Redirect to auth with return URL
      navigate(`/auth?redirect=/invitation/${invitationId}`);
      return;
    }

    setAccepting(true);

    try {
      const response = await fetch(`${API_URL}/invitations/${invitationId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al aceptar invitación');
      }

      toast.success('¡Te has unido al árbol familiar!');
      navigate('/');
    } catch (error: any) {
      console.error('Accept invitation error:', error);
      toast.error(error.message || 'Error al aceptar invitación');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#3D6F42]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-center">Invitación No Válida</CardTitle>
            <CardDescription className="text-center">
              {error}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full"
            >
              Volver al Inicio
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (invitation?.status === 'accepted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-center">Invitación Ya Aceptada</CardTitle>
            <CardDescription className="text-center">
              Esta invitación ya ha sido utilizada
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              onClick={() => navigate(user ? '/' : '/auth')}
              className="w-full bg-[#3D6F42] hover:bg-[#2d5331]"
            >
              {user ? 'Ir al Árbol Familiar' : 'Iniciar Sesión'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#3D6F42] rounded-full mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[#3D6F42] mb-2">
            Invitación al Árbol Familiar
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Únete a {familyName}</CardTitle>
            <CardDescription>
              Has sido invitado a colaborar en este árbol genealógico familiar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-[#3D6F42] mb-2">¿Qué podrás hacer?</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✓ Ver el árbol genealógico completo</li>
                <li>✓ Agregar y editar perfiles de familiares</li>
                <li>✓ Colaborar con otros miembros</li>
                <li>✓ Compartir fotos y biografías</li>
              </ul>
            </div>

            {!user && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  Necesitas crear una cuenta o iniciar sesión para aceptar esta invitación
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleAcceptInvitation}
              className="w-full bg-[#3D6F42] hover:bg-[#2d5331]"
              disabled={accepting}
            >
              {accepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Aceptando...
                </>
              ) : user ? (
                'Aceptar Invitación'
              ) : (
                'Iniciar Sesión para Aceptar'
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
