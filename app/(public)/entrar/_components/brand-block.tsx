import { BrandLogo } from "@/app/components/icons/brand-logo";

export function BrandBlock() {
  return (
    <div className="relative mb-7 mt-9 text-center">
      <BrandLogo size={84} glow />
      <div className="mt-4 text-[20px] font-extrabold tracking-tight text-[color:var(--color-brand-900)]">
        Sabor Financeiro
      </div>
      <div className="mt-1.5 text-[14px] font-medium text-[color:var(--color-brand-800)]">
        O sabor de uma vida financeira saudável.
      </div>
    </div>
  );
}
