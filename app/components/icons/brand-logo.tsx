import Image from "next/image";

export interface BrandLogoProps {
  size?: number;
  glow?: boolean;
  className?: string;
}

export function BrandLogo({ size = 64, glow = false, className }: BrandLogoProps) {
  const containerSize = size * 2;
  return (
    <span
      className={`relative inline-flex items-center justify-center ${className ?? ""}`}
      style={{ width: containerSize, height: containerSize }}
    >
      {glow ? (
        <span
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(242, 142, 37, 0.42) 0%, rgba(242, 142, 37, 0.18) 35%, transparent 70%)",
          }}
        />
      ) : null}
      <Image
        src="/icons/icon-512.png"
        alt="Sabor Financeiro"
        width={size}
        height={size}
        priority
        className="relative"
        style={{
          filter: glow ? undefined : "drop-shadow(0 12px 22px rgba(239, 122, 26, 0.35))",
        }}
      />
    </span>
  );
}
