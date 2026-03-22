import { useState, useEffect } from "react";
import { Activity, RefreshCw } from "lucide-react";
import { auditService } from "@/services";
import type { AuditLogEntry } from "@/services/types";
import { useLanguage } from "@/i18n/LanguageContext";

export default function AdminAudit() {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { auditService.getAll().then(data => { setLogs(data); setLoading(false); }); }, []);

  const actionColor = (a: string) => {
    if (a.includes("confirmed") || a.includes("activated")) return "bg-success/10 text-success";
    if (a.includes("rejected") || a.includes("blocked") || a.includes("deactivated")) return "bg-destructive/10 text-destructive";
    if (a.includes("sent")) return "bg-info/10 text-info";
    return "bg-secondary text-muted-foreground";
  };

  if (loading) return <div className="flex items-center justify-center py-20"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t("admin.auditTitle")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("admin.auditDesc")}</p>
      {/* Mobile cards */}
      <div className="mt-4 space-y-2 md:hidden">
        {logs.map((log) => (
          <div key={log.id} className="rounded-xl border border-border p-3">
            <div className="flex items-center justify-between">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium font-mono ${actionColor(log.action)}`}>{log.action}</span>
              <span className="text-[10px] text-muted-foreground">{log.createdAt}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{log.actor} → {log.target}</p>
            {log.detail && <p className="mt-1 text-xs text-muted-foreground">{log.detail}</p>}
          </div>
        ))}
      </div>
      {/* Desktop list */}
      <div className="mt-6 hidden md:block space-y-2">
        {logs.map(log => (
          <div key={log.id} className="flex items-start gap-3 rounded-xl border border-border p-4">
            <div className="mt-0.5"><Activity className="h-4 w-4 text-muted-foreground" /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium font-mono ${actionColor(log.action)}`}>{log.action}</span>
                <span className="text-xs text-muted-foreground">→</span>
                <span className="text-xs font-medium">{log.target}</span>
              </div>
              {log.detail && <p className="mt-1 text-xs text-muted-foreground">{log.detail}</p>}
              <p className="mt-1 text-[10px] text-muted-foreground">{log.actor} · {log.createdAt}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
