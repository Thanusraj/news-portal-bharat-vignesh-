import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index.tsx";

const NewsDetail = lazy(() => import("./pages/NewsDetail.tsx"));
const SearchPage = lazy(() => import("./pages/SearchPage.tsx"));
const SavedPage = lazy(() => import("./pages/SavedPage.tsx"));
const TruthLensPage = lazy(() => import("./pages/TruthLensPage.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Login = lazy(() => import("./pages/Login.tsx"));
const Onboarding = lazy(() => import("./pages/Onboarding.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
      <p className="text-muted-foreground text-sm">Loading...</p>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route element={<ProtectedRoute />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/home" element={<Index />} />
                  <Route path="/article" element={<NewsDetail />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/saved" element={<SavedPage />} />
                  <Route path="/truthlens" element={<TruthLensPage />} />
                  <Route path="/profile" element={<Profile />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
