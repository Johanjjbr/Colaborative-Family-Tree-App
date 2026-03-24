import { createBrowserRouter, Outlet, Navigate } from "react-router";
import { Dashboard } from "./pages/Dashboard";
import { TreeCanvas } from "./pages/TreeCanvas";
import Auth from "./pages/Auth";
import FamilySetup from "./pages/FamilySetup";
import InvitationAccept from "./pages/InvitationAccept";
import { useAuth } from "./context/AuthContext";
import { useFamilyContext } from "./context/FamilyContext";
import { Loader2 } from "lucide-react";

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#3D6F42]" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
}

// Family required route wrapper
function FamilyRequiredRoute({ children }: { children: React.ReactNode }) {
  const { familyId, loading } = useFamilyContext();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#3D6F42]" />
      </div>
    );
  }
  
  if (!familyId) {
    return <Navigate to="/setup" replace />;
  }
  
  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: "/auth",
    Component: Auth,
  },
  {
    path: "/setup",
    element: (
      <ProtectedRoute>
        <FamilySetup />
      </ProtectedRoute>
    ),
  },
  {
    path: "/invitation/:invitationId",
    Component: InvitationAccept,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <FamilyRequiredRoute>
          <Dashboard />
        </FamilyRequiredRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/tree",
    element: (
      <ProtectedRoute>
        <FamilyRequiredRoute>
          <TreeCanvas />
        </FamilyRequiredRoute>
      </ProtectedRoute>
    ),
  },
]);