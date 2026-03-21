import { Order, generateOrderEmailPreview } from "@/data/mockOrders";

interface EmailTemplatePreviewProps {
  order: Order;
}

export default function EmailTemplatePreview({ order }: EmailTemplatePreviewProps) {
  const emailContent = generateOrderEmailPreview(order);

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="bg-secondary px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Saatja:</span> info@ruumly.eu
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <span className="font-medium text-foreground">Saaja:</span> {order.supplierName} &lt;{
            order.integrationType === "email" ? order.customerEmail.replace(/.*@/, `${order.supplierName.toLowerCase().replace(/\s/g, "")}@`) : "api@partner.ee"
          }&gt;
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <span className="font-medium text-foreground">Teema:</span> Uus tellimus #{order.id} — {order.listingTitle}
        </div>
      </div>
      <pre className="bg-card p-4 text-xs font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto">
        {emailContent}
      </pre>
    </div>
  );
}
