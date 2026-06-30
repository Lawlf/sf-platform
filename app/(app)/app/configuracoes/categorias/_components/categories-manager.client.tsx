"use client";

import { Archive, ArchiveRestore, ChevronDown, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/app/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";
import {
  FALLBACK_CATEGORY_SLUG,
  type CategoryDomain,
} from "@/domain/categories/default-categories";
import type { ResolvedCategory } from "@/domain/categories/resolve-categories";

import { categoryIcon } from "../../../_components/category-icons";
import { CreateCategorySheet } from "../../../_components/create-category-sheet.client";
import { wizardInputClass } from "@/ui/wizard-field";
import {
  renameCategoryAction,
  unarchiveCategoryAction,
} from "../_actions/category-actions";

import { ArchiveCategoryDialog } from "./archive-category-dialog.client";

const SOFT_CAP = 15;

const DOMAIN_TABS: ReadonlyArray<{
  domain: CategoryDomain;
  label: string;
  subtitle: string;
}> = [
  { domain: "expense", label: "Saídas", subtitle: "Usadas em lançamentos e dívidas" },
  { domain: "inflow", label: "Entradas", subtitle: "Usadas em lançamentos avulsos" },
];

const SEGMENT_TRACK =
  "grid grid-cols-2 gap-1.5 rounded-xl border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-1.5";
const SEGMENT_BASE =
  "focus-ring inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-[0.8125rem] font-semibold transition-all";

function segmentClass(active: boolean): string {
  if (!active) {
    return `${SEGMENT_BASE} border-transparent text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]`;
  }
  return `${SEGMENT_BASE} border-[color:var(--color-brand-500)]/55 bg-[color:var(--color-brand-500)]/16 text-[color:var(--color-brand-500)] shadow-sm`;
}

interface Props {
  expense: ResolvedCategory[];
  inflow: ResolvedCategory[];
  isPro: boolean;
}

export function CategoriesManager({ expense, inflow, isPro }: Props) {
  const router = useRouter();
  const [domain, setDomain] = useState<CategoryDomain>("expense");
  const [showPaywall, setShowPaywall] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [renaming, setRenaming] = useState<ResolvedCategory | null>(null);
  const [archiving, setArchiving] = useState<ResolvedCategory | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [unarchivePending, startUnarchiveTransition] = useTransition();

  const tab = DOMAIN_TABS.find((t) => t.domain === domain) ?? DOMAIN_TABS[0]!;
  const categories = domain === "expense" ? expense : inflow;
  const active = categories.filter((c) => !c.archived);
  const archived = categories.filter((c) => c.archived);

  function guardPro(run: () => void) {
    if (!isPro) {
      setShowPaywall(true);
      return;
    }
    run();
  }

  function handleUnarchive(c: ResolvedCategory) {
    guardPro(() => {
      startUnarchiveTransition(async () => {
        const result = await unarchiveCategoryAction({ domain, key: c.key });
        if (!result.ok) {
          toast.error(result.message);
          return;
        }
        toast.success("Categoria desarquivada.");
        router.refresh();
      });
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Tipo de categoria" className={SEGMENT_TRACK}>
        {DOMAIN_TABS.map((t) => (
          <button
            key={t.domain}
            type="button"
            aria-pressed={domain === t.domain}
            onClick={() => {
              setDomain(t.domain);
              setShowArchived(false);
            }}
            className={segmentClass(domain === t.domain)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-end justify-between">
        <p className="text-[0.75rem] text-[color:var(--text-secondary)]">{tab.subtitle}</p>
        <button
          type="button"
          onClick={() => guardPro(() => setShowCreate(true))}
          className="focus-ring inline-flex items-center gap-1.5 rounded-lg text-[0.8125rem] font-semibold text-[color:var(--color-brand-500)] hover:underline"
        >
          <Plus size={14} strokeWidth={2.5} aria-hidden />
          Criar categoria
        </button>
      </div>

      {active.length >= SOFT_CAP ? (
        <p className="text-[0.75rem] leading-relaxed text-[color:var(--text-secondary)]">
          Com muita categoria, o resumo do mês fica picado. Menos fatias, leitura mais fácil.
        </p>
      ) : null}

      <ul className="flex flex-col overflow-hidden rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] backdrop-blur-xl">
        {active.map((c) => {
          const Icon = categoryIcon(c.icon);
          return (
            <li
              key={c.key}
              className="flex items-center gap-3 border-b border-[color:var(--border-soft)] px-4 py-3 last:border-b-0"
            >
              <Icon
                size={17}
                strokeWidth={2}
                className="shrink-0 text-[color:var(--text-secondary)]"
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate text-[0.875rem] font-medium text-[color:var(--text-primary)]">
                {c.label}
              </span>
              <button
                type="button"
                aria-label={`Renomear ${c.label}`}
                onClick={() => guardPro(() => setRenaming(c))}
                className="focus-ring rounded-md p-1.5 text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
              >
                <Pencil size={15} strokeWidth={2} aria-hidden />
              </button>
              {c.key !== FALLBACK_CATEGORY_SLUG ? (
                <button
                  type="button"
                  aria-label={`Arquivar ${c.label}`}
                  onClick={() => guardPro(() => setArchiving(c))}
                  className="focus-ring rounded-md p-1.5 text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
                >
                  <Archive size={15} strokeWidth={2} aria-hidden />
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>

      {archived.length > 0 ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            aria-expanded={showArchived}
            className="focus-ring inline-flex w-fit items-center gap-1.5 rounded-lg text-[0.8125rem] font-semibold text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
          >
            <ChevronDown
              size={14}
              strokeWidth={2.25}
              className={`transition-transform ${showArchived ? "rotate-180" : ""}`}
              aria-hidden
            />
            Arquivadas ({archived.length})
          </button>
          {showArchived ? (
            <>
              <p className="text-[0.75rem] leading-relaxed text-[color:var(--text-secondary)]">
                Arquivada não aparece mais na hora de lançar. O que você já registrou continua no
                histórico.
              </p>
              <ul className="flex flex-col overflow-hidden rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] backdrop-blur-xl">
                {archived.map((c) => {
                  const Icon = categoryIcon(c.icon);
                  return (
                    <li
                      key={c.key}
                      className="flex items-center gap-3 border-b border-[color:var(--border-soft)] px-4 py-3 opacity-70 last:border-b-0"
                    >
                      <Icon
                        size={17}
                        strokeWidth={2}
                        className="shrink-0 text-[color:var(--text-muted)]"
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate text-[0.875rem] font-medium text-[color:var(--text-secondary)]">
                        {c.label}
                      </span>
                      <button
                        type="button"
                        aria-label={`Desarquivar ${c.label}`}
                        disabled={unarchivePending}
                        onClick={() => handleUnarchive(c)}
                        className="focus-ring inline-flex items-center gap-1.5 rounded-md p-1.5 text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
                      >
                        <ArchiveRestore size={15} strokeWidth={2} aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}

      <Sheet open={showPaywall} onOpenChange={setShowPaywall}>
        <SheetContent side="bottom" className="flex flex-col gap-4">
          <SheetHeader>
            <SheetTitle>As categorias prontas cobrem o básico do mês.</SheetTitle>
            <SheetDescription>
              No Pro, você cria as suas: Pet, Filhos, Dízimo, o que o seu mês tiver.
            </SheetDescription>
          </SheetHeader>
          <Button asChild variant="brand">
            <Link href="/app/configuracoes/planos">Conhecer o Pro</Link>
          </Button>
        </SheetContent>
      </Sheet>

      <CreateCategorySheet
        open={showCreate}
        onOpenChange={setShowCreate}
        domain={domain}
        isPro={isPro}
        activeCount={active.length}
        paywallVariant="fria"
        onCreated={() => {
          toast.success("Categoria criada.");
          router.refresh();
        }}
      />

      {renaming ? (
        <RenameCategoryDialog
          domain={domain}
          category={renaming}
          onClose={() => setRenaming(null)}
          onRenamed={() => {
            setRenaming(null);
            toast.success("Categoria renomeada.");
            router.refresh();
          }}
        />
      ) : null}

      {archiving ? (
        <ArchiveCategoryDialog
          domain={domain}
          category={archiving}
          destinations={active.filter((c) => c.key !== archiving.key)}
          onClose={() => setArchiving(null)}
          onArchived={() => {
            setArchiving(null);
            toast.success("Categoria arquivada.");
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function RenameCategoryDialog({
  domain,
  category,
  onClose,
  onRenamed,
}: {
  domain: CategoryDomain;
  category: ResolvedCategory;
  onClose: () => void;
  onRenamed: () => void;
}) {
  const [name, setName] = useState(category.label);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleRename() {
    setError(null);
    startTransition(async () => {
      const result = await renameCategoryAction({ domain, key: category.key, name });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onRenamed();
    });
  }

  return (
    <Sheet open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <SheetContent side="bottom" className="flex flex-col gap-4">
        <SheetHeader>
          <SheetTitle>Renomear categoria</SheetTitle>
          <SheetDescription>
            O que você já registrou em {category.label} acompanha o novo nome.
          </SheetDescription>
        </SheetHeader>
        <input
          type="text"
          autoComplete="off"
          maxLength={24}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleRename();
            }
          }}
          className={wizardInputClass}
        />
        {error ? (
          <p role="alert" className="text-sm text-[color:var(--semantic-negative)]">
            {error}
          </p>
        ) : null}
        <Button type="button" variant="brand" loading={pending} onClick={handleRename}>
          Salvar nome
        </Button>
      </SheetContent>
    </Sheet>
  );
}
