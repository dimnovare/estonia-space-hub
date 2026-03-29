import { useState } from "react";
import { FileText, Loader2, Send, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { rebateService } from "@/services";

interface RebateInvoice {
  id: string;
  period: string;
  supplierId: string;
  supplierName: string;
  bookingsCount: number;
  totalValue: number;
  rebateRate: number;
  rebateAmount: number;
  status: "draft" | "sent" | "paid" | "overdue" | "disputed";
  reference?: string;
  paidAt?: string;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Mustand", className: "bg-muted text-muted-foreground" },
  sent: { label: "Saadetud", className: "bg-blue-100 text-blue-700" },
  paid: { label: "Makstud", className: "bg-success/10 text-success" },
  overdue: { label: "Tähtaja ületanud", className: "bg-destructive/10 text-destructive" },
  disputed: { label: "Vaidlustatud", className: "bg-amber-100 text-amber-700" },
};

function getPrevMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function AdminRebates() {
  const qc = useQueryClient();
  const [generateMonth, setGenerateMonth] = useState(getPrevMonth());
  const [filterPeriod, setFilterPeriod] = useState("");
  const [payRef, setPayRef] = useState("");
  const [payingId, setPayingId] = useState<string | null>(null);

  const { data: invoices = [], isLoading } = useQuery<RebateInvoice[]>({
    queryKey: ["rebate-invoices", filterPeriod],
    queryFn: () => rebateService.getInvoices(filterPeriod || undefined),
    staleTime: 30_000,
  });

  const generateMut = useMutation({
    mutationFn: (period: string) => rebateService.generate(period),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["rebate-invoices"] });
      toast.success(`${res.count ?? 0} arvet genereeritud, kokku €${res.totalAmount?.toFixed(2) ?? 0}`);
    },
    onError: (err: any) => toast.error(err.message || "Genereerimine ebaõnnestus"),
  });

  const markSentMut = useMutation({
    mutationFn: (id: string) => rebateService.markSent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rebate-invoices"] });
      toast.success("Märgitud saadetuks");
    },
    onError: (err: any) => toast.error(err.message || "Viga"),
  });

  const markPaidMut = useMutation({
    mutationFn: ({ id, reference }: { id: string; reference: string }) =>
      rebateService.markPaid(id, reference),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rebate-invoices"] });
      toast.success("Märgitud makstuks");
      setPayingId(null);
      setPayRef("");
    },
    onError: (err: any) => toast.error(err.message || "Viga"),
  });

  const totalDraft = invoices.filter(i => i.status === "draft").reduce((s, i) => s + i.rebateAmount, 0);
  const totalSent = invoices.filter(i => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + i.rebateAmount, 0);
  const totalPaid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.rebateAmount, 0);

  const inp = "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent";

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Tagasimaksed</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tagasimakse mudeli partneritele esitatavad igakuised arved
      </p>

      {/* Summary cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="card-elevated p-4">
          <div className="text-sm text-muted-foreground">Mustandid</div>
          <div className="mt-1 font-display text-2xl font-bold">€{totalDraft.toFixed(2)}</div>
        </div>
        <div className="card-elevated p-4">
          <div className="text-sm text-muted-foreground">Ootel makse</div>
          <div className="mt-1 font-display text-2xl font-bold text-blue-600">€{totalSent.toFixed(2)}</div>
        </div>
        <div className="card-elevated p-4">
          <div className="text-sm text-muted-foreground">Makstud</div>
          <div className="mt-1 font-display text-2xl font-bold text-success">€{totalPaid.toFixed(2)}</div>
        </div>
      </div>

      {/* Generate section */}
      <div className="mt-6 rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold">Genereeri igakuised arved</h3>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Periood</label>
            <input type="month" className={inp} value={generateMonth} onChange={e => setGenerateMonth(e.target.value)} />
          </div>
          <Button
            onClick={() => generateMut.mutate(generateMonth)}
            disabled={generateMut.isPending || !generateMonth}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {generateMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            Genereeri arved
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="mt-6 flex items-center gap-3">
        <label className="text-xs font-medium text-muted-foreground">Filtreeri perioodi järgi:</label>
        <input type="month" className={inp + " max-w-[200px]"} value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)} />
        {filterPeriod && (
          <button className="text-xs text-accent hover:underline" onClick={() => setFilterPeriod("")}>Tühjenda</button>
        )}
      </div>

      {/* Invoices table */}
      <div className="mt-4 rounded-xl border border-border overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Tagasimakse arveid pole veel genereeritud
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Periood</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead className="hidden sm:table-cell">Broneeringud</TableHead>
                <TableHead className="hidden sm:table-cell">Koguväärtus</TableHead>
                <TableHead className="hidden md:table-cell">Määr</TableHead>
                <TableHead>Arve summa</TableHead>
                <TableHead>Staatus</TableHead>
                <TableHead>Tegevused</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map(inv => {
                const sc = statusConfig[inv.status] || statusConfig.draft;
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs">{inv.period}</TableCell>
                    <TableCell className="font-medium">{inv.supplierName}</TableCell>
                    <TableCell className="hidden sm:table-cell">{inv.bookingsCount}</TableCell>
                    <TableCell className="hidden sm:table-cell">€{inv.totalValue.toFixed(2)}</TableCell>
                    <TableCell className="hidden md:table-cell">{inv.rebateRate}%</TableCell>
                    <TableCell className="font-semibold">€{inv.rebateAmount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={sc.className}>{sc.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {inv.status === "draft" && (
                          <Button variant="outline" size="sm" className="text-xs gap-1"
                            onClick={() => markSentMut.mutate(inv.id)} disabled={markSentMut.isPending}>
                            <Send className="h-3 w-3" /> Saada
                          </Button>
                        )}
                        {(inv.status === "sent" || inv.status === "overdue") && (
                          <Button variant="outline" size="sm" className="text-xs gap-1"
                            onClick={() => { setPayingId(inv.id); setPayRef(""); }}>
                            <CheckCircle className="h-3 w-3" /> Makstud
                          </Button>
                        )}
                        {inv.status === "paid" && inv.reference && (
                          <span className="text-[10px] text-muted-foreground">Ref: {inv.reference}</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Mark as paid dialog */}
      <Dialog open={!!payingId} onOpenChange={o => { if (!o) setPayingId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Märgi makstuks</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Makse viitenumber</label>
              <input className={inp} placeholder="Nt: 12345678" value={payRef} onChange={e => setPayRef(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPayingId(null)}>Tühista</Button>
              <Button
                onClick={() => payingId && markPaidMut.mutate({ id: payingId, reference: payRef })}
                disabled={markPaidMut.isPending}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {markPaidMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Kinnita makse
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
