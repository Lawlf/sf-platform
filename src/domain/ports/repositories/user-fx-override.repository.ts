import type { UserFxOverrideEntity } from "@/domain/entities/user-fx-override.entity";
import type { Currency } from "@/domain/value-objects/money.vo";

export interface UserFxOverrideRepository {
  find(
    userId: string,
    fromCurrency: Currency,
    toCurrency: Currency,
  ): Promise<UserFxOverrideEntity | null>;
  upsert(
    override: Omit<UserFxOverrideEntity, "id" | "createdAt" | "updatedAt">,
  ): Promise<UserFxOverrideEntity>;
  remove(userId: string, fromCurrency: Currency, toCurrency: Currency): Promise<void>;
  listForUser(userId: string): Promise<UserFxOverrideEntity[]>;
}
