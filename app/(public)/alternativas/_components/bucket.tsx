/**
 * Balde animado em SVG (metáfora "o balde enchendo" = patrimônio crescendo).
 * Corpo translúcido para o líquido aparecer subindo, líquido com gradiente de
 * profundidade e onda contínua, brilho no vidro, borda elíptica e sombra na
 * base. Puro CSS: o líquido sobe no load (sf-bucket-rise) com onda
 * (sf-bucket-wave); respeita prefers-reduced-motion (fica cheio e parado).
 * Decorativo, por isso aria-hidden.
 */
export function Bucket({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 132"
      className={className}
      role="img"
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id="sf-bucket-liquid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f6ad45" />
          <stop offset="55%" stopColor="#ef7a1a" />
          <stop offset="100%" stopColor="#cf5f0e" />
        </linearGradient>
        <linearGradient id="sf-bucket-gloss" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <clipPath id="sf-bucket-inside">
          <path d="M22 24 L98 24 L86 106 Q60 117 34 106 Z" />
        </clipPath>
      </defs>

      {/* sombra na base */}
      <ellipse cx="60" cy="123" rx="32" ry="4.5" fill="rgba(31,29,28,0.10)" />

      {/* corpo translúcido */}
      <path d="M19 23 L101 23 L88 107 Q60 119 32 107 Z" fill="rgba(244,161,58,0.07)" />

      {/* líquido */}
      <g clipPath="url(#sf-bucket-inside)">
        <g className="sf-bucket-rise">
          <path
            className="sf-bucket-wave"
            fill="url(#sf-bucket-liquid)"
            d="M-40 46 q10 -6 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 L160 150 L-40 150 Z"
          />
        </g>
        {/* brilho no vidro */}
        <path
          d="M33 32 C27 60 29 88 37 104 L45 102 C38 86 37 60 43 34 Z"
          fill="url(#sf-bucket-gloss)"
        />
      </g>

      {/* contorno do corpo */}
      <path
        d="M19 23 L101 23 L88 107 Q60 119 32 107 Z"
        fill="none"
        stroke="var(--color-brand-700)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* borda / abertura */}
      <ellipse
        cx="60"
        cy="23"
        rx="41"
        ry="8.5"
        fill="rgba(253,248,243,0.55)"
        stroke="var(--color-brand-700)"
        strokeWidth="2.5"
      />
      <ellipse cx="60" cy="23" rx="33" ry="5.5" fill="none" stroke="rgba(207,95,14,0.35)" strokeWidth="1.5" />

      {/* alça */}
      <path
        d="M22 27 Q60 -7 98 27"
        fill="none"
        stroke="var(--color-brand-700)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
