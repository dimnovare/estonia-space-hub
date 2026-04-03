import type { IntegrationType, OrderStatus, Order } from "@/services/types";

export const BALTIC_CITIES = {
  EE: ["Tallinn", "Tartu", "Pärnu", "Narva", "Viljandi", "Rakvere", "Haapsalu", "Jõhvi", "Kuressaare"],
  LV: ["Rīga", "Daugavpils", "Liepāja", "Jelgava", "Jūrmala"],
  LT: ["Vilnius", "Kaunas", "Klaipėda", "Šiauliai", "Panevėžys"],
} as const;

// Backward compat
export const ESTONIAN_CITIES = BALTIC_CITIES.EE;

// All cities flattened for search
export const ALL_CITIES = [...BALTIC_CITIES.EE, ...BALTIC_CITIES.LV, ...BALTIC_CITIES.LT];

export const INTEGRATION_TYPE_CONFIG: Record<IntegrationType, { label: string; color: string; description: string }> = {
  api: { label: "API", color: "bg-success/10 text-success", description: "Automatic API integration" },
  email: { label: "Email", color: "bg-info/10 text-info", description: "Order sent via email" },
  manual: { label: "Manual", color: "bg-warning/10 text-warning", description: "Operator forwards manually" },
};

export const ORDER_STATUS_CONFIG: Record<OrderStatus, { labelKey: string; label: string; color: string }> = {
  created: { labelKey: "status.created", label: "Created", color: "bg-secondary text-muted-foreground" },
  sending: { labelKey: "status.sending", label: "Sending", color: "bg-warning/10 text-warning" },
  sent: { labelKey: "status.sent", label: "Sent", color: "bg-info/10 text-info" },
  confirmed: { labelKey: "status.confirmed", label: "Confirmed", color: "bg-success/10 text-success" },
  rejected: { labelKey: "status.rejected", label: "Rejected", color: "bg-destructive/10 text-destructive" },
  active: { labelKey: "status.active", label: "Active", color: "bg-accent/10 text-accent" },
  completed: { labelKey: "status.completed", label: "Completed", color: "bg-muted text-muted-foreground" },
  cancelled: { labelKey: "status.cancelled", label: "Cancelled", color: "bg-destructive/10 text-destructive" },
};

export function generateOrderEmailPreview(order: Order): string {
  return `Tere, ${order.supplierName}!

Ruumly platvormilt on saabunud uus tellimus.

═══════════════════════════════════
TELLIMUSE ANDMED
═══════════════════════════════════

Tellimuse nr:    ${order.id}
Teenus:          ${order.listingTitle}
Tüüp:           ${order.listingType === "warehouse" ? "Laopind" : order.listingType === "moving" ? "Kolimine" : "Haagise rent"}

═══════════════════════════════════
KLIENT
═══════════════════════════════════

Nimi:            ${order.customerName}
E-post:          ${order.customerEmail}
Telefon:         ${order.customerPhone}

═══════════════════════════════════
DETAILID
═══════════════════════════════════

Alguskuupäev:    ${order.startDate}
${order.endDate ? `Lõppkuupäev:     ${order.endDate}` : ""}
Periood:         ${order.duration}
${order.extras.length > 0 ? `Lisateenused:    ${order.extras.join(", ")}` : ""}

═══════════════════════════════════
HIND
═══════════════════════════════════

Partneri hind:   €${order.supplierPrice}
${order.extrasTotal > 0 ? `Lisateenused:    €${order.extrasTotal}` : ""}
Kokku partnerile: €${order.supplierPrice + order.extrasTotal}

${order.notes ? `═══════════════════════════════════
MÄRKUSED
═══════════════════════════════════

${order.notes}` : ""}

═══════════════════════════════════

Palun kinnitage tellimus 2 tunni jooksul.

Kinnitamiseks vastake sellele e-kirjale märksõnaga KINNITAN
või logige sisse Ruumly partneripaneeli.

Lugupidamisega,
Ruumly meeskond
info@ruumly.eu | +372 5555 1234
`;
}
