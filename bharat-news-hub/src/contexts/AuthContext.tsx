import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "@/config/firebase";
import type { NewsArticle } from "@/services/newsApi";

export interface UserProfile {
  state: string;
  language: string;
  interests: string[];
  likedArticles: NewsArticle[];
  savedArticles: NewsArticle[];
  onboardingComplete: boolean;
}

function emptyProfile(): UserProfile {
  return {
    state: "",
    language: "en",
    interests: [],
    likedArticles: [],
    savedArticles: [],
    onboardingComplete: false,
  };
}

function normalizeProfile(raw: Partial<UserProfile> | Record<string, unknown> | null | undefined): UserProfile {
  const d = raw ?? {};
  return {
    state: typeof d.state === "string" ? d.state : "",
    language: typeof d.language === "string" ? d.language : "en",
    interests: Array.isArray(d.interests) ? d.interests : [],
    likedArticles: Array.isArray(d.likedArticles) ? d.likedArticles : [],
    savedArticles: Array.isArray(d.savedArticles) ? d.savedArticles : [],
    onboardingComplete: Boolean(d.onboardingComplete),
  };
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>, opts?: { allowOffline?: boolean }) => Promise<void>;
  toggleLike: (article: NewsArticle) => Promise<void>;
  toggleSave: (article: NewsArticle) => Promise<void>;
}

const noopAsync = async (..._args: unknown[]) => {};

const defaultAuthContextValue: AuthContextType = {
  user: null,
  profile: null,
  loading: true,
  signInWithGoogle: noopAsync as () => Promise<void>,
  signInWithEmail: noopAsync as (email: string, password: string) => Promise<void>,
  signUpWithEmail: noopAsync as (email: string, password: string) => Promise<void>,
  signOut: noopAsync as () => Promise<void>,
  updateProfile: noopAsync as (data: Partial<UserProfile>, opts?: { allowOffline?: boolean }) => Promise<void>,
  toggleLike: noopAsync as (article: NewsArticle) => Promise<void>,
  toggleSave: noopAsync as (article: NewsArticle) => Promise<void>,
};

const AuthContext = createContext<AuthContextType>(defaultAuthContextValue);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const timeout = new Promise<"timeout">((resolve) =>
      setTimeout(() => resolve("timeout"), 3000)
    );

    const fetchProfile = async (): Promise<"done"> => {
      try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) {
          setProfile(normalizeProfile(snap.data() as Partial<UserProfile>));
          return "done";
        }
      } catch (err) {
        console.warn("Failed to get profile from Firestore:", err);
      }

      const defaultProfile = emptyProfile();
      setProfile(defaultProfile);
      
      // Save default in background — don't block on it
      setDoc(doc(db, "users", uid), defaultProfile, { merge: true }).catch((err) =>
        console.warn("Failed to save default profile:", err)
      );
      
      return "done";
    };

    const result = await Promise.race([fetchProfile(), timeout]);
    if (result === "timeout") {
      console.warn("Profile load timed out — showing app with default profile");
      setProfile((prev) => prev ?? emptyProfile());
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        await loadProfile(u.uid);
      } catch (error) {
        console.error("Error loading profile:", error);
        setProfile((prev) => prev ?? emptyProfile());
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      // Re-throw the error so it can be caught by the caller
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpWithEmail = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setProfile(null);
  };

  const updateProfile = async (data: Partial<UserProfile>, opts?: { allowOffline?: boolean }) => {
    const allowOffline = opts?.allowOffline ?? false;
    if (!user) {
      if (allowOffline) return;
      throw new Error("Not signed in");
    }
    const base = normalizeProfile(profile);
    const updated = normalizeProfile({ ...base, ...data });
    const previous = profile;
    setProfile(updated);
    // allowOffline: do not await Firestore — a hung or very slow setDoc left onboarding stuck on "Saving…"
    if (allowOffline) {
      void setDoc(doc(db, "users", user.uid), updated, { merge: true }).catch((err) => {
        console.warn("Failed to update profile in Firestore:", err);
      });
      return;
    }
    try {
      await setDoc(doc(db, "users", user.uid), updated, { merge: true });
    } catch (err) {
      console.warn("Failed to update profile in Firestore:", err);
      setProfile(previous);
      throw err instanceof Error ? err : new Error(String(err));
    }
  };

  const toggleLike = async (article: NewsArticle) => {
    if (!user || !profile) return;
    const p = normalizeProfile(profile);
    const isLiked = p.likedArticles.some((a) => a.url === article.url);
    const liked = isLiked
      ? p.likedArticles.filter((a) => a.url !== article.url)
      : [...p.likedArticles, article];
    await updateProfile({ likedArticles: liked }, { allowOffline: true });
  };

  const toggleSave = async (article: NewsArticle) => {
    if (!user || !profile) return;
    const p = normalizeProfile(profile);
    const isSaved = p.savedArticles.some((a) => a.url === article.url);
    const saved = isSaved
      ? p.savedArticles.filter((a) => a.url !== article.url)
      : [...p.savedArticles, article];
    await updateProfile({ savedArticles: saved }, { allowOffline: true });
  };

  return (
    <AuthContext.Provider
      value={{
        user, profile, loading,
        signInWithGoogle, signInWithEmail, signUpWithEmail,
        signOut, updateProfile, toggleLike, toggleSave,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
