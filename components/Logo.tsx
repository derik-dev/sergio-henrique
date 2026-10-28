import { PRODUCT_NAME } from "@/lib/brand";

/** Ícone: campo visto de cima em traço fino, com um ponto de destaque (o "lance"). */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#0d1114" stroke="rgba(255,255,255,.16)" />
      <rect x="6" y="7" width="20" height="18" rx="2" stroke="#3ddc97" strokeWidth="1.5" />
      <path d="M16 7v18" stroke="#3ddc97" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="3.2" stroke="#3ddc97" strokeWidth="1.5" />
      <circle cx="21.5" cy="12" r="1.6" fill="#f3f6f4" />
    </svg>
  );
}

/** Logotipo: ícone + wordmark em SVG (o texto vem de PRODUCT_NAME). */
export function Logo({ size = 28 }: { size?: number }) {
  const width = 64 + PRODUCT_NAME.length * 13;
  return (
    <span className="inline-flex items-center gap-2.5" aria-label={PRODUCT_NAME}>
      <LogoMark size={size} />
      <svg width={width - 36} height={size} viewBox={`0 0 ${width - 36} ${size}`} role="img" aria-hidden="true">
        <text
          x="0"
          y={size * 0.72}
          fill="#f3f6f4"
          fontSize={size * 0.62}
          fontWeight="800"
          letterSpacing={size * 0.11}
          fontFamily="var(--font-geist-sans), system-ui, sans-serif"
        >
          {PRODUCT_NAME}
        </text>
      </svg>
    </span>
  );
}
