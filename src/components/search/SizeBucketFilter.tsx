import { useSizeBuckets, formatBucketRange, type SizeBucket } from "@/hooks/useSizeBuckets";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Props {
  selectedCode?: string;
  onChange: (code: string | undefined) => void;
}

export function SizeBucketFilter({ selectedCode, onChange }: Props) {
  const { t } = useLanguage();
  const { data: buckets, isLoading, isError, error } = useSizeBuckets();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          {t("search.size.label")}
        </span>
        <div className="h-7 w-64 animate-pulse rounded-full bg-secondary/40" />
      </div>
    );
  }

  if (isError) {
    console.error("[SizeBucketFilter] Failed to load size buckets:", error);
    return (
      <div className="text-xs text-destructive">
        {t("search.size.loadError")}
      </div>
    );
  }

  if (!buckets || buckets.length === 0) {
    console.warn("[SizeBucketFilter] Buckets endpoint returned empty array");
    return null;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          {t("search.size.label")}
        </span>
        {buckets.map((b: SizeBucket) => {
          const isSelected = selectedCode === b.code;
          const description = t(`search.size.desc.${b.code.toLowerCase()}`);
          return (
            <Tooltip key={b.code}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onChange(isSelected ? undefined : b.code)}
                  className={cn(
                    "rounded-full border px-3 py-2 sm:py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:bg-secondary",
                  )}
                  aria-pressed={isSelected}
                >
                  <span className="font-semibold">{b.code}</span>
                  <span className="ml-1 opacity-80">· {formatBucketRange(b)}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[200px] text-xs">
                {description}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}