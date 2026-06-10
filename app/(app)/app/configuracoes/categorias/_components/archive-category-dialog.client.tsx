"use client";

import { useEffect, useState, useTransition } from "react";

import { Button } from "@/app/components/ui/button";
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";
import { Skeleton } from "@/app/components/ui/skeleton";
import type { CategoryDomain } from "@/domain/categories/default-categories";
import type { ResolvedCategory } from "@/domain/categories/resolve-categories";

import { categoryUsageQuery } from "../../../_actions/category-queries";
import { categoryIcon } from "../../../_components/category-icons";
import { archiveCategoryAction } from "../_actions/category-actions";

interface Props {
  domain: CategoryDomain;
  category: ResolvedCategory;
  destinations: ResolvedCategory[];
  onClose: () => void;
  onArchived: () => void;
}

function usageSentence(label: string, transactions: number, debts: number): string {
  const parts: string[] = [];
  if (transactions > 0) {
    parts.push(`${transactions} ${transactions === 1 ? "lançamento" : "lançamentos"}`);
  }
  if (debts > 0) {
    parts.push(`${debts} ${debts === 1 ? "dívida" : "dívidas"}`);
  }
  return `Você tem ${parts.join(" e ")} em ${label}. Pra onde eles vão?`;
}

export function ArchiveCategoryDialog({
  domain,
  category,
  destinations,
  onClose,
  onArchived,
}: Props) {
  const [usage, setUsage] = useState<{ transactions: number; debts: number } | null>(null);
  const [destinationKey, setDestinationKey] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    void categoryUsageQuery(domain, category.key).then((result) => {
      if (active) setUsage(result);
    });
    return () => {
      active = false;
    };
  }, [domain, category.key]);

  const total = usage ? usage.transactions + usage.debts : 0;
  const needsDestination = usage !== null && total > 0;

  function handleArchive() {
    setError(null);
    if (needsDestination && !destinationKey) {
      setError("Escolha pra onde os itens vão.");
      return;
    }
    startTransition(async () => {
      const result = await archiveCategoryAction({
        domain,
        key: category.key,
        destinationKey: needsDestination ? destinationKey : null,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onArchived();
    });
  }

  return (
    <Sheet open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <SheetContent side="bottom" className="flex flex-col gap-4">
        <SheetHeader>
          <SheetTitle>Arquivar {category.label}?</SheetTitle>
          <SheetDescription>
            Não aparece mais na hora de lançar. O que você já registrou continua no histórico.
          </SheetDescription>
        </SheetHeader>

        {usage === null ? (
          <Skeleton className="h-11 w-full rounded-xl" />
        ) : total > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-[color:var(--text-primary)]">
              {usageSentence(category.label, usage.transactions, usage.debts)}
            </p>
            <Select value={destinationKey} onValueChange={setDestinationKey}>
              <SelectTrigger className="h-11 rounded-xl border-[1.5px]">
                <SelectValue placeholder="Escolher categoria" />
              </SelectTrigger>
              <SelectContent>
                {destinations.map((c) => {
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
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-[color:var(--semantic-negative)]">
            {error}
          </p>
        ) : null}

        <Button
          type="button"
          variant="brand"
          loading={pending}
          disabled={usage === null}
          onClick={handleArchive}
        >
          {needsDestination ? "Mover e arquivar" : "Arquivar"}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
