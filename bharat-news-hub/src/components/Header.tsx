import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Newspaper, Search, User, Home, Shield, Bookmark, UserCircle, Moon, Sun } from "lucide-react";

const SCROLL_THRESHOLD = 80;

// Global state for forceFloating to persist across navigation remounts
let globalForceFloating = false;
const forceFloatingListeners = new Set<(val: boolean) => void>();

const setGlobalForceFloating = (val: boolean) => {
  globalForceFloating = val;
  forceFloatingListeners.forEach((listener) => listener(val));
};

const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [forceFloating, setForceFloatingState] = useState(globalForceFloating);

  useEffect(() => {
    forceFloatingListeners.add(setForceFloatingState);
    return () => {
      forceFloatingListeners.delete(setForceFloatingState);
    };
  }, []);
  
  // Dark mode logic
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark") || 
             localStorage.getItem("theme") === "dark";
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);
  const justNavigatedRef = useRef(false);
  const prevScrollRef = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > SCROLL_THRESHOLD);

      // Only reset forceFloating when user *actively* scrolls back up to top
      // We require: user is scrolling upward, page is near top, and it's not
      // the initial load/navigation (prevScroll must have been > threshold once)
      if (
        forceFloating &&
        !justNavigatedRef.current &&
        y < 10 &&
        prevScrollRef.current > 10
      ) {
        setGlobalForceFloating(false);
      }

      // After the first real scroll event post-navigation, clear the guard
      if (justNavigatedRef.current && Math.abs(y - prevScrollRef.current) > 5) {
        justNavigatedRef.current = false;
      }
      prevScrollRef.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    // Do NOT call onScroll() immediately — this avoids resetting forceFloating
    // on short pages where scrollY is already 0
    setScrolled(window.scrollY > SCROLL_THRESHOLD);
    return () => window.removeEventListener("scroll", onScroll);
  }, [forceFloating]);

  // Handle explicit scroll UP attempts when already at the top of the page 
  // (e.g., short pages without scrollbars like Saved/Profile)
  useEffect(() => {
    if (!forceFloating) return;

    const handleWheel = (e: WheelEvent) => {
      // deltaY < 0 means scrolling up
      if (e.deltaY < 0 && window.scrollY <= 10) {
        setGlobalForceFloating(false);
      }
    };

    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };
    const handleTouchMove = (e: TouchEvent) => {
      const touchY = e.touches[0].clientY;
      // swipe down (finger moves down) -> scrolling up intent
      if (touchY > touchStartY + 30 && window.scrollY <= 10) {
        setGlobalForceFloating(false);
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [forceFloating]);

  const handlePillNav = useCallback((to: string) => {
    justNavigatedRef.current = true;
    setGlobalForceFloating(true);
    navigate(to);
    // After a short delay, allow scroll resets again
    setTimeout(() => { justNavigatedRef.current = false; }, 600);
  }, [navigate]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const pathname = location.pathname;

  const navLinks = [
    { to: "/", label: "Home", icon: Home },
    { to: "/truthlens", label: "NewsBot AI", icon: Shield },
    { to: "/saved", label: "Saved", icon: Bookmark },
    { to: "/profile", label: "Profile", icon: UserCircle },
  ];

  // On sub-pages (not home/dashboard), always show the floating pill
  const showFloating = scrolled || forceFloating;

  const showSearchBar = !["/onboarding", "/profile", "/truthlens", "/saved"].includes(pathname);

  return (
    <>
      {/* ═══════════ FULL-WIDTH NAVBAR (at the top) ═══════════ */}
      <header
        className={`sticky top-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] ${
          showFloating
            ? "opacity-0 pointer-events-none -translate-y-full"
            : "opacity-100 translate-y-0"
        }`}
      >
        <div className="w-full bg-white/70 dark:bg-zinc-950/70 backdrop-blur-2xl border-b border-border/40">
          <div className="flex items-center justify-between px-4 lg:px-8 py-3">
            {/* Logo — with side padding */}
            <Link to="/" className="flex items-center flex-shrink-0 group ml-4 lg:ml-0 gap-3">
              <img src="/logo%20part.png" alt="Bharat News icon" className="h-[60px] w-auto object-contain drop-shadow-sm transition-all duration-300" />
              <img src="/text%20part.png" alt="Bharat News" className="h-[40px] w-auto max-w-[240px] object-contain drop-shadow-sm transition-all duration-300" />
            </Link>

            {/* Navigation Links — near right edge */}
            <nav className="hidden md:flex items-center bg-gray-100/80 dark:bg-zinc-900/80 rounded-2xl p-1.5 gap-1 border border-transparent dark:border-white/5">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`relative flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                      isActive
                        ? "text-primary dark:text-indigo-400 bg-white dark:bg-zinc-800 shadow-md shadow-gray-200/60 dark:shadow-black/40"
                        : "text-foreground/60 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-indigo-600" : ""}`} />
                    {link.label}
                  </Link>
                );
              })}
              
              {/* Dark mode toggle desktop */}
              <div className="w-px h-6 bg-border mx-2"></div>
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl text-foreground/60 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                aria-label="Toggle dark mode"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* ═══════════ FLOATING CRYSTAL PILL (on scroll) ═══════════ */}
      <nav
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex items-center p-1.5 rounded-[3rem] bg-[#e8e8ec]/70 dark:bg-zinc-900/70 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_8px_40px_rgb(0,0,0,0.10)] transition-all duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] ${
          showFloating
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 -translate-y-6 scale-90 pointer-events-none"
        }`}
      >
        {/* Logo Pill */}
        <button
          onClick={() => handlePillNav("/")}
          className="flex items-center gap-2 bg-white dark:bg-zinc-800 px-4 py-1.5 rounded-[2rem] shadow-sm hover:shadow-md transition-all cursor-pointer"
        >
          <img src="/logo%20part.png" alt="Bharat News icon" className="h-6 w-auto object-contain" />
          <img src="/text%20part.png" alt="Bharat News" className="h-[22px] w-auto max-w-[120px] object-contain" />
        </button>

        {/* Dark Nav Links */}
        <div className="hidden md:flex items-center gap-0.5 bg-[#1a1a1a] px-1.5 py-1 ml-1.5 rounded-[2rem] border border-white/10">
          {navLinks.map((link) => {
            const isActive = pathname === link.to;
            return (
              <button
                key={link.to}
                onClick={() => handlePillNav(link.to)}
                className={`relative px-4 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "text-white bg-white/15"
                    : "text-white/50 hover:text-white/90 hover:bg-white/5"
                }`}
              >
                {link.to === "/profile" && user?.photoURL && (
                  <img src={user.photoURL} alt="" className="w-4 h-4 rounded-full inline mr-1.5 border border-white/20 object-cover align-middle" />
                )}
                {link.label}
                {isActive && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Mobile: Compact */}
        <div className="flex md:hidden items-center gap-0.5 bg-[#1a1a1a] px-1.5 py-1 ml-1.5 rounded-[2rem] border border-white/10">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.to;
            return (
              <button
                key={link.to}
                onClick={() => handlePillNav(link.to)}
                className={`relative p-2 rounded-full transition-all duration-200 cursor-pointer ${
                  isActive ? "text-white bg-white/15" : "text-white/50 hover:text-white/90"
                }`}
              >
                <Icon className="w-4 h-4" />
                {isActive && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />
                )}
              </button>
            );
          })}
          
          {/* Dark mode toggle mobile */}
          <div className="w-px h-5 bg-white/20 mx-1"></div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-white/50 hover:text-white/90 transition-all duration-200"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </nav>

      {/* ═══════════ SEARCH BAR (dedicated row below nav) ═══════════ */}
      {showSearchBar && (
        <div className={`w-full transition-all duration-500 ${showFloating ? "pt-20" : "pt-0"}`}>
          <div className="max-w-2xl mx-auto px-4 pt-4 pb-1">
            <form onSubmit={handleSearch} className="relative group">
              {/* Glow Effect */}
              <div className={`absolute -inset-1 rounded-2xl bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 blur-lg transition-opacity duration-300 ${searchFocused ? "opacity-100" : "opacity-0"}`} />
              
              <div className="relative flex items-center">
                <div className={`absolute left-4 flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-300 ${searchFocused ? "bg-indigo-100 dark:bg-indigo-500/20" : "bg-gray-100 dark:bg-zinc-800"}`}>
                  <Search className={`w-4 h-4 transition-colors duration-300 ${searchFocused ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-zinc-500"}`} />
                </div>
                <input
                  type="text"
                  placeholder="Search news, topics, events across the globe..."
                  className="w-full h-14 pl-16 pr-24 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-white/10 shadow-sm hover:shadow-md focus:shadow-lg focus:border-indigo-300 dark:focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all duration-300 text-[15px] text-gray-700 dark:text-zinc-200 placeholder:text-gray-400 dark:placeholder:text-zinc-500"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                />
                <button
                  type="submit"
                  className={`absolute right-2.5 px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    query.trim()
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/30 scale-100"
                      : "bg-gray-100 text-gray-400 scale-95"
                  }`}
                >
                  Search
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
