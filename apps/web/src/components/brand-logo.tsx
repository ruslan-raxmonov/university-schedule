import { cn } from "@/lib/utils";

type Props = {
  size?: number;
  className?: string;
  priority?: boolean;
  withWordmark?: boolean;
  wordmarkClassName?: string;
  light?: boolean;
};

export function BrandLogo({
  size = 40,
  className,
  priority = false,
  withWordmark = false,
  wordmarkClassName,
  light = false,
}: Props) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full",
          light && "bg-white p-0.5 shadow-md",
        )}
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/renessans-logo.svg"
          alt="Renessans Ta’lim Universiteti"
          width={size}
          height={size}
          className="h-full w-full rounded-full object-contain"
          {...(priority ? { fetchPriority: "high" as const } : {})}
        />
      </span>
      {withWordmark ? (
        <div className={cn("min-w-0 leading-tight", wordmarkClassName)}>
          <p
            className={cn(
              "font-display text-sm font-bold tracking-tight",
              light ? "text-white" : "text-[var(--ink)]",
            )}
          >
            Renessans
          </p>
          <p
            className={cn(
              "text-[11px] font-medium uppercase tracking-[0.14em]",
              light ? "text-[var(--gold-soft)]" : "text-[var(--maroon)]",
            )}
          >
            Jadval
          </p>
        </div>
      ) : null}
    </div>
  );
}
