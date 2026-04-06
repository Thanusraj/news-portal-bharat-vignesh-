import { Verdict } from "@/types/analysis";
import { CheckCircle2, XCircle, AlertTriangle, HelpCircle } from "lucide-react";

interface VerdictBadgeProps {
  verdict: Verdict;
}

const VerdictBadge = ({ verdict }: VerdictBadgeProps) => {
  const config: Record<
    string,
    { icon: React.ReactNode; bg: string; text: string; border: string; glow: string }
  > = {
    True: {
      icon: <CheckCircle2 className="w-4.5 h-4.5" />,
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      glow: "shadow-emerald-100",
    },
    False: {
      icon: <XCircle className="w-4.5 h-4.5" />,
      bg: "bg-red-50",
      text: "text-red-600",
      border: "border-red-200",
      glow: "shadow-red-100",
    },
    "Partially True": {
      icon: <AlertTriangle className="w-4.5 h-4.5" />,
      bg: "bg-amber-50",
      text: "text-amber-600",
      border: "border-amber-200",
      glow: "shadow-amber-100",
    },
    Unverified: {
      icon: <HelpCircle className="w-4.5 h-4.5" />,
      bg: "bg-gray-50",
      text: "text-gray-500",
      border: "border-gray-200",
      glow: "shadow-gray-100",
    },
  };

  const c = config[verdict] || config.Unverified;

  return (
    <div
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${c.border} ${c.bg} ${c.text} ${c.glow} shadow-sm font-bold text-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5`}
    >
      {c.icon}
      {verdict}
    </div>
  );
};

export default VerdictBadge;
