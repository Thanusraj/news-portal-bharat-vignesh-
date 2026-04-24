import { useState } from "react";
import { Globe, Check, Loader2 } from "lucide-react";

/**
 * Language options.
 * Each language maps to a key used by the translation API.
 */
const LANGUAGES = [
  { key: "english",   label: "English",   native: "English",    icon: "🇬🇧" },
  { key: "hindi",     label: "Hindi",     native: "हिन्दी",       icon: "🇮🇳" },
  { key: "tamil",     label: "Tamil",     native: "தமிழ்",       icon: "🇮🇳" },
  { key: "telugu",    label: "Telugu",    native: "తెలుగు",      icon: "🇮🇳" },
  { key: "bengali",   label: "Bengali",   native: "বাংলা",       icon: "🇮🇳" },
  { key: "marathi",   label: "Marathi",   native: "मराठी",       icon: "🇮🇳" },
  { key: "gujarati",  label: "Gujarati",  native: "ગુજરાતી",     icon: "🇮🇳" },
  { key: "kannada",   label: "Kannada",   native: "ಕನ್ನಡ",       icon: "🇮🇳" },
  { key: "malayalam", label: "Malayalam", native: "മലയാളം",     icon: "🇮🇳" },
] as const;

interface LanguageSelectorProps {
  selectedLang: string;
  onSelectLanguage: (langKey: string) => void;
  isTranslating: boolean;
}

const LanguageSelector = ({ selectedLang, onSelectLanguage, isTranslating }: LanguageSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-6">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isTranslating}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-background hover:bg-muted/50 transition-all duration-200 text-sm font-semibold shadow-sm disabled:opacity-50"
      >
        {isTranslating ? (
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        ) : (
          <Globe className="w-4 h-4 text-primary" />
        )}
        <span>
          {isTranslating
            ? "Translating..."
            : `Language: ${LANGUAGES.find((l) => l.key === selectedLang)?.label || "English"}`}
        </span>
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Language Grid */}
      {isOpen && (
        <div className="mt-3 grid grid-cols-3 sm:grid-cols-3 gap-2 p-4 rounded-2xl border border-border bg-background shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          {LANGUAGES.map((lang) => {
            const isSelected = selectedLang === lang.key;
            return (
              <button
                key={lang.key}
                onClick={() => {
                  onSelectLanguage(lang.key);
                  setIsOpen(false);
                }}
                disabled={isTranslating}
                className={`relative flex flex-col items-start p-3 rounded-xl border-2 transition-all duration-200 text-left
                  ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border hover:border-primary/40 hover:bg-muted/30"
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {/* Checkmark */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <span className="text-sm font-bold text-foreground">{lang.label}</span>
                <span className="text-xs text-muted-foreground mt-0.5">{lang.native}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
