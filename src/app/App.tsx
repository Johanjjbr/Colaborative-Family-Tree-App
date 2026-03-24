import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './context/AuthContext';
import { FamilyProvider } from './context/FamilyContext';

export default function App() {
  return (
    <AuthProvider>
      <FamilyProvider>
        <RouterProvider router={router} />
        <Toaster />
      </FamilyProvider>
    </AuthProvider>
  );
}