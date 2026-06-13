import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckCircle, Loader2, X, Download, FileText, ShieldCheck, Info, Smartphone } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { apiClient } from "@/services/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";

type Template = { id: string; name: string };

interface Props {
  bookingId: string;
  onComplete: () => void;
  onClose: () => void;
}

// ─── Dokobit signing sub-component ───────────────────────────────────────────

interface DokobitFlowProps {
  bookingId: string;
  templateId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function DokobitSigningFrame({ signingUrl }: { signingUrl: string }) {
  return (
    <iframe
      id="isign-gateway"
      title="Dokobit signing"
      src={signingUrl}
      className="h-[65vh] min-h-[520px] w-full rounded-lg border border-border bg-white"
      allow="publickey-credentials-get *; publickey-credentials-create *"
    />
  );
}

function DokobitSigningFlow({
  bookingId,
  templateId,
  onSuccess,
  onCancel,
}: DokobitFlowProps) {
  const { t } = useLanguage();
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "initiating" | "pending" | "completed" | "cancelled" | "error">("idle");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  // Optional personal ID code — fills {{tenant_id_code}} in the contract body at render
  // time. Signing still works if left blank (the verified code is captured post-sign).
  const [idCode, setIdCode] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // Clean up on unmount
  useEffect(() => () => stopPolling(), []);

  const initiateMutation = useMutation({
    mutationFn: async () => {
      // Spec §7: POST /contracts/dokobit/initiate { bookingId, contractTemplateId? }
      const trimmedIdCode = idCode.trim();
      return apiClient.post<{ signingUrl: string; signingToken: string }>(
        "/contracts/dokobit/initiate",
        {
          bookingId,
          ...(templateId ? { contractTemplateId: templateId } : {}),
          ...(trimmedIdCode ? { signerIdCode: trimmedIdCode } : {}),
        }
      );
    },
    onSuccess: (data) => {
      setSigningUrl(data.signingUrl);
      setStatus("pending");
      // Poll status as a fallback (backend postback also flips the status).
      pollRef.current = setInterval(async () => {
        try {
          const result = await apiClient.get<{ status: string }>(
            `/contracts/dokobit/${data.signingToken}/status`
          );
          if (result.status === "completed") {
            stopPolling();
            setStatus("completed");
          } else if (result.status === "cancelled") {
            stopPolling();
            setStatus("cancelled");
          } else if (result.status === "error") {
            stopPolling();
            setStatus("error");
          }
          // any other status (pending/…) → keep polling
        } catch {
          // Network hiccup — keep polling
        }
      }, 3000);
    },
    onError: (err: unknown) => {
      setStatus("error");
      const message = err instanceof Error ? err.message : t("error.generic");
      toast.error(message);
    },
  });

  const handleInitiate = () => {
    setStatus("initiating");
    setDownloadError(false);
    initiateMutation.mutate();
  };

  const handleDownloadSigned = async () => {
    setDownloading(true);
    setDownloadError(false);
    try {
      // Spec §7: GET /contracts/{bookingId}/download → { url }
      const result = await apiClient.get<{ url: string }>(
        `/contracts/${bookingId}/download`
      );
      if (result?.url) {
        window.open(result.url, "_blank", "noopener,noreferrer");
      } else {
        setDownloadError(true);
      }
    } catch {
      setDownloadError(true);
    } finally {
      setDownloading(false);
    }
  };

  // ── Completed — success state with download link ──
  if (status === "completed") {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <CheckCircle className="h-12 w-12 text-accent" />
        <div className="text-center">
          <p className="text-base font-semibold">{t("contract.dokobit.completedTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            {t("contract.dokobit.completedDesc")}
          </p>
        </div>
        <Button
          onClick={handleDownloadSigned}
          disabled={downloading}
          variant="outline"
          className="w-full max-w-xs"
        >
          {downloading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {downloading
            ? t("contract.dokobit.preparingDownload")
            : t("contract.dokobit.downloadSigned")}
        </Button>
        {downloadError && (
          <p className="text-xs text-destructive">{t("contract.dokobit.downloadFailed")}</p>
        )}
        <Button
          onClick={onSuccess}
          className="bg-accent text-accent-foreground hover:bg-accent/90 w-full max-w-xs"
        >
          {t("common.close") || "Close"}
        </Button>
      </div>
    );
  }

  // ── Pending — waiting for the signature on Dokobit's page ──
  if (status === "pending") {
    return (
      <div className="flex flex-col items-center gap-3 py-2">
        <p className="text-sm text-center text-muted-foreground max-w-lg">
          {t("contract.dokobit.openedHint")}
        </p>
        {signingUrl && <DokobitSigningFrame signingUrl={signingUrl} />}
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t("contract.dokobit.waiting")}
        </p>
        <Button variant="ghost" size="sm" onClick={() => { stopPolling(); setStatus("cancelled"); }}>
          {t("common.cancel") || "Cancel"}
        </Button>
      </div>
    );
  }

  // ── Cancelled ──
  if (status === "cancelled") {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="text-center">
          <p className="text-sm font-medium">{t("contract.dokobit.cancelledTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("contract.dokobit.cancelledDesc")}</p>
        </div>
        <Button variant="outline" onClick={() => setStatus("idle")}>
          {t("contract.dokobit.tryAgain")}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>{t("common.cancel") || "Cancel"}</Button>
      </div>
    );
  }

  // ── Error ──
  if (status === "error") {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="text-center">
          <p className="text-sm font-medium text-destructive">{t("contract.dokobit.errorTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("contract.dokobit.errorDesc")}</p>
        </div>
        <Button variant="outline" onClick={() => setStatus("idle")}>
          {t("contract.dokobit.tryAgain")}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>{t("common.cancel") || "Cancel"}</Button>
      </div>
    );
  }

  // ── Idle / initiating — start the flow ──
  // Light validation only: digits, reasonable length. Never hard-blocks signing —
  // the field is optional and the verified code is captured post-sign regardless.
  const trimmedIdCode = idCode.trim();
  const idCodeLooksOff =
    trimmedIdCode.length > 0 && !/^\d{7,20}$/.test(trimmedIdCode);

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <ShieldCheck className="h-12 w-12 text-accent" />
      <p className="text-sm text-center text-muted-foreground max-w-sm">
        {t("contract.dokobit.intro")}
      </p>

      {/* Optional personal ID code — fills {{tenant_id_code}} in the contract body. */}
      <div className="w-full max-w-xs">
        <label className="text-xs font-medium">{t("contract.idCodeLabel")}</label>
        <input
          className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
          placeholder={t("contract.idCodePlaceholder")}
          maxLength={20}
          inputMode="numeric"
          value={idCode}
          onChange={(e) => setIdCode(e.target.value)}
          disabled={status === "initiating"}
        />
        <p className={`mt-1 text-xs ${idCodeLooksOff ? "text-destructive" : "text-muted-foreground"}`}>
          {t("contract.idCodeHelp")}
        </p>
      </div>

      <Button
        onClick={handleInitiate}
        disabled={status === "initiating"}
        className="bg-accent text-accent-foreground hover:bg-accent/90 w-full max-w-xs"
      >
        {status === "initiating" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {status === "initiating" ? t("contract.dokobit.opening") : t("contract.dokobit.start")}
      </Button>
      <Button variant="ghost" size="sm" onClick={onCancel}>
        {t("common.cancel") || "Cancel"}
      </Button>
    </div>
  );
}

// ─── Smart-ID / Mobile-ID signing sub-component ──────────────────────────────

type SmartIdMethod = "smartid" | "mobileid";

interface SmartIdFlowProps {
  bookingId: string;
  smartIdEnabled: boolean;
  mobileIdEnabled: boolean;
  onSuccess: (verifiedName: string, personalCode: string, sessionId: string, method: SmartIdMethod) => void;
  onCancel: () => void;
}

function SmartIdSigningFlow({
  bookingId,
  smartIdEnabled,
  mobileIdEnabled,
  onSuccess,
  onCancel,
}: SmartIdFlowProps) {
  const { t } = useLanguage();

  // Step A: form
  // Step B: verification code + polling
  // Step C: terminal states handled inline via status
  type FlowStep = "form" | "polling";
  const [flowStep, setFlowStep] = useState<FlowStep>("form");
  const [selectedMethod, setSelectedMethod] = useState<SmartIdMethod>(
    smartIdEnabled ? "smartid" : "mobileid"
  );
  const [personalCode, setPersonalCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const [pollStatus, setPollStatus] = useState<"pending" | "completed" | "failed" | "expired">("pending");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => () => stopPolling(), []);

  const startMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post<{ sessionId: string; verificationCode: string }>(
        "/contracts/identity/start",
        {
          bookingId,
          method: selectedMethod,
          personalCode: personalCode.trim(),
          ...(selectedMethod === "mobileid" ? { phoneNumber: phoneNumber.trim() } : {}),
        }
      );
    },
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setVerificationCode(data.verificationCode);
      setPollStatus("pending");
      setFlowStep("polling");

      // Poll every 2 seconds
      pollRef.current = setInterval(async () => {
        try {
          const result = await apiClient.get<{
            status: "pending" | "completed" | "failed" | "expired";
            verifiedName?: string;
            personalCode?: string;
          }>(`/contracts/identity/${data.sessionId}`);

          setPollStatus(result.status);

          if (result.status === "completed") {
            stopPolling();
            onSuccess(
              result.verifiedName ?? "",
              result.personalCode ?? personalCode.trim(),
              data.sessionId,
              selectedMethod
            );
          } else if (result.status === "failed" || result.status === "expired") {
            stopPolling();
          }
        } catch {
          // Network hiccup — keep polling
        }
      }, 2000);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : t("error.generic");
      toast.error(message);
    },
  });

  const handleStart = () => {
    if (!personalCode.trim()) return;
    if (selectedMethod === "mobileid" && !phoneNumber.trim()) return;
    startMutation.mutate();
  };

  const handleRetry = () => {
    stopPolling();
    setSessionId(null);
    setVerificationCode(null);
    setPollStatus("pending");
    setFlowStep("form");
  };

  // ── Step A: method selection + form ──
  if (flowStep === "form") {
    return (
      <div className="flex flex-col gap-4 py-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-accent shrink-0" />
          <p className="text-sm text-muted-foreground">{t("contract.smartId.intro")}</p>
        </div>

        {/* Method selector */}
        <div className="flex gap-2">
          {smartIdEnabled && (
            <button
              type="button"
              onClick={() => setSelectedMethod("smartid")}
              disabled={startMutation.isPending}
              className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent ${
                selectedMethod === "smartid"
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-card text-foreground hover:border-accent/50"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Smart-ID
            </button>
          )}
          {mobileIdEnabled && (
            <button
              type="button"
              onClick={() => setSelectedMethod("mobileid")}
              disabled={startMutation.isPending}
              className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent ${
                selectedMethod === "mobileid"
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-card text-foreground hover:border-accent/50"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Mobile-ID
            </button>
          )}
        </div>

        {/* Personal code */}
        <div>
          <label className="text-xs font-medium">{t("contract.smartId.personalCode")}</label>
          <input
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
            placeholder="38501010000"
            maxLength={20}
            value={personalCode}
            onChange={(e) => setPersonalCode(e.target.value)}
            disabled={startMutation.isPending}
          />
        </div>

        {/* Phone number — Mobile-ID only */}
        {selectedMethod === "mobileid" && (
          <div>
            <label className="text-xs font-medium">{t("contract.smartId.phoneNumber")}</label>
            <input
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
              placeholder="+37260000000"
              maxLength={20}
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={startMutation.isPending}
            />
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            onClick={handleStart}
            disabled={
              startMutation.isPending ||
              !personalCode.trim() ||
              (selectedMethod === "mobileid" && !phoneNumber.trim())
            }
            className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {startMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("contract.smartId.startVerification")}
          </Button>
          <Button variant="ghost" onClick={onCancel} disabled={startMutation.isPending}>
            {t("common.cancel") || "Cancel"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Step B / C: polling + terminal states ──
  if (pollStatus === "completed") {
    // Parent handles this via onSuccess callback — show brief success state
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <CheckCircle className="h-10 w-10 text-accent" />
        <p className="text-sm text-center font-medium">{t("contract.smartId.verified")}</p>
      </div>
    );
  }

  if (pollStatus === "failed" || pollStatus === "expired") {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <p className="text-sm text-destructive text-center">
          {pollStatus === "expired"
            ? t("contract.smartId.sessionExpired")
            : t("contract.smartId.verificationFailed")}
        </p>
        <Button variant="outline" onClick={handleRetry}>
          {t("contract.smartId.retry")}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {t("common.cancel") || "Cancel"}
        </Button>
      </div>
    );
  }

  // Pending — show verification code
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <Smartphone className="h-10 w-10 text-accent" />
      <p className="text-sm text-center text-muted-foreground max-w-xs">
        {t("contract.smartId.openApp")}
      </p>
      {verificationCode && (
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("contract.smartId.verificationCodeLabel")}
          </span>
          <span className="text-4xl font-bold tracking-[0.2em] tabular-nums text-accent">
            {verificationCode}
          </span>
        </div>
      )}
      <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => { stopPolling(); setPollStatus("failed"); }}
      >
        {t("common.cancel") || "Cancel"}
      </Button>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function ContractSigningModal({ bookingId, onComplete, onClose }: Props) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [agreed, setAgreed] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [idCode, setIdCode] = useState("");
  const [hasSigned, setHasSigned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastHtmlRef = useRef<string>("");

  // Smart-ID / Mobile-ID verified state
  const [verifiedSessionId, setVerifiedSessionId] = useState<string | null>(null);
  const [verifiedMethod, setVerifiedMethod] = useState<"smartid" | "mobileid" | null>(null);

  const tplQuery = useQuery({
    queryKey: ["contract-templates", bookingId],
    queryFn: () => apiClient.get<Template[]>(`/contracts/templates?bookingId=${bookingId}`),
    enabled: !!bookingId,
  });
  const templates: Template[] = tplQuery.data ?? [];
  const template = templates[0];

  const previewQuery = useQuery({
    queryKey: ["contract-preview", bookingId, template?.id],
    queryFn: async () => {
      const r = await apiClient.post<{ html: string } | string>("/contracts/preview", {
        bookingId,
        contractTemplateId: template!.id,
      });
      const html = typeof r === "string" ? r : r?.html ?? "";
      lastHtmlRef.current = html;
      return html;
    },
    enabled: !!template?.id,
  });

  // Query whether Dokobit or Smart-ID / Mobile-ID e-signing is enabled on this deployment.
  // Falls back gracefully (canvas) when the backend is unreachable or flags are absent.
  const signingMethodQuery = useQuery({
    queryKey: ["signing-method"],
    queryFn: () =>
      apiClient.get<{
        dokobitEnabled: boolean;
        smartIdEnabled: boolean;
        mobileIdEnabled: boolean;
      }>("/contracts/signing-method"),
    staleTime: 60_000,
    retry: 1,
  });
  const dokobitEnabled = signingMethodQuery.data?.dokobitEnabled === true;
  const smartIdEnabled = signingMethodQuery.data?.smartIdEnabled === true;
  const mobileIdEnabled = signingMethodQuery.data?.mobileIdEnabled === true;
  const useSmartIdFlow = (smartIdEnabled || mobileIdEnabled) && !dokobitEnabled;

  // Setup high-DPI canvas
  useEffect(() => {
    if (step !== 2) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
  }, [step]);

  const getXY = (e: React.MouseEvent | React.TouchEvent) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const scaleX = c.width / rect.width;
    const scaleY = c.height / rect.height;
    let cx: number, cy: number;
    if ("touches" in e) {
      const tch = e.touches[0] || e.changedTouches[0];
      cx = tch.clientX; cy = tch.clientY;
    } else {
      cx = e.clientX; cy = e.clientY;
    }
    return { x: (cx - rect.left) * scaleX, y: (cy - rect.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const { x, y } = getXY(e);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawingRef.current = true;
  };
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const { x, y } = getXY(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const endDraw = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.closePath();
    // Check if anything other than white pixels exist
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    let drawn = false;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) { drawn = true; break; }
    }
    if (drawn) setHasSigned(true);
  };
  const clearSignature = () => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    // Keep "signed" if the user has acknowledged by typing their name (a11y path).
    setHasSigned(name.trim().length > 0);
  };

  const signMutation = useMutation({
    mutationFn: async () => {
      if (useSmartIdFlow && verifiedSessionId && verifiedMethod) {
        // Smart-ID / Mobile-ID path — no canvas needed
        return apiClient.post("/contracts/sign", {
          bookingId,
          contractTemplateId: template!.id,
          tenantName: name,
          tenantIdCode: idCode || null,
          signingMethod: verifiedMethod,
          verifiedSessionId,
        });
      }
      // Canvas fallback path
      const dataUrl = canvasRef.current!.toDataURL("image/png");
      return apiClient.post("/contracts/sign", {
        bookingId,
        contractTemplateId: template!.id,
        tenantName: name,
        tenantIdCode: idCode || null,
        signatureDataUrl: dataUrl,
        signingMethod: "canvas" as const,
      });
    },
    onSuccess: () => {
      setSubmitting(false);
      setStep(3);
    },
    onError: (err: unknown) => {
      setSubmitting(false);
      const message = err instanceof Error ? err.message : t("error.generic");
      toast.error(message);
    },
  });

  const handleSign = () => {
    setSubmitting(true);
    signMutation.mutate();
  };

  const handleDownload = () => {
    const html = lastHtmlRef.current;
    if (!html) return;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (w) setTimeout(() => { try { w.print(); } catch { /* ignore */ } }, 500);
  };

  const handleSmartIdSuccess = (
    verifiedName: string,
    personalCode: string,
    sid: string,
    method: "smartid" | "mobileid"
  ) => {
    // Auto-populate name from verified identity
    if (verifiedName) setName(verifiedName);
    if (personalCode) setIdCode(personalCode);
    setVerifiedSessionId(sid);
    setVerifiedMethod(method);
  };

  const stepLabel =
    step === 1 ? t("contract.stepReview") : step === 2 ? t("contract.stepSign") : t("contract.stepDone");

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <div className="border-b border-border p-5">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold leading-none tracking-normal">
              <FileText className="h-4 w-4 text-accent" />
              {t("contract.signNow")}
            </DialogTitle>
            <span className="text-xs text-muted-foreground">
              {`Step ${step} of 3 — ${stepLabel}`}
            </span>
          </div>
          <DialogDescription className="sr-only">
            {t("contract.dialogDescription")}
          </DialogDescription>
          <Progress value={(step / 3) * 100} className="mt-3 h-1.5" />
        </div>

        <div className="p-5">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">{t("contract.reviewTitle")}</h2>
              {previewQuery.isLoading || tplQuery.isLoading ? (
                <Skeleton className="h-[60vh] w-full rounded-xl" />
              ) : previewQuery.error || !template ? (
                <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  {(previewQuery.error as Error | null)?.message || t("contract.noTemplate")}
                </p>
              ) : (
                <iframe
                  title={t("contract.previewTitle")}
                  srcDoc={previewQuery.data || ""}
                  className="w-full h-[60vh] rounded-xl border border-border bg-white"
                  sandbox="allow-same-origin"
                />
              )}
              <label className="flex items-start gap-3 rounded-lg border border-border p-3">
                <Checkbox
                  checked={agreed}
                  onCheckedChange={(v) => setAgreed(!!v)}
                  className="mt-0.5"
                />
                <span className="text-sm">{t("contract.agreeLabel")}</span>
              </label>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={onClose}>{t("common.cancel") || "Cancel"}</Button>
                <Button
                  disabled={!agreed || !template}
                  onClick={() => setStep(2)}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {t("contract.continueToSign")} →
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">
                {dokobitEnabled
                  ? t("contract.signWithId")
                  : useSmartIdFlow
                  ? t("contract.smartId.title")
                  : t("contract.acknowledgmentTitle")}
              </h2>

              {/* Common name + ID fields (shown for canvas and smart-id paths; dokobit handles its own) */}
              {!dokobitEnabled && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium">{t("contract.fullName")}</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      maxLength={200}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      // Read-only once Smart-ID has verified the identity
                      readOnly={useSmartIdFlow && !!verifiedSessionId}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">{t("contract.idCode")}</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      maxLength={20}
                      placeholder="38501010000"
                      value={idCode}
                      onChange={(e) => setIdCode(e.target.value)}
                      readOnly={useSmartIdFlow && !!verifiedSessionId}
                    />
                  </div>
                </div>
              )}

              {/* Self-declared note — canvas path only */}
              {!dokobitEnabled && !useSmartIdFlow && (
                <div className="flex items-start gap-2 rounded-lg bg-secondary/50 p-3">
                  <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">{t("contract.selfDeclaredNote")}</p>
                </div>
              )}

              {/* ── Dokobit path ──
                  Signer identity (name / personal code) is taken from the booking
                  and verified by Smart-ID / Mobile-ID on Dokobit's hosted page, so
                  no form fields are collected here. */}
              {dokobitEnabled ? (
                <>
                  <DokobitSigningFlow
                    bookingId={bookingId}
                    templateId={template?.id ?? ""}
                    onSuccess={() => setStep(3)}
                    onCancel={() => setStep(1)}
                  />
                  <div className="flex items-center justify-between pt-2">
                    <Button variant="outline" onClick={() => setStep(1)}>← {t("contract.stepReview")}</Button>
                  </div>
                </>
              ) : useSmartIdFlow ? (
                /* ── Smart-ID / Mobile-ID path ── */
                <>
                  {verifiedSessionId ? (
                    // Verification done — show confirm button
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 rounded-lg bg-accent/10 border border-accent/30 p-3">
                        <CheckCircle className="h-4 w-4 text-accent shrink-0" />
                        <p className="text-sm font-medium text-accent">
                          {t("contract.smartId.identityConfirmed")}
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <Button variant="outline" onClick={() => setStep(1)}>← {t("contract.stepReview")}</Button>
                        <Button
                          disabled={!name.trim() || submitting}
                          onClick={handleSign}
                          className="bg-accent text-accent-foreground hover:bg-accent/90"
                        >
                          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {t("contract.confirmSign")} →
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <SmartIdSigningFlow
                      bookingId={bookingId}
                      smartIdEnabled={smartIdEnabled}
                      mobileIdEnabled={mobileIdEnabled}
                      onSuccess={handleSmartIdSuccess}
                      onCancel={() => setStep(1)}
                    />
                  )}
                </>
              ) : (
                /* ── Canvas fallback path ── */
                <>
                  <p className="text-xs font-medium text-muted-foreground">{t("contract.drawAcknowledgment")}</p>
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={180}
                    role="img"
                    aria-label={t("contract.signatureCanvasLabel")}
                    className="w-full touch-none rounded-xl border-2 border-dashed border-border bg-white cursor-crosshair"
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={endDraw}
                    onMouseLeave={endDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={endDraw}
                  />
                  <p className="text-xs text-muted-foreground">{t("contract.signatureCanvasHint")}</p>

                  {/* Keyboard / assistive-tech accessible alternative to drawing:
                      typing the full name acknowledges & enables Confirm. */}
                  <div>
                    <label htmlFor="contract-ack-name" className="text-xs font-medium">
                      {t("contract.typeNameToSignLabel")}
                    </label>
                    <input
                      id="contract-ack-name"
                      className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      maxLength={200}
                      autoComplete="name"
                      value={name}
                      onChange={(e) => {
                        const v = e.target.value;
                        setName(v);
                        setHasSigned(v.trim().length > 0);
                      }}
                      placeholder={t("contract.typeNameToSignPlaceholder")}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">{t("contract.typeNameToSignHint")}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={clearSignature}>
                      {t("contract.clearSignature")}
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setStep(1)}>← {t("contract.stepReview")}</Button>
                      <Button
                        disabled={!name.trim() || !hasSigned || submitting}
                        onClick={handleSign}
                        className="bg-accent text-accent-foreground hover:bg-accent/90"
                      >
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t("contract.confirmSign")} →
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center text-center py-8">
              <CheckCircle className="h-16 w-16 text-accent" />
              <h2 className="mt-4 text-xl font-bold">{t("contract.confirmed")}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t("contract.confirmedDesc")}</p>
              <div className="mt-6 flex gap-2">
                <Button variant="outline" onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" /> {t("contract.download")}
                </Button>
                <Button onClick={onComplete} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  {t("common.close") || "Close"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
