import {
  AlertTriangle,
  Award,
  Flame,
  Star,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import type { StoryIconName } from "@/domain/services/story-detection.service";

const ICONS: Record<StoryIconName, LucideIcon> = {
  AlertTriangle,
  Award,
  Flame,
  Star,
  Target,
  TrendingUp,
};

export function getIcon(name: StoryIconName | string): LucideIcon {
  if (name in ICONS) return ICONS[name as StoryIconName];
  return Star;
}
