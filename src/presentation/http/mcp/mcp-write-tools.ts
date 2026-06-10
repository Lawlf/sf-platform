import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import {
  confirmMcpAction,
  type ConfirmMcpActionDeps,
} from "@/application/use-cases/mcp/confirm-mcp-action.use-case";
import {
  performMcpWrite,
  type PerformMcpWriteDeps,
  type PerformMcpWriteOutput,
} from "@/application/use-cases/mcp/perform-mcp-write.use-case";
import { findWriteAction } from "@/domain/mcp/write-actions";
import { CURRENCIES } from "@/domain/value-objects/money.vo";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { clock, repos } from "@/infrastructure/container";
import { DomainError } from "@/shared/errors/domain-error";
import { isErr } from "@/shared/errors/result";

import { text } from "./mcp-response";
import { assertScope, enforceUsageOrThrow, requireCtxFromExtra } from "./require-mcp-context";

function errorText(message: string) {
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: message }],
  };
}

function writeDeps(): PerformMcpWriteDeps {
  return {
    executor: {
      incomes: repos.incomes,
      debts: repos.debts,
      payments: repos.debtPayments,
      allocations: repos.assetDebtAllocations,
      assets: repos.assets,
      goals: repos.goals,
      transactions: repos.transactions,
      userCategories: repos.userCategories,
      clock,
    },
    audit: repos.mcpAuditLogs,
    pending: repos.mcpPendingActions,
    idempotency: repos.mcpWriteIdempotency,
    clock,
  };
}

function confirmDeps(): ConfirmMcpActionDeps {
  return {
    executor: {
      incomes: repos.incomes,
      debts: repos.debts,
      payments: repos.debtPayments,
      allocations: repos.assetDebtAllocations,
      assets: repos.assets,
      goals: repos.goals,
      transactions: repos.transactions,
      userCategories: repos.userCategories,
      clock,
    },
    audit: repos.mcpAuditLogs,
    pending: repos.mcpPendingActions,
    hasher: new WebCryptoHasher(),
    clock,
  };
}

function presentWriteOutput(out: PerformMcpWriteOutput): ReturnType<typeof text> {
  if (out.kind === "needs_confirmation") {
    return text({
      status: "needs_confirmation",
      mensagem:
        "Esta ação precisa de confirmação. Reveja o preview abaixo e, se estiver correto, chame a ferramenta mcp_confirm com o confirmationToken retornado.",
      confirmationToken: out.confirmationToken,
      expiraEmSegundos: out.expiresInSec,
      preview: out.preview,
    });
  }
  return text({ status: "executed", auditId: out.auditId, resultado: out.result });
}

const idempotencyKey = z.string().optional();
const cents = z.number().int().positive();
const isoDate = z.string();
const currency = z.enum(CURRENCIES).optional();

const incomeFrequency = z.enum(["monthly", "weekly", "one_off"]);
const recurringFrequency = z.enum(["monthly", "weekly", "annual"]);
const expenseCategory = z
  .string()
  .min(1)
  .max(64)
  .describe(
    "Slug da categoria de despesa (moradia, contas, mercado, alimentacao, transporte, saude, assinaturas, educacao, lazer, compras, outros) ou id de categoria criada pelo usuário.",
  );

const debtCreateShape = {
  kind: z.enum(["financing", "personal_loan", "credit_card", "overdraft", "recurring"]),
  label: z.string().min(1).max(120),
  notes: z.string().max(1000).nullish(),
  startDate: isoDate.optional(),
  expectedEndDate: isoDate.optional(),
  originalPrincipalCents: z.number().int().positive().optional(),
  annualInterestRate: z.number().min(0).optional(),
  termMonths: z.number().int().positive().optional(),
  amortizationMethod: z.enum(["PRICE", "SAC"]).optional(),
  monthlyInsuranceCents: z.number().int().nonnegative().optional(),
  monthlyAdminFeeCents: z.number().int().nonnegative().optional(),
  monthlyInstallmentCents: z.number().int().positive().optional(),
  creditLimitCents: z.number().int().positive().optional(),
  currentStatementCents: z.number().int().nonnegative().optional(),
  statementDay: z.number().int().min(1).max(31).optional(),
  dueDay: z.number().int().min(1).max(31).optional(),
  revolvingBalanceCents: z.number().int().nonnegative().optional(),
  revolvingMonthlyRate: z.number().min(0).nullish(),
  installmentPurchases: z.array(z.record(z.string(), z.unknown())).optional(),
  currentBalanceCents: z.number().int().nonnegative().optional(),
  bankName: z.string().min(1).max(120).optional(),
  monthlyRate: z.number().min(0).optional(),
  recurringFrequency: recurringFrequency.optional(),
  recurringAmountCents: z.number().int().positive().optional(),
  expenseCategory: expenseCategory.optional(),
  endDate: isoDate.optional(),
  currency,
  idempotencyKey,
};

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function maxOf(...values: unknown[]): number {
  return values.reduce<number>((acc, v) => Math.max(acc, num(v)), 0);
}

function debtCreateMax(args: Record<string, unknown>): number {
  return maxOf(
    args.originalPrincipalCents,
    args.monthlyInstallmentCents,
    args.creditLimitCents,
    args.currentStatementCents,
    args.revolvingBalanceCents,
    args.currentBalanceCents,
    args.recurringAmountCents,
  );
}

function debtUpdateMax(args: Record<string, unknown>): number {
  return maxOf(
    args.currentBalanceCents,
    args.monthlyInstallmentCents,
    args.creditLimitCents,
    args.currentStatementCents,
    args.recurringAmountCents,
  );
}

export function registerMcpWriteTools(server: McpServer): void {
  const scopeFor = (toolName: string) => {
    const action = findWriteAction(toolName);
    if (!action) throw new Error(`Ferramenta de escrita desconhecida: ${toolName}`);
    return action.scope;
  };

  async function runWrite(
    extra: unknown,
    toolName: string,
    args: Record<string, unknown>,
    maxAmountCents: number,
    key?: string,
  ): Promise<ReturnType<typeof text>> {
    try {
      const ctx = requireCtxFromExtra(extra);
      assertScope(ctx, scopeFor(toolName));
      await enforceUsageOrThrow(ctx);
      const out = await performMcpWrite(writeDeps(), {
        ctx,
        toolName,
        args,
        maxAmountCents,
        ...(key !== undefined && { idempotencyKey: key }),
      });
      return presentWriteOutput(out);
    } catch (error) {
      if (error instanceof DomainError) return errorText(error.message);
      throw error;
    }
  }

  server.registerTool(
    "income_create",
    {
      description: "Registra uma nova renda (salário, aluguel, etc.).",
      inputSchema: {
        label: z.string().min(1).max(120),
        amountCents: cents,
        frequency: incomeFrequency,
        startDate: isoDate,
        endDate: isoDate.optional(),
        currency,
        idempotencyKey,
      },
    },
    async (args, extra) =>
      runWrite(extra, "income_create", args, args.amountCents, args.idempotencyKey),
  );

  server.registerTool(
    "income_update",
    {
      description: "Atualiza uma renda existente.",
      inputSchema: {
        incomeId: z.string().min(1),
        label: z.string().min(1).max(120).optional(),
        amountCents: cents.optional(),
        frequency: incomeFrequency.optional(),
        startDate: isoDate.optional(),
        endDate: isoDate.optional(),
        currency,
        idempotencyKey,
      },
    },
    async (args, extra) =>
      runWrite(extra, "income_update", args, num(args.amountCents), args.idempotencyKey),
  );

  server.registerTool(
    "income_delete",
    {
      description: "Remove uma renda. Requer confirmação.",
      inputSchema: { incomeId: z.string().min(1), idempotencyKey },
    },
    async (args, extra) => runWrite(extra, "income_delete", args, 0, args.idempotencyKey),
  );

  server.registerTool(
    "transaction_create",
    {
      description:
        "Registra um gasto avulso do usuário (ex.: 'gastei 40 no café'). Opcional, detalha pra onde foi o dinheiro.",
      inputSchema: {
        amountCents: cents,
        description: z.string().min(1).max(200),
        category: z.string().min(1).max(60).optional(),
        occurredAt: isoDate.optional(),
        currency,
        idempotencyKey,
      },
    },
    async (args, extra) =>
      runWrite(extra, "transaction_create", args, args.amountCents, args.idempotencyKey),
  );

  server.registerTool(
    "debt_create",
    {
      description:
        "Registra uma nova dívida. O campo kind define os campos esperados: financing, personal_loan, credit_card, overdraft ou recurring.",
      inputSchema: debtCreateShape,
    },
    async (args, extra) =>
      runWrite(extra, "debt_create", args, debtCreateMax(args), args.idempotencyKey),
  );

  server.registerTool(
    "debt_update",
    {
      description: "Atualiza campos de uma dívida existente.",
      inputSchema: {
        debtId: z.string().min(1),
        label: z.string().min(1).max(120).optional(),
        notes: z.string().max(1000).nullish(),
        expectedEndDate: isoDate.optional(),
        currentBalanceCents: z.number().int().nonnegative().optional(),
        annualInterestRate: z.number().min(0).optional(),
        monthlyInstallmentCents: z.number().int().positive().optional(),
        creditLimitCents: z.number().int().positive().optional(),
        currentStatementCents: z.number().int().nonnegative().optional(),
        statementDay: z.number().int().min(1).max(31).optional(),
        dueDay: z.number().int().min(1).max(31).optional(),
        bankName: z.string().min(1).max(120).optional(),
        recurringAmountCents: z.number().int().positive().optional(),
        recurringFrequency: recurringFrequency.optional(),
        currency,
        idempotencyKey,
      },
    },
    async (args, extra) =>
      runWrite(extra, "debt_update", args, debtUpdateMax(args), args.idempotencyKey),
  );

  server.registerTool(
    "debt_delete",
    {
      description: "Remove uma dívida. Requer confirmação.",
      inputSchema: { debtId: z.string().min(1), idempotencyKey },
    },
    async (args, extra) => runWrite(extra, "debt_delete", args, 0, args.idempotencyKey),
  );

  server.registerTool(
    "asset_create",
    {
      description: "Registra um novo bem ou ativo (imóvel, veículo, investimento, etc.).",
      inputSchema: {
        category: z.string().min(1),
        label: z.string().min(1).max(120),
        currentValueCents: cents,
        purchasePriceCents: z.number().int().positive().optional(),
        metadata: z.record(z.string(), z.unknown()).nullish(),
        fipeCode: z.string().nullish(),
        acquiredAt: isoDate.optional(),
        currency,
        idempotencyKey,
      },
    },
    async (args, extra) =>
      runWrite(
        extra,
        "asset_create",
        args,
        maxOf(args.currentValueCents, args.purchasePriceCents),
        args.idempotencyKey,
      ),
  );

  server.registerTool(
    "asset_update",
    {
      description: "Atualiza um bem ou ativo existente.",
      inputSchema: {
        assetId: z.string().min(1),
        label: z.string().min(1).max(120).optional(),
        currentValueCents: cents.optional(),
        metadata: z.record(z.string(), z.unknown()).nullish(),
        fipeCode: z.string().nullish(),
        acquiredAt: isoDate.optional(),
        currency,
        idempotencyKey,
      },
    },
    async (args, extra) =>
      runWrite(extra, "asset_update", args, num(args.currentValueCents), args.idempotencyKey),
  );

  server.registerTool(
    "asset_delete",
    {
      description: "Remove um bem ou ativo. Requer confirmação.",
      inputSchema: { assetId: z.string().min(1), idempotencyKey },
    },
    async (args, extra) => runWrite(extra, "asset_delete", args, 0, args.idempotencyKey),
  );

  server.registerTool(
    "goal_create",
    {
      description: "Cria uma nova meta financeira.",
      inputSchema: {
        type: z.string().min(1),
        title: z.string().min(1).max(120),
        targetCents: z.number().int().positive().nullish(),
        deadline: isoDate.nullish(),
        linkedDebtId: z.string().nullish(),
        linkedAssetId: z.string().nullish(),
        targetMonths: z.number().int().positive().nullish(),
        fundingMode: z.string().nullish(),
        manualSavedCents: z.number().int().nonnegative().nullish(),
        monthlyCostCents: z.number().int().nonnegative().nullish(),
        realReturnPct: z.number().nullish(),
        idempotencyKey,
      },
    },
    async (args, extra) =>
      runWrite(
        extra,
        "goal_create",
        args,
        maxOf(args.targetCents, args.manualSavedCents, args.monthlyCostCents),
        args.idempotencyKey,
      ),
  );

  server.registerTool(
    "goal_update",
    {
      description: "Atualiza uma meta financeira existente.",
      inputSchema: {
        goalId: z.string().min(1),
        title: z.string().min(1).max(120).optional(),
        status: z.string().optional(),
        targetCents: z.number().int().positive().nullish(),
        deadline: isoDate.nullish(),
        linkedDebtId: z.string().nullish(),
        linkedAssetId: z.string().nullish(),
        targetMonths: z.number().int().positive().nullish(),
        fundingMode: z.string().nullish(),
        manualSavedCents: z.number().int().nonnegative().nullish(),
        monthlyCostCents: z.number().int().nonnegative().nullish(),
        realReturnPct: z.number().nullish(),
        idempotencyKey,
      },
    },
    async (args, extra) =>
      runWrite(
        extra,
        "goal_update",
        args,
        maxOf(args.targetCents, args.manualSavedCents, args.monthlyCostCents),
        args.idempotencyKey,
      ),
  );

  server.registerTool(
    "goal_delete",
    {
      description: "Remove uma meta financeira. Requer confirmação.",
      inputSchema: { goalId: z.string().min(1), idempotencyKey },
    },
    async (args, extra) => runWrite(extra, "goal_delete", args, 0, args.idempotencyKey),
  );

  server.registerTool(
    "mcp_confirm",
    {
      description:
        "Confirma uma ação de escrita pendente usando o confirmationToken devolvido por uma ferramenta anterior.",
      inputSchema: { confirmationToken: z.string().min(1) },
    },
    async (args, extra) => {
      const ctx = requireCtxFromExtra(extra);
      await enforceUsageOrThrow(ctx);
      const result = await confirmMcpAction(confirmDeps(), {
        ctx,
        confirmationToken: args.confirmationToken,
      });
      if (isErr(result)) return errorText(result.error.message);
      return text({
        status: "executed",
        auditId: result.value.auditId,
        resultado: result.value.result,
      });
    },
  );
}
