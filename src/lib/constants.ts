import type { IntegrationType, OrderStatus, Order } from "@/services/types";

export const ESTONIAN_CITIES = [
  "Tallinn", "Tartu", "Pärnu", "Narva", "Viljandi",
  "Rakvere", "Haapsalu", "Jõhvi", "Kuressaare",
] as const;

export const INTEGRATION_TYPE_CONFIG: Record<IntegrationType, { label: string; color: string; description: string }> = {
  api: { label: "API", color: "bg-success/10 text-success", description: "Automaatne API integratsioon" },
  email: { label: "E-post", color: "bg-info/10 text-info", description: "Tellimus saadetakse e-postiga" },
  manual: { label: "Manuaalne", color: "bg-warning/10 text-warning", description: "Operaator edastab käsitsi" },
};

export const ORDER_STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  created: { label: "Loodud", color: "bg-secondary text-muted-foreground" },
  sending: { label: "Saatmisel", color: "bg-warning/10 text-warning" },
  sent: { label: "Saadetud", color: "bg-info/10 text-info" },
  confirmed: { label: "Kinnitatud", color: "bg-success/10 text-success" },
  rejected: { label: "Tagasi lükatud", color: "bg-destructive/10 text-destructive" },
  active: { label: "Aktiivne", color: "bg-accent/10 text-accent" },
  completed: { label: "Lõpetatud", color: "bg-muted text-muted-foreground" },
  cancelled: { label: "Tühistatud", color: "bg-destructive/10 text-destructive" },
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
