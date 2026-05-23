/**
 * Subscription Web Push armazenada por device. Um usuário pode ter várias
 * (celular, desktop, outro browser). Cada subscription é identificada pelo
 * endpoint único do push service (FCM no Android, APNS no iOS, Mozilla, etc).
 */
export interface PushSubscriptionEntity {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
  lastSeenAt: Date;
  createdAt: Date;
}

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}
