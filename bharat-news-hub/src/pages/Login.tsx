import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getRedirectResult } from "firebase/auth";
import { auth } from "@/config/firebase";
import { Button } from "@/components/ui/button";
import { Newspaper, Mail, Lock, Eye, EyeOff, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const Login = () => {
  const { user, loading: authLoading, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user && !hasNavigatedRef.current) {
          hasNavigatedRef.current = true;
          navigate("/", { replace: true });
        }
      })
      .catch((err) => {
        console.warn("Redirect result error:", err);
      });
  }, [navigate]);

  useEffect(() => {
    if (!authLoading && user && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      navigate("/", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const friendlyError = (err: any): string => {
    const code = err?.code || "";
    switch (code) {
      case "auth/popup-blocked": return "Popup was blocked by your browser. Please allow popups.";
      case "auth/popup-closed-by-user":
      case "auth/cancelled-popup-request": return "Sign-in was cancelled.";
      case "auth/wrong-password":
      case "auth/invalid-credential": return "Invalid email or password.";
      case "auth/user-not-found": return "No account found with this email.";
      case "auth/email-already-in-use": return "An account with this email already exists.";
      case "auth/weak-password": return "Password is too weak — use at least 6 characters.";
      default: return err?.message || "Authentication failed. Please try again.";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      setError(friendlyError(err));
    }
    setSubmitLoading(false);
  };

  const handleGoogle = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      hasNavigatedRef.current = true;
      navigate("/", { replace: true });
    } catch (err: any) {
      if (err.message === "REDIRECTING_FOR_AUTH") {
        // Stop here; the page is redirecting to Google's sign-in page
        return;
      }
      setError(friendlyError(err));
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-[#050508] transition-colors duration-500">
      
      {/* 🔮 Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
           animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15], x: [0, 60, 0], y: [0, -40, 0] }}
           transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
           className="absolute top-[10%] -left-[10%] w-[50rem] h-[50rem] bg-indigo-400/40 dark:bg-indigo-600/30 rounded-full blur-[100px] dark:blur-[140px]"
        />
        <motion.div
           animate={{ scale: [1, 1.4, 1], opacity: [0.1, 0.25, 0.1], x: [0, -50, 0], y: [0, 60, 0] }}
           transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
           className="absolute bottom-[0%] -right-[10%] w-[45rem] h-[45rem] bg-teal-300/40 dark:bg-teal-500/20 rounded-full blur-[100px] dark:blur-[140px]"
        />
        <motion.div
           animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1], x: [0, 30, 0], y: [0, 40, 0] }}
           transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 4 }}
           className="absolute top-[40%] right-[20%] w-[30rem] h-[30rem] bg-purple-400/30 dark:bg-purple-600/20 rounded-full blur-[80px] dark:blur-[100px]"
        />
      </div>

      {/* 🚀 Geometric Overlays */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.04] dark:opacity-[0.04] pointer-events-none z-0 mix-blend-overlay dark:mix-blend-normal" />

      {/* 💎 Glassmorphism Auth Card */}
      <motion.div 
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-lg p-8 sm:p-12 mx-4 rounded-[2.5rem] bg-white/70 dark:bg-white/[0.03] backdrop-blur-[40px] border border-white dark:border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden"
      >
        {/* Soft upper highlight inside the card */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/30 to-transparent" />

        <div className="flex flex-col items-center mb-8 relative z-20">
          <motion.div 
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
            className="w-16 h-16 rounded-[1.2rem] bg-gradient-to-br from-indigo-500 via-purple-500 to-teal-400 p-px shadow-lg shadow-indigo-500/20 mb-5 relative group cursor-default"
          >
            <div className="w-full h-full bg-white/90 dark:bg-black/40 backdrop-blur-sm rounded-[1.1rem] flex items-center justify-center overflow-hidden transition-colors">
              <div className="absolute inset-0 bg-white/50 dark:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <Newspaper className="w-8 h-8 text-indigo-600 dark:text-white relative z-10" />
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-indigo-800 to-gray-800 dark:from-white dark:via-indigo-100 dark:to-white/70 mb-2">
              Bharat News
            </h1>
            <p className="text-gray-600 dark:text-zinc-400 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" /> Premium AI Curation
            </p>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-6 relative z-20"
        >
          {/* Primary Google Login Button */}
          <Button
            variant="outline"
            className="w-full h-14 relative overflow-hidden group bg-white/50 dark:bg-white/[0.05] border-gray-200 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/[0.1] hover:border-gray-300 dark:hover:border-white/20 text-gray-900 dark:text-white transition-all duration-300 rounded-2xl shadow-sm dark:shadow-inner dark:shadow-white/5"
            onClick={handleGoogle}
            disabled={googleLoading}
          >
            {/* Animated hover gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-teal-500/10 dark:from-indigo-500/20 dark:via-purple-500/20 dark:to-teal-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="flex items-center justify-center gap-3 relative z-10">
              {googleLoading ? (
                <div className="w-5 h-5 border-2 border-gray-400 dark:border-white/80 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              <span className="font-semibold text-base tracking-wide">{googleLoading ? "Connecting..." : "Continue with Google"}</span>
            </div>
          </Button>

          <div className="flex items-center gap-4 py-1">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 dark:via-white/10 to-transparent" />
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500">or email</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 dark:via-white/10 to-transparent" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              <motion.div 
                key={isSignUp ? "signup" : "login"}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="w-5 h-5 text-gray-400 dark:text-zinc-500 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
                  </div>
                  <input
                    type="email"
                    placeholder="Email address"
                    className="w-full h-14 pl-12 pr-4 bg-white/50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 rounded-2xl outline-none focus:bg-white dark:focus:bg-white/[0.05] focus:border-indigo-400 dark:focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-400 dark:focus:ring-indigo-500/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 transition-all font-medium"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-gray-400 dark:text-zinc-500 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    className="w-full h-14 pl-12 pr-12 bg-white/50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 rounded-2xl outline-none focus:bg-white dark:focus:bg-white/[0.05] focus:border-indigo-400 dark:focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-400 dark:focus:ring-indigo-500/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 transition-all font-medium"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-white transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>

            {error && (
              <motion.p 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="text-sm text-red-500 dark:text-red-400 text-center font-medium bg-red-100 dark:bg-red-400/10 py-2 px-3 rounded-lg border border-red-200 dark:border-red-400/20"
              >
                {error}
              </motion.p>
            )}

            <Button 
              type="submit" 
              disabled={submitLoading}
              className="w-full h-14 text-base font-bold tracking-wide rounded-2xl bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-colors shadow-md dark:shadow-[0_0_20px_rgba(255,255,255,0.1)] dark:hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]"
            >
              {submitLoading ? (
                 <div className="w-5 h-5 border-2 border-white/80 dark:border-black/80 border-t-transparent rounded-full animate-spin" />
              ) : (
                isSignUp ? "Create Premium Account" : "Access Account"
              )}
            </Button>
          </form>

          <div className="pt-2">
            <p className="text-center text-sm font-medium text-gray-500 dark:text-zinc-400">
              {isSignUp ? "Already a reader?" : "New to Bharat News?"}{" "}
              <button
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors hover:underline"
                onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
              >
                {isSignUp ? "Sign In" : "Sign Up Setup"}
              </button>
            </p>
          </div>

        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;
