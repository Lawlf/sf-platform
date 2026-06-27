"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";
import { activeCategories } from "@/domain/categories/resolve-categories";

import type { CategoryCatalog } from "../../../_actions/category-queries";
import { categoryIcon } from "../../../_components/category-icons";
import { linkCostCategoryAction, unlinkCostCategoryAction } from "../_actions/cost-category.action";

interface LinkedCategory {
  key: string;
  label: string;
}

export function AssetCostCategoriesSection({
  assetId,
  noun,
  linked,
  catalog,
}: {
  assetId: string;
  noun: string;
  linked: LinkedCategory[];
  catalog: CategoryCatalog | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);

  const linkedKeys = new Set(linked.map((l) => l.key));
  const available = activeCategories(catalog?.expense ?? []).filter((c) => !linkedKeys.has(c.key));

  function add(categoryKey: string) {
    setPickerOpen(false);
    startTransition(async () => {
      const r = await linkCostCategoryAction({ assetId, categoryKey });
      if (!r.ok) {
        toast.error(r.message);
        return;
      }
      toast.success("Categoria ligada ao bem.");
      router.refresh();
    });
  }

  function remove(categoryKey: string) {
    startTransition(async () => {
      const r = await unlinkCostCategoryAction({ assetId, categoryKey });
      if (!r.ok) {
        toast.error(r.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
      <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">
        Gastos desse {noun}
      </h2>
      <p className="mt-1 text-[0.75rem] text-[color:var(--text-secondary)]">
        Ligue uma categoria e os gastos dela (combustível, IPVA, conserto) entram no custo total.
        Marca uma vez, vale pra sempre.
      </p>

      {linked.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {linked.map((c) => (
            <span
              key={c.key}
              className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--surface-2)] py-1 pl-3 pr-1.5 text-[0.8125rem] font-semibold text-[color:var(--text-primary)]"
            >
              {c.label}
              <button
                type="button"
                disabled={pending}
                onClick={() => remove(c.key)}
                aria-label={`Tirar ${c.label}`}
                className="focus-ring flex h-5 w-5 items-center justify-center rounded-full text-[color:var(--text-muted)] hover:bg-[color:var(--surface-1)] hover:text-[color:var(--text-primary)]"
              >
                <X size={13} strokeWidth={2.5} aria-hidden />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        disabled={pending || available.length === 0}
        onClick={() => setPickerOpen(true)}
        className="focus-ring mt-3 inline-flex items-center gap-1.5 rounded-lg text-[0.8125rem] font-semibold text-[color:var(--color-brand-500)] hover:underline disabled:opacity-50"
      >
        <Plus size={14} strokeWidth={2.5} aria-hidden />
        Ligar categoria
      </button>

      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent side="bottom" className="flex flex-col gap-3">
          <SheetHeader>
            <SheetTitle>Ligar uma categoria</SheetTitle>
          </SheetHeader>
          <Select onValueChange={add}>
            <SelectTrigger className="h-11 rounded-xl border-[1.5px]">
              <SelectValue placeholder="Escolha a categoria" />
            </SelectTrigger>
            <SelectContent>
              {available.map((c) => {
                const Icon = categoryIcon(c.icon);
                return (
                  <SelectItem key={c.key} value={c.key}>
                    <span className="flex items-center gap-2">
                      <Icon
                        size={15}
                        strokeWidth={2}
                        className="text-[color:var(--text-secondary)]"
                        aria-hidden
                      />
                      {c.label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </SheetContent>
      </Sheet>
    </section>
  );
}
