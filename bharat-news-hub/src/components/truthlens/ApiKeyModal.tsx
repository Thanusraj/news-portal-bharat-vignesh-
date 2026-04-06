import { useState } from "react";
import { X, Key, Save } from "lucide-react";
import { ApiKeys } from "@/types/analysis";
import { getApiKeys, saveApiKeys } from "@/services/apiKeys";

interface ApiKeyModalProps {
  open: boolean;
  onClose: () => void;
}

const ApiKeyModal = ({ open, onClose }: ApiKeyModalProps) => {
  const [keys, setKeys] = useState<ApiKeys>(getApiKeys);

  if (!open) return null;

  const handleSave = () => {
    saveApiKeys(keys);
    onClose();
  };

  const fields: { key: keyof ApiKeys; label: string; required: boolean; placeholder: string }[] = [
    { key: "openRouter", label: "OpenRouter API Key", required: true, placeholder: "sk-or-..." },
    { key: "groq", label: "Groq API Key", required: true, placeholder: "gsk_..." },
    { key: "huggingFace", label: "Hugging Face Token", required: false, placeholder: "hf_..." },
    { key: "newsApi", label: "NewsAPI Key", required: false, placeholder: "Your NewsAPI key" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md mx-4 rounded-2xl bg-surface-1 border border-border p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">API Keys</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-accent text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Keys are stored locally in your browser. Never sent to any server except the respective APIs.
        </p>

        <div className="space-y-4">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5 mb-1.5">
                {f.label}
                {f.required && <span className="text-destructive text-xs">*</span>}
              </label>
              <input
                type="password"
                placeholder={f.placeholder}
                value={keys[f.key]}
                onChange={(e) => setKeys((prev) => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
        >
          <Save className="w-4 h-4" />
          Save Keys
        </button>
      </div>
    </div>
  );
};

export default ApiKeyModal;
