import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileText, UploadCloud, Loader2, CheckCircle, AlertTriangle, XCircle,
  Copy, Eye, Check,
} from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/i18n/LanguageContext";
import { useImpersonatedSupplierId } from "@/hooks/useImpersonatedSupplierId";
import { withSupplier } from "@/lib/withSupplier";
import { toast } from "sonner";

// ─── Types (mirror design spec §7) ───────────────────────────────────────────

interface VocabularyEntry {
  token: string;
  label: string;
}

interface TemplateSummary {
  id: string;
  name?: string;
  isActive?: boolean;
}

interface TemplateListResponse {
  templates: TemplateSummary[];
  activeId: string | null;
  vocabulary: VocabularyEntry[];
}

interface DetectedToken {
  token: string;
  recognized: boolean;
}

interface UploadResult {
  templateId: string;
  detectedTokens: DetectedToken[];
  unknownTokens: string[];
  warnings: string[];
}

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export default function ProviderContractTemplate({ supplierId: supplierIdProp }: { supplierId?: string } = {}) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const impersonated = useImpersonatedSupplierId();
  const supplierId = supplierIdProp ?? impersonated;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [activating, setActivating] = useState(false);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["provider-contract-template", supplierId],
    queryFn: () =>
      apiClient.get<TemplateListResponse>(
        withSupplier("/provider/contract-template", supplierId)
      ),
    retry: false,
  });

  const vocabulary = listQuery.data?.vocabulary ?? [];
  const activeId = listQuery.data?.activeId ?? null;
  const templates = listQuery.data?.templates ?? [];
  const hasUnknownTokens = (uploadResult?.unknownTokens.length ?? 0) > 0;

  // ── Upload ──
  const handleFile = async (file: File) => {
    const isDocx =
      file.type === DOCX_MIME || file.name.toLowerCase().endsWith(".docx");
    if (!isDocx) {
      toast.error(t("provider.contract.wrongType"));
      return;
    }
    setUploading(true);
    setUploadResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const result = await apiClient.postForm<UploadResult>(
        withSupplier("/provider/contract-template", supplierId),
        form
      );
      setUploadResult(result);
      qc.invalidateQueries({ queryKey: ["provider-contract-template", supplierId] });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("provider.contract.uploadFailed");
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = ""; // allow re-selecting the same file
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  // ── Preview ──
  const handlePreview = async (templateId: string) => {
    setPreviewingId(templateId);
    try {
      const { blob, json } = await apiClient.fetchBinary(
        withSupplier(`/provider/contract-template/${templateId}/preview`, supplierId),
        { method: "POST" }
      );
      if (blob) {
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank", "noopener,noreferrer");
        // Revoke after a delay so the new tab has time to load it.
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } else if (json?.url) {
        window.open(json.url, "_blank", "noopener,noreferrer");
      } else {
        toast.error(t("provider.contract.previewFailed"));
      }
    } catch {
      toast.error(t("provider.contract.previewFailed"));
    } finally {
      setPreviewingId(null);
    }
  };

  // ── Activate ──
  const handleActivate = async (templateId: string) => {
    if (hasUnknownTokens) {
      toast.error(t("provider.contract.activateBlocked"));
      return;
    }
    setActivating(true);
    try {
      await apiClient.post(
        withSupplier(`/provider/contract-template/${templateId}/activate`, supplierId),
        {}
      );
      toast.success(t("provider.contract.activated"));
      setUploadResult(null);
      qc.invalidateQueries({ queryKey: ["provider-contract-template", supplierId] });
    } catch (err: unknown) {
      // 409 → unknown tokens still present server-side.
      const message =
        err instanceof Error ? err.message : t("provider.contract.activateFailed");
      toast.error(message);
    } finally {
      setActivating(false);
    }
  };

  const copyToken = async (token: string) => {
    const text = `{{${token}}}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken((c) => (c === token ? null : c)), 1500);
    } catch {
      // Clipboard unavailable — no-op
    }
  };

  const recognized = uploadResult?.detectedTokens.filter((d) => d.recognized) ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6 text-accent" />
          {t("provider.contract.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          {t("provider.contract.subtitle")}
        </p>
      </div>

      {/* Active template state */}
      <div className="rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {activeId ? (
            <>
              <CheckCircle className="h-4 w-4 text-accent" />
              {t("provider.contract.activeTemplate")}
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                {templates.find((x) => x.id === activeId)?.name ||
                  t("provider.contract.activeBadge")}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground font-normal">
              {t("provider.contract.noActiveTemplate")}
            </span>
          )}
        </div>
      </div>

      {/* Upload dropzone */}
      <div>
        <h2 className="mb-2 text-sm font-semibold">
          {t("provider.contract.uploadTitle")}
        </h2>
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
          }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-accent ${
            dragOver
              ? "border-accent bg-accent/5"
              : "border-border bg-card hover:border-accent/50"
          }`}
        >
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 text-accent animate-spin" />
              <p className="text-sm text-muted-foreground">
                {t("provider.contract.uploading")}
              </p>
            </>
          ) : (
            <>
              <UploadCloud className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {t("provider.contract.uploadHint")}
              </p>
              <span className="mt-1 inline-flex items-center rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium">
                {t("provider.contract.uploadButton")}
              </span>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx"
            className="hidden"
            onChange={onInputChange}
          />
        </div>
      </div>

      {/* Validation result */}
      {uploadResult && (
        <div className="space-y-4 rounded-xl border border-border p-4">
          {/* Recognized */}
          {recognized.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-accent">
                <CheckCircle className="h-4 w-4" />
                {t("provider.contract.recognizedTokens")} ({recognized.length})
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {recognized.map((d) => (
                  <code
                    key={d.token}
                    className="rounded bg-accent/10 px-2 py-0.5 text-xs font-mono text-accent"
                  >{`{{${d.token}}}`}</code>
                ))}
              </div>
            </div>
          )}

          {/* Unknown — hard error */}
          {uploadResult.unknownTokens.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                <XCircle className="h-4 w-4" />
                {t("provider.contract.unknownTokens")} ({uploadResult.unknownTokens.length})
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("provider.contract.unknownTokensHint")}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {uploadResult.unknownTokens.map((tok) => (
                  <code
                    key={tok}
                    className="rounded bg-destructive/10 px-2 py-0.5 text-xs font-mono text-destructive"
                  >{`{{${tok}}}`}</code>
                ))}
              </div>
            </div>
          )}

          {/* Warnings — soft */}
          {uploadResult.warnings.length > 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-warning">
                <AlertTriangle className="h-4 w-4" />
                {t("provider.contract.warnings")}
              </div>
              <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">
                {uploadResult.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {recognized.length === 0 && uploadResult.unknownTokens.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("provider.contract.noTokens")}
            </p>
          )}

          {/* Actions for the just-uploaded template */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePreview(uploadResult.templateId)}
              disabled={previewingId === uploadResult.templateId}
            >
              {previewingId === uploadResult.templateId ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Eye className="mr-2 h-4 w-4" />
              )}
              {t("provider.contract.preview")}
            </Button>
            <Button
              size="sm"
              onClick={() => handleActivate(uploadResult.templateId)}
              disabled={activating || hasUnknownTokens}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              title={hasUnknownTokens ? t("provider.contract.activateBlocked") : undefined}
            >
              {activating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("provider.contract.activate")}
            </Button>
            {hasUnknownTokens && (
              <span className="text-xs text-destructive">
                {t("provider.contract.activateBlocked")}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Token cheat-sheet */}
      <div>
        <h2 className="mb-1 text-sm font-semibold">
          {t("provider.contract.cheatSheet")}
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          {t("provider.contract.cheatSheetHint")}
        </p>
        {listQuery.isLoading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">
                    {t("provider.contract.token")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    {t("provider.contract.description")}
                  </th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {vocabulary.map((v) => (
                  <tr key={v.token} className="border-t border-border">
                    <td className="px-3 py-2">
                      <code className="font-mono text-xs text-accent">{`{{${v.token}}}`}</code>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{v.label}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => copyToken(v.token)}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        {copiedToken === v.token ? (
                          <><Check className="h-3 w-3 text-accent" />{t("provider.contract.copied")}</>
                        ) : (
                          <><Copy className="h-3 w-3" />{t("provider.contract.copyToken")}</>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Uploaded templates list */}
      {templates.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold">
            {t("provider.contract.uploadedTemplates")}
          </h2>
          <div className="space-y-2">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3"
              >
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{tpl.name || tpl.id}</span>
                  {tpl.id === activeId && (
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                      {t("provider.contract.activeBadge")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreview(tpl.id)}
                    disabled={previewingId === tpl.id}
                  >
                    {previewingId === tpl.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Eye className="mr-2 h-4 w-4" />
                    )}
                    {t("provider.contract.preview")}
                  </Button>
                  {tpl.id !== activeId && (
                    <Button
                      size="sm"
                      onClick={() => handleActivate(tpl.id)}
                      disabled={activating}
                      className="bg-accent text-accent-foreground hover:bg-accent/90"
                    >
                      {t("provider.contract.activate")}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
