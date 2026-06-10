import { SystemClock } from "@/infrastructure/clock/system-clock";
import { AchievementProgressRepository } from "@/infrastructure/persistence/drizzle/repositories/achievement-progress.repository";
import { AdminAuditLogRepository } from "@/infrastructure/persistence/drizzle/repositories/admin-audit-log.repository";
import { AdminMetricsRepository } from "@/infrastructure/persistence/drizzle/repositories/admin-metrics.repository";
import { AssetDebtAllocationRepository } from "@/infrastructure/persistence/drizzle/repositories/asset-debt-allocation.repository";
import { AssetRepository } from "@/infrastructure/persistence/drizzle/repositories/asset.repository";
import { DebtAmountAdjustmentRepository } from "@/infrastructure/persistence/drizzle/repositories/debt-amount-adjustment.repository";
import { DebtPaymentRepository } from "@/infrastructure/persistence/drizzle/repositories/debt-payment.repository";
import { DebtRepository } from "@/infrastructure/persistence/drizzle/repositories/debt.repository";
import { EmailEventRepository } from "@/infrastructure/persistence/drizzle/repositories/email-event.repository";
import { EmailSendRepository } from "@/infrastructure/persistence/drizzle/repositories/email-send.repository";
import { EntityAttachmentRepository } from "@/infrastructure/persistence/drizzle/repositories/entity-attachment.repository";
import { EntityNoteRepository } from "@/infrastructure/persistence/drizzle/repositories/entity-note.repository";
import { ExchangeRateRepository } from "@/infrastructure/persistence/drizzle/repositories/exchange-rate.repository";
import { FinancialPlanningSettingsRepository } from "@/infrastructure/persistence/drizzle/repositories/financial-planning-settings.repository";
import { GoalContributionRepository } from "@/infrastructure/persistence/drizzle/repositories/goal-contribution.repository";
import { GoalSnapshotRepository } from "@/infrastructure/persistence/drizzle/repositories/goal-snapshot.repository";
import { GoalRepository } from "@/infrastructure/persistence/drizzle/repositories/goal.repository";
import { IncomeSettlementRepository } from "@/infrastructure/persistence/drizzle/repositories/income-settlement.repository";
import { IncomeRepository } from "@/infrastructure/persistence/drizzle/repositories/income.repository";
import { MagicLinkTokenRepository } from "@/infrastructure/persistence/drizzle/repositories/magic-link-token.repository";
import { McpAuditLogRepository } from "@/infrastructure/persistence/drizzle/repositories/mcp-audit-log.repository";
import { McpAuthorizationCodeRepository } from "@/infrastructure/persistence/drizzle/repositories/mcp-authorization-code.repository";
import { McpConnectionRepository } from "@/infrastructure/persistence/drizzle/repositories/mcp-connection.repository";
import { McpOauthClientRepository } from "@/infrastructure/persistence/drizzle/repositories/mcp-oauth-client.repository";
import { McpPendingActionRepository } from "@/infrastructure/persistence/drizzle/repositories/mcp-pending-action.repository";
import { McpTokenRepository } from "@/infrastructure/persistence/drizzle/repositories/mcp-token.repository";
import { McpUsageRepository } from "@/infrastructure/persistence/drizzle/repositories/mcp-usage.repository";
import { McpWriteIdempotencyRepository } from "@/infrastructure/persistence/drizzle/repositories/mcp-write-idempotency.repository";
import { ModuleProgressRepository } from "@/infrastructure/persistence/drizzle/repositories/module-progress.repository";
import { MonthClosingRepository } from "@/infrastructure/persistence/drizzle/repositories/month-closing.repository";
import { NotificationPreferencesRepository } from "@/infrastructure/persistence/drizzle/repositories/notification-preferences.repository";
import { NotificationRepository } from "@/infrastructure/persistence/drizzle/repositories/notification.repository";
import { OauthAccountRepository } from "@/infrastructure/persistence/drizzle/repositories/oauth-account.repository";
import { PaymentRepository } from "@/infrastructure/persistence/drizzle/repositories/payment.repository";
import { PlanRepository } from "@/infrastructure/persistence/drizzle/repositories/plan.repository";
import { PushSubscriptionRepository } from "@/infrastructure/persistence/drizzle/repositories/push-subscription.repository";
import { RecurringSettlementRepository } from "@/infrastructure/persistence/drizzle/repositories/recurring-settlement.repository";
import { SessionRepository } from "@/infrastructure/persistence/drizzle/repositories/session.repository";
import { StockCatalogRepository } from "@/infrastructure/persistence/drizzle/repositories/stock-catalog.repository";
import { SubscriptionRepository } from "@/infrastructure/persistence/drizzle/repositories/subscription.repository";
import { TransactionRepository } from "@/infrastructure/persistence/drizzle/repositories/transaction.repository";
import { UsageRepository } from "@/infrastructure/persistence/drizzle/repositories/usage.repository";
import { UserAchievementRepository } from "@/infrastructure/persistence/drizzle/repositories/user-achievement.repository";
import { UserActivityRepository } from "@/infrastructure/persistence/drizzle/repositories/user-activity.repository";
import { UserAvatarRepository } from "@/infrastructure/persistence/drizzle/repositories/user-avatar.repository";
import { UserCategoryRepository } from "@/infrastructure/persistence/drizzle/repositories/user-category.repository";
import { UserCredentialsRepository } from "@/infrastructure/persistence/drizzle/repositories/user-credentials.repository";
import { UserFxOverrideRepository } from "@/infrastructure/persistence/drizzle/repositories/user-fx-override.repository";
import { UserRepository } from "@/infrastructure/persistence/drizzle/repositories/user.repository";
import { WebhookEventRepository } from "@/infrastructure/persistence/drizzle/repositories/webhook-event.repository";

export const repos = {
  achievementProgress: new AchievementProgressRepository(),
  adminAuditLogs: new AdminAuditLogRepository(),
  adminMetrics: new AdminMetricsRepository(),
  assetDebtAllocations: new AssetDebtAllocationRepository(),
  assets: new AssetRepository(),
  debtAmountAdjustments: new DebtAmountAdjustmentRepository(),
  debtPayments: new DebtPaymentRepository(),
  debts: new DebtRepository(),
  emailEvents: new EmailEventRepository(),
  emailSends: new EmailSendRepository(),
  entityAttachments: new EntityAttachmentRepository(),
  entityNotes: new EntityNoteRepository(),
  exchangeRates: new ExchangeRateRepository(),
  financialPlanningSettings: new FinancialPlanningSettingsRepository(),
  goalContributions: new GoalContributionRepository(),
  goalSnapshots: new GoalSnapshotRepository(),
  goals: new GoalRepository(),
  incomeSettlements: new IncomeSettlementRepository(),
  incomes: new IncomeRepository(),
  magicLinkTokens: new MagicLinkTokenRepository(),
  mcpAuditLogs: new McpAuditLogRepository(),
  mcpAuthorizationCodes: new McpAuthorizationCodeRepository(),
  mcpConnections: new McpConnectionRepository(),
  mcpOauthClients: new McpOauthClientRepository(),
  mcpPendingActions: new McpPendingActionRepository(),
  mcpTokens: new McpTokenRepository(),
  mcpUsage: new McpUsageRepository(),
  mcpWriteIdempotency: new McpWriteIdempotencyRepository(),
  moduleProgress: new ModuleProgressRepository(),
  monthClosings: new MonthClosingRepository(),
  notificationPreferences: new NotificationPreferencesRepository(),
  notifications: new NotificationRepository(),
  oauthAccounts: new OauthAccountRepository(),
  payments: new PaymentRepository(),
  plans: new PlanRepository(),
  pushSubscriptions: new PushSubscriptionRepository(),
  recurringSettlements: new RecurringSettlementRepository(),
  sessions: new SessionRepository(),
  stockCatalog: new StockCatalogRepository(),
  subscriptions: new SubscriptionRepository(),
  transactions: new TransactionRepository(),
  usage: new UsageRepository(),
  userAchievements: new UserAchievementRepository(),
  userActivity: new UserActivityRepository(),
  userAvatars: new UserAvatarRepository(),
  userCategories: new UserCategoryRepository(),
  userCredentials: new UserCredentialsRepository(),
  userFxOverrides: new UserFxOverrideRepository(),
  users: new UserRepository(),
  webhookEvents: new WebhookEventRepository(),
} as const;

export const clock = new SystemClock();
