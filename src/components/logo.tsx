import { cn } from "@/lib/utils";

/**
 * THE ANANTA ARC PAWS badge — the real attached artwork (public/logo.png),
 * used everywhere in the console. No substitutes.
 */
export function Logo({
  size = 28,
  className,
  withText = false,
}: {
  size?: number;
  className?: string;
  withText?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="ANANTA ARC PAWS"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0 select-none"
        draggable={false}
      />
      {withText && (
        <span className="whitespace-nowrap text-[15px] font-extrabold tracking-tight text-text-primary">
          PAWS Console
        </span>
      )}
    </span>
  );
}
