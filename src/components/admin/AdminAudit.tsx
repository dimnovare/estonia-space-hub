import { useMemo, useState } from "react";
import { RefreshCw, Activity, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { auditService, type AuditLogFilters } from "@/services";
import { queryKeys } from "@/services/queryKeys";
import type { AuditLogEntry } from "@/services/types";
import { useLanguage } from "@/i18n/LanguageContext";
import { useDebounce } from "@/hooks/useDebounce";

type TagTone = "ok" | "danger" | "warn" | "info" | "neutral";

const TONE_CLASS: Record<TagTone, string> = {
  ok: "bg-success/10 text-success",
  danger: "bg-destructive/10 text-destructive",
  warn: "bg-warning/10 text-warning-text",
  info: "bg-info/10 text-info",
  neutral: "bg-secondary text-muted-foreground",
};

const DOT_CLASS: Record<TagTone, string> = {
  ok: "bg-success",
  danger: "bg-destructive",
  warn: "bg-warning",
  info: "bg-info",
  neutral: "bg-teal",
};

function actionTone(a: string): TagTone {
  if (a.includes("confirmed") || a.includes("activated") || a.includes("verified") || a.includes("approved") || a.includes("published") || a.includes("founding-granted")) return "ok";
  if (a.includes("rejected") || a.includes("blocked") || a.includes("deactivated") || a.includes("unverified") || a.includes("declined") || a.includes("founding-revoked")) return "danger";
  if (a.includes("priority-changed")) return "warn";
  if (a.includes("sent") || a.includes("captured") || a.includes("toggle")) return "info";
  return "neutral";
}

export default function AdminAudit() {
  const { t } = useLanguage();
  const [tone, setTone] = useState<TagTone | "all">("all");

  // Server-side filter inputs
  const [actorInput, setActorInput] = useState("");
  const [actionInput, setActionInput] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const actor = useDebounce(actorInput, 400);
  const action = useDebounce(actionInput, 400);
  const target = useDebounce(targetInput, 400);

  const filters = useMemo<AuditLogFilters>(
    () => ({
      actor: actor.trim() || undefined,
      action: action.trim() || undefined,
      target: target.trim() || undefined,
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(to).toISOString() : undefined,
    }),
    [actor, action, target, from, to],
  );

  const hasFilters = Boolean(
    actorInput || actionInput || targetInput || from || to,
  );

  const clearFilters = () => {
    setActorInput("");
    setActionInput("");
    setTargetInput("");
    setFrom("");
    setTo("");
  };

  const {
    data: result = { data: [] as AuditLogEntry[], total: 0 },
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery<{ data: AuditLogEntry[]; total: number }>({
    queryKey: [...queryKeys.auditLog.all(), filters],
    queryFn: () => auditService.getAll(filters),
    staleTime: 30_000,
    retry: 2,
  });

  const logs = result.data;

  const toneFilters: { value: TagTone | "all"; labelKey: string }[] = [
    { value: "all", labelKey: "admin.audit.filterAll" },
    { value: "ok", labelKey: "admin.audit.filterSuccess" },
    { value: "info", labelKey: "admin.audit.filterActivity" },
    { value: "warn", labelKey: "admin.audit.filterChange" },
    { value: "danger", labelKey: "admin.audit.filterRemoval" },
  ];

  const visible = useMemo(
    () => (tone === "all" ? logs : logs.filter((l) => actionTone(l.action) === tone)),
    [logs, tone],
  );

  const fieldInp =
    "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent";

  if (isError)
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <p className="text-sm text-muted-foreground">{t("admin.auditLoadError")}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          {t("common.retry")}
        </Button>
      </div>
    );

  return (
    <div>
      {/* Page head */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="font-mono-label text-[11.5px] uppercase tracking-[0.2em] text-teal-deep">
            {t("admin.audit.eyebrow")}
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold text-navy-ink md:text-[28px]">
            {t("admin.auditTitle")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("admin.auditDesc")}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-11 gap-2"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          {t("admin.audit.refresh")}
        </Button>
      </div>

      {/* Server-side filter controls */}
      <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <input
          value={actorInput}
          onChange={(e) => setActorInput(e.target.value)}
          placeholder={t("admin.audit.filterActor")}
          aria-label={t("admin.audit.filterActor")}
          className={fieldInp}
        />
        <input
          value={actionInput}
          onChange={(e) => setActionInput(e.target.value)}
          placeholder={t("admin.audit.filterAction")}
          aria-label={t("admin.audit.filterAction")}
          className={fieldInp}
        />
        <input
          value={targetInput}
          onChange={(e) => setTargetInput(e.target.value)}
          placeholder={t("admin.audit.filterTarget")}
          aria-label={t("admin.audit.filterTarget")}
          className={fieldInp}
        />
        <div className="flex items-center gap-2">
          <label className="shrink-0 text-xs font-medium text-muted-foreground">
            {t("admin.audit.filterFrom")}
          </label>
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
            aria-label={t("admin.audit.filterFrom")}
            className={fieldInp}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="shrink-0 text-xs font-medium text-muted-foreground">
            {t("admin.audit.filterTo")}
          </label>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
            aria-label={t("admin.audit.filterTo")}
            className={fieldInp}
          />
        </div>
        {hasFilters && (
          <Button
            variant="outline"
            size="sm"
            className="h-auto gap-1.5 self-center justify-self-start"
            onClick={clearFilters}
          >
            <X className="h-3.5 w-3.5" />
            {t("admin.clearFilter")}
          </Button>
        )}
      </div>

      {/* Filter chips */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {toneFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setTone(f.value)}
            aria-pressed={tone === f.value}
            className={`min-h-[36px] rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              tone === f.value
                ? "bg-navy-ink text-white"
                : "border border-line-2 bg-card text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            {t(f.labelKey)}
          </button>
        ))}
      </div>

      {/* Timeline card */}
      <div className="mt-5 rounded-[14px] border border-border bg-card p-2 shadow-card sm:p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-[54px] w-[54px] items-center justify-center rounded-2xl bg-secondary">
              <Activity className="h-[26px] w-[26px] text-muted-foreground" />
            </div>
            <h3 className="font-display text-lg font-semibold text-navy-ink">
              {t("admin.audit.emptyTitle")}
            </h3>
            <p className="max-w-xs text-sm text-muted-foreground">{t("admin.audit.emptyDesc")}</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((log) => {
              const tn = actionTone(log.action);
              return (
                <li
                  key={log.id}
                  className="group flex gap-3 rounded-[10px] px-3 py-3.5 transition-colors hover:bg-secondary/40 sm:px-4"
                >
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${DOT_CLASS[tn]}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium ${TONE_CLASS[tn]}`}
                      >
                        {log.action}
                      </span>
                      <span className="text-muted-foreground/60">→</span>
                      <span className="truncate text-sm font-semibold text-navy-ink">{log.target}</span>
                    </div>
                    {log.detail && (
                      <p className="mt-1 text-[13px] text-muted-foreground">{log.detail}</p>
                    )}
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                      {log.createdAt} · {log.actor}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
