import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-b3841c63`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (session && !error) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          firstName: session.user.user_metadata?.firstName,
          lastName: session.user.user_metadata?.lastName,
        });
        setAccessToken(session.access_token);
      } else {
        setUser(null);
        setAccessToken(null);
      }
    } catch (error) {
      console.error('Session check error:', error);
      setUser(null);
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          firstName: session.user.user_metadata?.firstName,
          lastName: session.user.user_metadata?.lastName,
        });
        setAccessToken(session.access_token);
      } else {
        setUser(null);
        setAccessToken(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      console.log('Attempting signup with:', { email, firstName, lastName });
      console.log('API URL:', `${API_URL}/auth/signup`);

      let response;
      let useClientSideAuth = false;

      try {
        // Try to call our server to create the user
        response = await fetch(`${API_URL}/auth/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password, firstName, lastName }),
        });
      } catch (fetchError: any) {
        console.error('Fetch error:', fetchError);

        // Check for common network errors
        if (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('NetworkError')) {
          console.warn('Edge Function not reachable, falling back to client-side auth');
          useClientSideAuth = true;
        } else {
          throw new Error('Error de red. Por favor intenta nuevamente.');
        }
      }

      // If Edge Function is not available or returns 401, use client-side auth
      if (!useClientSideAuth && response) {
        console.log('Signup response status:', response.status);

        if (response.status === 401 || response.status === 404) {
          console.warn('⚠️ Edge Function not deployed or not accessible');
          console.warn('📝 Falling back to client-side authentication (development mode)');
          console.warn('ℹ️ To use server-side auth, deploy the Edge Function following DEPLOYMENT.md');
          useClientSideAuth = true;
        }
      }

      if (useClientSideAuth) {
        // Fallback: Use Supabase Auth directly from client
        console.log('Using client-side authentication...');

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              firstName,
              lastName,
            },
            emailRedirectTo: window.location.origin,
          },
        });

        if (error) {
          console.error('Client-side signup error:', error);

          if (error.message.includes('User already registered')) {
            throw new Error('Este email ya está registrado');
          }

          throw new Error(error.message);
        }

        if (!data.user) {
          throw new Error('No se pudo crear el usuario');
        }

        console.log('User created successfully via client-side auth', {
          hasSession: !!data.session,
          userId: data.user.id,
          emailConfirmedAt: data.user.email_confirmed_at
        });

        // Check if user has a session (auto-confirmed) or needs email confirmation
        if (data.session) {
          // User is auto-confirmed and logged in
          console.log('User auto-confirmed with session');
          setUser({
            id: data.session.user.id,
            email: data.session.user.email!,
            firstName: data.session.user.user_metadata?.firstName,
            lastName: data.session.user.user_metadata?.lastName,
          });
          setAccessToken(data.session.access_token);
        } else {
          // User created but needs email confirmation
          console.log('User needs email confirmation');
          
          // Check if email confirmation is actually required by checking user object
          if (data.user && !data.user.email_confirmed_at) {
            // Email confirmation is required
            throw new Error('NEEDS_CONFIRMATION');
          } else {
            // User was created but no session - this shouldn't happen
            // Try to sign in directly
            console.log('No session but user created, attempting sign in...');
            try {
              const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password
              });
              
              if (signInError) throw signInError;
              
              if (signInData.session) {
                setUser({
                  id: signInData.session.user.id,
                  email: signInData.session.user.email!,
                  firstName: signInData.session.user.user_metadata?.firstName,
                  lastName: signInData.session.user.user_metadata?.lastName,
                });
                setAccessToken(signInData.session.access_token);
              } else {
                throw new Error('NEEDS_CONFIRMATION');
              }
            } catch (signInErr) {
              console.error('Sign in after signup failed:', signInErr);
              throw new Error('NEEDS_CONFIRMATION');
            }
          }
        }

        return;
      }

      // Edge Function is available, process response
      if (response) {
        let data;
        try {
          const text = await response.text();
          console.log('Response text:', text);

          if (text) {
            data = JSON.parse(text);
            console.log('Signup response data:', data);
          } else {
            throw new Error('Respuesta vacía del servidor');
          }
        } catch (parseError) {
          console.error('Failed to parse response:', parseError);
          throw new Error(`Error al procesar respuesta del servidor (Status: ${response.status})`);
        }

        if (!response.ok) {
          const errorMessage = data?.error || `Error del servidor: ${response.status}`;
          console.error('Signup failed:', errorMessage);
          throw new Error(errorMessage);
        }

        console.log('User created successfully via Edge Function, attempting sign in...');
        // Now sign in with the created credentials
        await signIn(email, password);
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Handle specific auth errors
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Credenciales inválidas. Verifica tu email y contraseña.');
        }
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Por favor confirma tu email antes de iniciar sesión.');
        }
        throw new Error(error.message);
      }

      if (data.session) {
        setUser({
          id: data.session.user.id,
          email: data.session.user.email!,
          firstName: data.session.user.user_metadata?.firstName,
          lastName: data.session.user.user_metadata?.lastName,
        });
        setAccessToken(data.session.access_token);
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw new Error(error.message || 'Error al iniciar sesión');
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setAccessToken(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        loading,
        signUp,
        signIn,
        signOut,
        checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}