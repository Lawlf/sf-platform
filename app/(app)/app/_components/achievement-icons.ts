import {
  Award,
  CalendarCheck,
  CalendarHeart,
  CircleCheckBig,
  HeartPulse,
  LineChart,
  type LucideIcon,
  Map as MapIcon,
  Medal,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Wallet,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Sparkles,
  Map: MapIcon,
  Wallet,
  Target,
  LineChart,
  CircleCheckBig,
  HeartPulse,
  TrendingUp,
  CalendarCheck,
  CalendarHeart,
  Award,
  Medal,
  Trophy,
};

export function getAchievementIcon(name: string): LucideIcon {
  return ICONS[name] ?? Award;
}
