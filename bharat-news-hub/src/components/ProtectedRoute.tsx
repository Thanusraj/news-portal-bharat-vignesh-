import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const ProtectedRoute = () => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  // 1. Wait for Firebase auth state strictly BEFORE doing any redirect logic
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
          <p className="text-muted-foreground text-sm">Verifying Session...</p>
        </div>
      </div>
    );
  }

  // 2. Only strictly redirect IF we definitively proved user is null (Firebase finished loading)
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Signed-in but profile not ready yet (should be rare once AuthContext awaits loadProfile)
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
          <p className="text-muted-foreground text-sm">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // 3. Optional logic for onboarding requirement (if applicable to your app rules)
  if (profile && !profile.onboardingComplete && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  // 4. Return protected child routes if they are fully authenticated
  return <Outlet />;
};

export default ProtectedRoute;
