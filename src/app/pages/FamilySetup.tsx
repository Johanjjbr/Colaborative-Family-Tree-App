import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useFamilyContext } from '../context/FamilyContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Users, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function FamilySetup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createFamily, familyId, loading: familyLoading } = useFamilyContext();
  const [familyName, setFamilyName] = useState('');
  const [loading, setLoading] = useState(false);

  // If user already has a family, redirect to dashboard
  useEffect(() => {
    if (!familyLoading && familyId) {
      navigate('/');
    }
  }, [familyId, familyLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!familyName.trim()) {
      toast.error('Por favor ingresa el nombre de tu familia');
      return;
    }

    setLoading(true);

    try {
      await createFamily(familyName);
      toast.success('¡Árbol familiar creado exitosamente!');
      navigate('/');
    } catch (error: any) {
      console.error('Create family error:', error);
      
      // Show user-friendly error message
      const errorMessage = error.message || 'Error al crear el árbol familiar';
      
      // Add helpful context
      if (errorMessage.includes('Failed to create family')) {
        toast.error('Error al crear el árbol familiar. Verifica que la base de datos esté configurada correctamente. Ver DATABASE_SETUP.md', {
          duration: 7000
        });
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (familyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#3D6F42]" />
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
            ¡Bienvenido, {user?.firstName}!
          </h1>
          <p className="text-gray-600">
            Comienza creando tu árbol genealógico familiar
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Crear Árbol Familiar</CardTitle>
              <CardDescription>
                Dale un nombre a tu árbol genealógico. Podrás invitar a familiares más tarde.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="family-name">Nombre del Árbol Familiar</Label>
                <Input
                  id="family-name"
                  type="text"
                  placeholder="Familia Pérez, Los García, etc."
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  required
                  disabled={loading}
                />
                <p className="text-sm text-gray-500">
                  Este nombre será visible para todos los miembros de tu familia
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-[#3D6F42] mb-2">Próximos pasos:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✓ Agrega perfiles de familiares</li>
                  <li>✓ Invita a otros miembros a colaborar</li>
                  <li>✓ Construye tu árbol generación por generación</li>
                </ul>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full bg-[#3D6F42] hover:bg-[#2d5331]"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    Crear Árbol Familiar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}