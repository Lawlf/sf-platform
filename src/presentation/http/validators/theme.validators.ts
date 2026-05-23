import { z } from "zod";

export const themeSchema = z.enum(["light", "dark", "system"]);
export type ThemePreference = z.infer<typeof themeSchema>;

export const colorblindSchema = z.enum(["on", "off"]);
export type ColorblindPreference = z.infer<typeof colorblindSchema>;

export const textSizeSchema = z.enum(["14", "15", "16", "17", "18", "20"]);
export type TextSize = z.infer<typeof textSizeSchema>;

export const densitySchema = z.enum(["compact", "cozy", "comfortable"]);
export type Density = z.infer<typeof densitySchema>;

export const motionSchema = z.enum(["full", "reduce"]);
export type Motion = z.infer<typeof motionSchema>;

export const contrastSchema = z.enum(["normal", "high"]);
export type Contrast = z.infer<typeof contrastSchema>;

export interface A11yPrefs {
  textsize: TextSize;
  density: Density;
  motion: Motion;
  contrast: Contrast;
}

export const a11yKeySchema = z.enum(["textsize", "density", "motion", "contrast"]);
export type A11yKey = z.infer<typeof a11yKeySchema>;
