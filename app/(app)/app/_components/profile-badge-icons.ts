import {
  Activity,
  Anchor,
  Bird,
  CalendarClock,
  Compass,
  Crown,
  Flame,
  Gem,
  Leaf,
  type LucideIcon,
  Moon,
  Mountain,
  Rocket,
  Scale,
  Shield,
  Sparkles,
  Star,
  Sun,
  Waves,
  Zap,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Activity,
  Anchor,
  Bird,
  CalendarClock,
  Compass,
  Crown,
  Flame,
  Gem,
  Leaf,
  Moon,
  Mountain,
  Rocket,
  Scale,
  Shield,
  Sparkles,
  Star,
  Sun,
  Waves,
  Zap,
};

export function getProfileBadgeIcon(name: string): LucideIcon {
  return ICONS[name] ?? Sparkles;
}
