"use client";

import { useState } from "react";

import { Button } from "@/app/components/ui/button";

export interface ScheduleRow {
  month: number;
  installment: string;
  principal: string;
  interest: string;
  remainingBalance: string;
}

export function ScheduleRender({ installments }: { installments: ScheduleRow[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible =
    expanded || installments.length <= 24
      ? installments
      : [...installments.slice(0, 12), ...installments.slice(-6)];

  const showsEllipsis = !expanded && installments.length > 24;

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-12 gap-1 text-xs opacity-60">
        <span className="col-span-2">Mês</span>
        <span className="col-span-3 text-right">Parcela</span>
        <span className="col-span-3 text-right">Principal</span>
        <span className="col-span-2 text-right">Juros</span>
        <span className="col-span-2 text-right">Saldo</span>
      </div>
      {visible.map((row, idx) => (
        <div key={row.month}>
          {showsEllipsis && idx === 12 ? (
            <div className="my-2 text-center text-xs opacity-50">...</div>
          ) : null}
          <div className="grid grid-cols-12 gap-1 text-xs">
            <span className="col-span-2">{row.month}</span>
            <span className="col-span-3 text-right">{row.installment}</span>
            <span className="col-span-3 text-right">{row.principal}</span>
            <span className="col-span-2 text-right">{row.interest}</span>
            <span className="col-span-2 text-right">{row.remainingBalance}</span>
          </div>
        </div>
      ))}
      {installments.length > 24 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 self-center"
        >
          {expanded ? "Mostrar menos" : `Ver todas (${installments.length})`}
        </Button>
      ) : null}
    </div>
  );
}
