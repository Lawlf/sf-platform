import type { ProfileType } from "@/domain/entities/profile.entity";

export type Ctx = ProfileType;

export type CopyValue = string | ({ default: string } & Partial<Record<Ctx, string>>);

export type Catalog = Record<string, CopyValue>;

export function pick(value: CopyValue, ctx: Ctx): string {
  if (typeof value === "string") return value;
  return value[ctx] ?? value.default;
}

export function makeT<C extends Catalog>(catalog: C, ctx: Ctx) {
  return (key: keyof C & string): string => pick(catalog[key]!, ctx);
}
