import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "@/pages/Dashboard";

const MIN_BRIDGE_MS = 800;
const MAX_BRIDGE_MS = 10000;

type LocationState = { fromOnboarding?: boolean } | null;

const Index = () => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const fromOnboardingState =
    (location.state as LocationState)?.fromOnboarding === true;

  const [onboardingBridge, setOnboardingBridge] = useState(fromOnboardingState);
  const [minBridgeMet, setMinBridgeMet] = useState(false);
  const [showProfileTransition, setShowProfileTransition] = useState(false);

  const prevOnboardedRef = useRef<boolean | undefined>(undefined);
  const bridgeCompletedRef = useRef(false);

  useEffect(() => {
    if (!onboardingBridge) return;
    const t = window.setTimeout(() => setMinBridgeMet(true), MIN_BRIDGE_MS);
    return () => window.clearTimeout(t);
  }, [onboardingBridge]);

  // Dismiss after minimum duration only — do not wait for news API (slow/hung fetch blocked the overlay)
  useEffect(() => {
    if (!onboardingBridge || bridgeCompletedRef.current) return;
    if (minBridgeMet) {
      bridgeCompletedRef.current = true;
      setOnboardingBridge(false);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [onboardingBridge, minBridgeMet, navigate, location.pathname]);

  useEffect(() => {
    if (!onboardingBridge) return;
    const t = window.setTimeout(() => {
      if (bridgeCompletedRef.current) return;
      bridgeCompletedRef.current = true;
      setOnboardingBridge(false);
      navigate(location.pathname, { replace: true, state: {} });
    }, MAX_BRIDGE_MS);
    return () => window.clearTimeout(t);
  }, [onboardingBridge, navigate, location.pathname]);

  useEffect(() => {
    const done = Boolean(profile?.onboardingComplete);
    if (prevOnboardedRef.current === undefined) {
      prevOnboardedRef.current = done;
      return;
    }
    if (prevOnboardedRef.current === false && done) {
      setShowProfileTransition(true);
      const timer = window.setTimeout(() => setShowProfileTransition(false), 900);
      prevOnboardedRef.current = done;
      return () => window.clearTimeout(timer);
    }
    prevOnboardedRef.current = done;
  }, [profile?.onboardingComplete]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (user && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
          <p className="text-muted-foreground text-sm">Restoring your profile...</p>
        </div>
      </div>
    );
  }

  const showBlockingProfileTransition = showProfileTransition && !onboardingBridge;

  if (showBlockingProfileTransition) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 animate-in fade-in duration-300 motion-reduce:animate-none">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin motion-reduce:animate-none" />
          </div>
          <p className="text-muted-foreground text-sm">Almost there...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {onboardingBridge && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="flex flex-col items-center gap-3 animate-in fade-in duration-300 motion-reduce:animate-none max-w-sm text-center px-4">
            <div className="relative h-12 w-12">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin motion-reduce:animate-none" />
            </div>
            <p className="text-muted-foreground text-sm">Setting up your personalized feed...</p>
            <p className="text-xs text-muted-foreground">Loading your first stories</p>
          </div>
        </div>
      )}
      <Dashboard />
    </>
  );
};

export default Index;
