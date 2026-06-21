import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import type { Invoice } from "@/services/types";

export function useGenerateInvoicePdf() {
  const { t } = useLanguage();
  return (inv: Invoice) => {
  const statusLabel =
    inv.status === "paid" ? t("account.invoiceStatus.paid") :
    inv.status === "pending" ? t("account.invoiceStatus.pending") : t("account.invoiceStatus.overdue");
  const badgeClass =
    inv.status === "paid" ? "badge-paid" :
    inv.status === "pending" ? "badge-pending" : "badge-overdue";

  const html = `<!DOCTYPE html>
<html lang="et">
<head>
  <meta charset="UTF-8" />
  <title>Arve ${inv.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #111; background: #fff; padding: 48px; max-width: 700px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; }
    .logo { font-size: 26px; font-weight: 800; color: #173B8D; }
    .invoice-meta { text-align: right; }
    .invoice-meta h1 { font-size: 22px; font-weight: 700; color: #111; margin-bottom: 4px; }
    .invoice-meta p { font-size: 13px; color: #666; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 40px; }
    .info-block label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #999; margin-bottom: 6px; display: block; }
    .info-block p { font-size: 14px; color: #111; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #999; padding: 10px 0; border-bottom: 2px solid #111; }
    td { padding: 14px 0; font-size: 14px; border-bottom: 1px solid #f3f4f6; }
    .total-row td { font-size: 16px; font-weight: 700; border-top: 2px solid #111; border-bottom: none; padding-top: 16px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge-paid { background: #dcfce7; color: #166534; }
    .badge-pending { background: #fef9c3; color: #854d0e; }
    .badge-overdue { background: #fee2e2; color: #991b1b; }
    .footer { margin-top: 64px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
    .footer p { font-size: 12px; color: #999; margin-bottom: 4px; }
    @media print { body { padding: 24px; } @page { margin: 20mm; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Ruumly</div>
    <div class="invoice-meta">
      <h1>${t("invoice.title")}</h1>
      <p>${inv.id}</p>
    </div>
  </div>
  <div class="info-grid">
    <div class="info-block">
      <label>${t("invoice.issuer")}</label>
      <p>${import.meta.env.VITE_LEGAL_ENTITY_NAME || "Ruumly"}</p>
      <p>${t("invoice.address")}</p>
      <p>info@ruumly.eu</p>
    </div>
    <div class="info-block">
      <label>${t("invoice.date")}</label>
      <p>${inv.issuedAt}</p>
      ${inv.paidAt ? `<label style="margin-top:12px">${t("invoice.paid")}</label><p>${inv.paidAt}</p>` : ""}
    </div>
  </div>
  <table>
    <thead><tr><th>${t("billing.description")}</th><th>${t("billing.amount")}</th><th>${t("billing.status")}</th></tr></thead>
    <tbody>
      <tr>
        <td>${inv.description}</td>
        <td>&euro;${inv.amount}</td>
        <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
      </tr>
    </tbody>
    <tr class="total-row"><td>${t("booking.total")}</td><td>&euro;${inv.amount}</td><td></td></tr>
  </table>
  <div class="footer">
    <p>${import.meta.env.VITE_LEGAL_ENTITY_NAME || "Ruumly"} &middot; ruumly.eu &middot; info@ruumly.eu</p>
  </div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) {
    toast.error(t("error.popupsBlocked"));
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 500);
  };
}
