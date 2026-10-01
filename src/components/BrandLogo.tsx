import logoSymbol from "@/assets/ourmenuia-symbol.png";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5" aria-label="OurMenuIA">
      <img
        src={logoSymbol}
        alt=""
        className={compact ? "h-9 w-auto" : "h-16 w-auto"}
      />
      <span
        className={
          compact
            ? "text-lg font-semibold text-foreground"
            : "text-2xl font-semibold text-foreground"
        }
      >
        OurMenu<span className="text-primary">IA</span>
      </span>
    </div>
  );
}