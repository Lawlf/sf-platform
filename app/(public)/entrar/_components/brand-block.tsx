import { BrandLogo } from "@/app/components/icons/brand-logo";

export function BrandBlock() {
  return (
    <div className="relative mb-7 mt-9 text-center">
      <BrandLogo size={84} glow alt="" />
      <h1 className="mt-4 text-[20px] font-extrabold tracking-tight text-[color:var(--text-primary)]">
        Sabor Financeiro
      </h1>
      <div className="mt-1.5 text-[14px] font-medium text-[color:var(--text-secondary)]">
        O sabor de uma vida financeira saudável.
      </div>
    </div>
  );
}
