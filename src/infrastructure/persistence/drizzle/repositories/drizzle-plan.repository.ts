import { and, asc, eq } from "drizzle-orm";

import type { Plan } from "@/domain/entities/plan.entity";
import type { PaymentProvider } from "@/domain/entities/subscription.entity";
import type { PlanRepository } from "@/domain/ports/repositories/plan.repository";

import { getDb } from "../client";
import { type PlanRow, plans } from "../schema/plans.schema";

function toEntity(row: PlanRow): Plan {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    provider: row.provider,
    providerProductId: row.providerProductId,
    providerPriceId: row.providerPriceId,
    priceCents: row.priceCents,
    currency: row.currency,
    billingInterval: row.billingInterval,
    features: Array.isArray(row.features) ? (row.features as string[]) : [],
    active: row.active,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzlePlanRepository implements PlanRepository {
  async findBySlug(slug: string): Promise<Plan | null> {
    const rows = await getDb().select().from(plans).where(eq(plans.slug, slug)).limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async findByProviderPriceId(
    provider: PaymentProvider,
    providerPriceId: string,
  ): Promise<Plan | null> {
    const rows = await getDb()
      .select()
      .from(plans)
      .where(and(eq(plans.provider, provider), eq(plans.providerPriceId, providerPriceId)))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async findActive(): Promise<Plan[]> {
    const rows = await getDb()
      .select()
      .from(plans)
      .where(eq(plans.active, true))
      .orderBy(asc(plans.sortOrder));
    return rows.map(toEntity);
  }
}
