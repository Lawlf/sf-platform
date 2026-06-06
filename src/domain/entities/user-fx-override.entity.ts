import type { Currency } from "@/domain/value-objects/money.vo";

export interface UserFxOverrideEntity {
  id: string;
  userId: string;
  fromCurrency: Currency;
  toCurrency: Currency;
  rateDecimal: string;
  createdAt: Date;
  updatedAt: Date;
}
