import type { PushSubscriptionEntity } from "@/domain/entities/push-subscription.entity";

export interface PushSubscriptionRepository {
  findByEndpoint(endpoint: string): Promise<PushSubscriptionEntity | null>;
  listForUser(userId: string): Promise<PushSubscriptionEntity[]>;
  upsert(input: {
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent: string | null;
  }): Promise<PushSubscriptionEntity>;
  touchLastSeen(endpoint: string, at: Date): Promise<void>;
  deleteByEndpoint(endpoint: string): Promise<void>;
  deleteForUser(userId: string): Promise<void>;
}
