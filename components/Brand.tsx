import { cn } from "@/lib/utils";

/** ADT-style octagon mark + wordmark. */
export function AdtLogo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 100 100" className="h-8 w-8" aria-hidden="true">
        <polygon
          points="30,6 70,6 94,30 94,70 70,94 30,94 6,70 6,30"
          fill={light ? "#ffffff" : "#012169"}
        />
        <text
          x="50"
          y="58"
          textAnchor="middle"
          fontSize="30"
          fontWeight="800"
          fontFamily="Arial, sans-serif"
          fill={light ? "#012169" : "#ffffff"}
        >
          ADT
        </text>
      </svg>
      <span className={cn("text-lg font-extrabold tracking-tight", light ? "text-white" : "text-adt-navy")}>
        Field Assessment
      </span>
    </span>
  );
}
