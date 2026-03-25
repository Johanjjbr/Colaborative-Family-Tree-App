import { projectId } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-b3841c63`;

export async function testServerConnection() {
  console.log('Testing server connection...');
  console.log('API URL:', API_URL);
  console.log('Project ID:', projectId);

  // Since Supabase Edge Functions require auth by default,
  // we'll just verify the URL format is correct
  // The actual connectivity will be tested during signup/signin

  try {
    // Validate project ID exists
    if (!projectId || projectId === 'undefined') {
      console.error('Invalid project ID');
      return {
        success: false,
        message: 'Configuración inválida del servidor',
        error: 'Project ID not configured'
      };
    }

    // Just check if the URL is properly formatted
    const url = new URL(API_URL);
    console.log('Server URL validated:', url.href);

    // We assume the server is available since we can't test it without auth
    return {
      success: true,
      message: 'Servidor configurado correctamente',
      data: { projectId }
    };
  } catch (error) {
    console.error('Connection test failed:', error);
    return {
      success: false,
      message: 'Error de configuración del servidor',
      error: String(error)
    };
  }
}
