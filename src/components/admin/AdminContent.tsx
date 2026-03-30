import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";

export default function AdminContent() {
  const { t } = useLanguage();
  const [editOpen, setEditOpen] = useState(false);
  const [editSection, setEditSection] = useState("");
  const [contentValues, setContentValues] = useState<Record<string, string>>(() => ({
    "Homepage hero": t("admin.content.heroDefault"),
    "FAQ": t("admin.content.faqDefault"),
    "Categories": t("admin.content.categoriesDefault"),
    "Footer": t("admin.content.footerDefault"),
  }));

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t("admin.contentManagement")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("admin.contentDesc")}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {Object.keys(contentValues).map(item => (
          <div key={item} className="card-elevated flex items-center justify-between p-4">
            <span className="text-sm font-medium">{item}</span>
            <Button variant="outline" size="sm" onClick={() => { setEditSection(item); setEditOpen(true); }}>{t("admin.edit")}</Button>
          </div>
        ))}
      </div>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t("admin.edit")}: {editSection}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <textarea className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" rows={6} value={contentValues[editSection] || ""} onChange={e => setContentValues({ ...contentValues, [editSection]: e.target.value })} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>{t("admin.cancel")}</Button>
              <Button onClick={() => setEditOpen(false)} className="bg-accent text-accent-foreground hover:bg-accent/90"><Save className="mr-2 h-4 w-4" /> {t("admin.save")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
