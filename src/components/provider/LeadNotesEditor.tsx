import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUpdateLead } from "@/hooks/useOrders";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";

const MAX = 2000;

export function LeadNotesEditor({ orderId, initial }: { orderId: string; initial?: string | null }) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initial || "");
  const updateLead = useUpdateLead();

  useEffect(() => { setValue(initial || ""); }, [initial]);

  const tooLong = value.length > MAX;
  const dirty = value !== (initial || "");

  const save = async () => {
    if (!dirty || tooLong) return;
    try {
      await updateLead.mutateAsync({ id: orderId, providerNotes: value });
      toast.success(t("crm.notes.saved"));
    } catch {
      toast.error(t("toast.error"));
    }
  };

  const editor = (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("crm.notes.placeholder")}
        rows={isMobile ? 8 : 4}
        className="text-sm"
      />
      <div className="flex items-center justify-between">
        <span className={`text-[11px] ${tooLong ? "text-destructive" : "text-muted-foreground"}`}>
          {value.length}/{MAX}{tooLong ? ` — ${t("crm.notes.tooLong")}` : ""}
        </span>
        <Button size="sm" disabled={!dirty || tooLong || updateLead.isPending} onClick={save}>
          {updateLead.isPending ? "..." : t("crm.notes.save")}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <StickyNote className="h-3.5 w-3.5" />
        {t("crm.notes.placeholder").split(".")[0]}
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {open && !isMobile && <div className="mt-2 rounded-lg border border-border bg-secondary/30 p-3">{editor}</div>}

      {isMobile && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base">{t("crm.notes.placeholder").split(".")[0]}</DialogTitle>
            </DialogHeader>
            {editor}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default LeadNotesEditor;