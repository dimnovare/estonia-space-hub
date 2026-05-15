import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckCircle, Loader2, X, Download, FileText } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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

  const tplQuery = useQuery({
    queryKey: ["contract-templates", bookingId],
    queryFn: () => apiClient.get<Template[] | { data: Template[] }>(`/contracts/templates?bookingId=${bookingId}`),
    enabled: !!bookingId,
  });
  const templates: Template[] = Array.isArray(tplQuery.data)
    ? tplQuery.data
    : (tplQuery.data as any)?.data ?? [];
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
    setHasSigned(false);
  };

  const signMutation = useMutation({
    mutationFn: async () => {
      const dataUrl = canvasRef.current!.toDataURL("image/png");
      return apiClient.post("/contracts/sign", {
        bookingId,
        contractTemplateId: template!.id,
        tenantName: name,
        tenantIdCode: idCode || null,
        signatureDataUrl: dataUrl,
      });
    },
    onSuccess: () => {
      setSubmitting(false);
      setStep(3);
    },
    onError: (err: any) => {
      setSubmitting(false);
      toast.error(err?.message || t("error.generic"));
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
    if (w) setTimeout(() => { try { w.print(); } catch {} }, 500);
  };

  const stepLabel =
    step === 1 ? t("contract.stepReview") : step === 2 ? t("contract.stepSign") : t("contract.stepDone");

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <div className="border-b border-border p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FileText className="h-4 w-4 text-accent" />
              {t("contract.signNow")}
            </div>
            <span className="text-xs text-muted-foreground">
              {`Step ${step} of 3 — ${stepLabel}`}
            </span>
          </div>
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
                  {(previewQuery.error as any)?.message || "No contract template available"}
                </p>
              ) : (
                <iframe
                  title="Contract preview"
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
              <h2 className="text-lg font-semibold">{t("contract.signatureTitle")}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium">{t("contract.fullName")}</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    maxLength={200}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                  />
                </div>
              </div>
              <canvas
                ref={canvasRef}
                width={600}
                height={180}
                className="w-full touch-none rounded-xl border-2 border-dashed border-border bg-white cursor-crosshair"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
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