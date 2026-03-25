import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Users, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { testServerConnection } from '../utils/testConnection';

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Sign In form state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Sign Up form state
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpFirstName, setSignUpFirstName] = useState('');
  const [signUpLastName, setSignUpLastName] = useState('');

  // Check server connection on mount
  useEffect(() => {
    const checkServer = async () => {
      const result = await testServerConnection();
      setServerStatus(result.success ? 'online' : 'offline');

      if (!result.success) {
        console.warn('Server connection check:', result);
        // Don't show error toast anymore since we have fallback
      }
    };

    checkServer();
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!signInEmail.trim() || !signInPassword.trim()) {
      toast.error('Por favor ingresa email y contraseña');
      return;
    }

    setLoading(true);

    try {
      await signIn(signInEmail, signInPassword);
      toast.success('¡Inicio de sesión exitoso!');
      navigate('/');
    } catch (error: any) {
      console.error('Sign in error:', error);

      // Show user-friendly error message
      let errorMessage = error.message || 'Error al iniciar sesión';

      // Add helpful hints for common errors
      if (errorMessage.includes('Credenciales inválidas')) {
        errorMessage += '. Verifica que el email y contraseña sean correctos.';
      }

      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!signUpFirstName.trim() || !signUpLastName.trim()) {
      toast.error('Por favor ingresa tu nombre y apellido');
      return;
    }

    if (!signUpEmail.trim()) {
      toast.error('Por favor ingresa tu email');
      return;
    }

    if (!signUpEmail.includes('@')) {
      toast.error('Por favor ingresa un email válido');
      return;
    }

    if (signUpPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      console.log('Starting signup process...');
      await signUp(signUpEmail, signUpPassword, signUpFirstName, signUpLastName);
      toast.success('¡Cuenta creada exitosamente!');
      navigate('/setup');
    } catch (error: any) {
      console.error('Sign up error in component:', error);

      // Handle special case for email confirmation needed
      if (error.message === 'NEEDS_CONFIRMATION') {
        toast.error(
          'Tu cuenta requiere confirmación de email. Para desarrollo, desactiva "Confirm email" en Supabase Auth Settings. Ver QUICK_FIX.md para instrucciones.',
          {
            duration: 10000,
          }
        );
        return;
      }

      // Show specific error message
      const errorMessage = error.message || 'Error al crear cuenta';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#3D6F42] rounded-full mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[#3D6F42] mb-2">
            Árbol Genealógico
          </h1>
          <p className="text-gray-600">
            Construye el árbol familiar colaborativo
          </p>

          {/* Server Status Indicator */}
          {serverStatus !== 'checking' && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-gray-100">
              {serverStatus === 'online' && (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-green-700">Servidor conectado</span>
                </>
              )}
              {serverStatus === 'offline' && (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span className="text-amber-700">Modo de desarrollo</span>
                </>
              )}
            </div>
          )}
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Iniciar Sesión</TabsTrigger>
            <TabsTrigger value="signup">Registrarse</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <Card>
              <form onSubmit={handleSignIn}>
                <CardHeader>
                  <CardTitle>Iniciar Sesión</CardTitle>
                  <CardDescription>
                    Ingresa tus credenciales para acceder
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Contraseña</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    type="submit"
                    className="w-full bg-[#3D6F42] hover:bg-[#2d5331]"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Iniciar Sesión
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card>
              <form onSubmit={handleSignUp}>
                <CardHeader>
                  <CardTitle>Crear Cuenta</CardTitle>
                  <CardDescription>
                    Regístrate para comenzar tu árbol familiar
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-firstname">Nombre</Label>
                      <Input
                        id="signup-firstname"
                        type="text"
                        placeholder="Juan"
                        value={signUpFirstName}
                        onChange={(e) => setSignUpFirstName(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-lastname">Apellido</Label>
                      <Input
                        id="signup-lastname"
                        type="text"
                        placeholder="Pérez"
                        value={signUpLastName}
                        onChange={(e) => setSignUpLastName(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Contraseña</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      required
                      disabled={loading}
                      minLength={6}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    type="submit"
                    className="w-full bg-[#3D6F42] hover:bg-[#2d5331]"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Crear Cuenta
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>

        <p className="text-center text-sm text-gray-600 mt-6">
          Al continuar, aceptas compartir información familiar de forma colaborativa
        </p>

        {/* Help section for first-time setup */}
        {serverStatus === 'offline' && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="text-sm font-semibold text-amber-900 mb-2">
              ⚠️ Primera vez usando la aplicación?
            </h3>
            <p className="text-xs text-amber-800 mb-2">
              Si no puedes registrarte o iniciar sesión, es posible que necesites configurar la base de datos primero.
            </p>
            <p className="text-xs text-amber-700">
              Lee el archivo <code className="bg-amber-100 px-1 rounded">DATABASE_SETUP.md</code> en la raíz del proyecto para instrucciones detalladas.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}