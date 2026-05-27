import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { resolveQuickAccess } from "./quick-access/catalog";
import { QuickAccessScroller } from "./quick-access/quick-access-scroller.client";

export async function QuickAccessRow() {
  const user = await requireUser();
  const items = resolveQuickAccess(user.quickAccess);
  if (items.length === 0) return null;

  return (
    <section aria-label="Acessos rápidos" className="min-w-0">
      <h2 className="mb-2 px-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
        Acessos rápidos
      </h2>
      <QuickAccessScroller items={items} />
    </section>
  );
}
