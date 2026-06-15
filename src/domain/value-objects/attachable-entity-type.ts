export const ATTACHABLE_ENTITY_TYPES = [
  "debt",
  "debt_payment",
  "income",
  "goal",
  "account",
  "transaction",
] as const;

export type AttachableEntityType = (typeof ATTACHABLE_ENTITY_TYPES)[number];

export function isAttachableEntityType(value: string): value is AttachableEntityType {
  return (ATTACHABLE_ENTITY_TYPES as readonly string[]).includes(value);
}
