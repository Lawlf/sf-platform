import { revalidatePath } from "next/cache";

export const REVALIDATE_GROUPS = {
  home: ["/app"],
  timeline: ["/app/linha-do-tempo"],
  report: ["/app/linha-do-tempo/relatorio"],
  debts: ["/app/dividas"],
  assets: ["/app/patrimonio"],
  incomes: ["/app/renda"],
  goals: ["/app/metas"],
  notifications: ["/app/notificacoes"],
  notificationPrefs: ["/app/perfil/notificacoes"],
  billing: ["/app/configuracoes/planos"],
  profile: ["/app/perfil"],
  content: ["/app/conteudo/trilha"],
  mei: ["/app/mei"],
  household: ["/app/lar"],
} as const;

export type RevalidateGroup = keyof typeof REVALIDATE_GROUPS;

export function revalidateGroups(groups: readonly RevalidateGroup[]): void {
  const paths = new Set<string>(groups.flatMap((g) => [...REVALIDATE_GROUPS[g]]));
  for (const p of paths) revalidatePath(p);
}
