// ─── Supplier & Order Models ───

export type IntegrationType = "api" | "email" | "manual";

export interface Supplier {
  id: string;
  name: string;
  registryCode: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  integrationType: IntegrationType;
  apiEndpoint?: string;
  isActive: boolean;
  listingCount: number;
  createdAt: string;
}

export type OrderStatus = "created" | "sending" | "sent" | "confirmed" | "rejected" | "active" | "completed" | "cancelled";

export interface OrderTimeline {
  date: string;
  time: string;
  event: string;
  status: OrderStatus;
  detail?: string;
}

export interface Order {
  id: string;
  bookingId: string;
  listingId: string;
  listingTitle: string;
  listingType: "warehouse" | "moving" | "trailer";
  supplierId: string;
  supplierName: string;
  integrationType: IntegrationType;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  city: string;
  startDate: string;
  endDate?: string;
  duration: string;
  extras: string[];
  basePrice: number;
  platformPrice: number;
  supplierPrice: number;
  extrasTotal: number;
  total: number;
  margin: number;
  status: OrderStatus;
  createdAt: string;
  sentAt?: string;
  confirmedAt?: string;
  timeline: OrderTimeline[];
  notes: string;
}

// ─── Mock Suppliers ───

export const MOCK_SUPPLIERS: Supplier[] = [
  {
    id: "sup-1",
    name: "Laobox OÜ",
    registryCode: "14523678",
    contactName: "Mart Kivi",
    contactEmail: "mart@laobox.ee",
    contactPhone: "+372 5123 4567",
    integrationType: "api",
    apiEndpoint: "https://api.laobox.ee/v1/orders",
    isActive: true,
    listingCount: 3,
    createdAt: "2025-08-15",
  },
  {
    id: "sup-2",
    name: "MiniLadu AS",
    registryCode: "11234567",
    contactName: "Tiina Rebane",
    contactEmail: "tiina@miniladu.ee",
    contactPhone: "+372 5234 5678",
    integrationType: "email",
    isActive: true,
    listingCount: 2,
    createdAt: "2025-09-01",
  },
  {
    id: "sup-3",
    name: "SecureStore OÜ",
    registryCode: "16789012",
    contactName: "Jaan Tamm",
    contactEmail: "jaan@securestore.ee",
    contactPhone: "+372 5345 6789",
    integrationType: "api",
    apiEndpoint: "https://api.securestore.ee/bookings",
    isActive: true,
    listingCount: 1,
    createdAt: "2025-09-20",
  },
  {
    id: "sup-4",
    name: "KoliExpress OÜ",
    registryCode: "12345678",
    contactName: "Andres Pärn",
    contactEmail: "andres@koliexpress.ee",
    contactPhone: "+372 5456 7890",
    integrationType: "email",
    isActive: true,
    listingCount: 1,
    createdAt: "2025-10-05",
  },
  {
    id: "sup-5",
    name: "HaagisRent OÜ",
    registryCode: "13456789",
    contactName: "Kristjan Mägi",
    contactEmail: "kristjan@haagisrent.ee",
    contactPhone: "+372 5567 8901",
    integrationType: "manual",
    isActive: true,
    listingCount: 1,
    createdAt: "2025-10-15",
  },
  {
    id: "sup-6",
    name: "Pärnu Ladu OÜ",
    registryCode: "15678901",
    contactName: "Liis Sepp",
    contactEmail: "liis@parnuladu.ee",
    contactPhone: "+372 5678 9012",
    integrationType: "manual",
    isActive: false,
    listingCount: 1,
    createdAt: "2025-11-01",
  },
];

// Map listing IDs to supplier IDs
export const LISTING_SUPPLIER_MAP: Record<string, string> = {
  w1: "sup-1", w2: "sup-2", w3: "sup-3", w4: "sup-6", w5: "sup-1", w6: "sup-2",
  m1: "sup-4", m2: "sup-2", m3: "sup-6", m4: "sup-4",
  t1: "sup-5", t2: "sup-2", t3: "sup-6", t4: "sup-5",
};

export function getSupplierForListing(listingId: string): Supplier | undefined {
  const supplierId = LISTING_SUPPLIER_MAP[listingId];
  return MOCK_SUPPLIERS.find((s) => s.id === supplierId);
}

// ─── Mock Orders ───

export const MOCK_ORDERS: Order[] = [
  {
    id: "ORD-2026-001",
    bookingId: "BK-2026-001",
    listingId: "w1",
    listingTitle: "Laobox Tallinn Kesklinn",
    listingType: "warehouse",
    supplierId: "sup-1",
    supplierName: "Laobox OÜ",
    integrationType: "api",
    customerName: "Andres Tamm",
    customerEmail: "andres@email.com",
    customerPhone: "+372 5551 2345",
    city: "Tallinn",
    startDate: "2026-04-01",
    endDate: "2026-06-30",
    duration: "3 kuud",
    extras: ["Kindlustus"],
    basePrice: 147,
    platformPrice: 140,
    supplierPrice: 125,
    extrasTotal: 30,
    total: 170,
    margin: 15,
    status: "confirmed",
    createdAt: "2026-03-18 14:23",
    sentAt: "2026-03-18 14:23",
    confirmedAt: "2026-03-19 09:15",
    timeline: [
      { date: "2026-03-18", time: "14:23", event: "Tellimus loodud", status: "created" },
      { date: "2026-03-18", time: "14:23", event: "Saadetud API kaudu", status: "sent", detail: "POST https://api.laobox.ee/v1/orders → 201 Created" },
      { date: "2026-03-19", time: "09:15", event: "Partner kinnitas tellimuse", status: "confirmed", detail: "Automaatne API kinnitus" },
    ],
    notes: "",
  },
  {
    id: "ORD-2026-002",
    bookingId: "BK-2026-002",
    listingId: "m1",
    listingTitle: "KoliExpress",
    listingType: "moving",
    supplierId: "sup-4",
    supplierName: "KoliExpress OÜ",
    integrationType: "email",
    customerName: "Kati Mets",
    customerEmail: "kati@email.com",
    customerPhone: "+372 5123 9876",
    city: "Tallinn",
    startDate: "2026-03-25",
    duration: "Ühekordne",
    extras: ["Pakkimisabi", "Laadimisabi"],
    basePrice: 180,
    platformPrice: 171,
    supplierPrice: 153,
    extrasTotal: 35,
    total: 206,
    margin: 18,
    status: "sent",
    createdAt: "2026-03-20 10:45",
    sentAt: "2026-03-20 10:46",
    timeline: [
      { date: "2026-03-20", time: "10:45", event: "Tellimus loodud", status: "created" },
      { date: "2026-03-20", time: "10:46", event: "Tellimus saadetud e-postiga", status: "sent", detail: "E-kiri saadetud: andres@koliexpress.ee" },
      { date: "2026-03-20", time: "10:46", event: "Ootame partneri kinnitust", status: "sent" },
    ],
    notes: "Klient soovib kolimine kl 9:00",
  },
  {
    id: "ORD-2026-003",
    bookingId: "BK-2026-003",
    listingId: "t1",
    listingTitle: "HaagisRent Tallinn",
    listingType: "trailer",
    supplierId: "sup-5",
    supplierName: "HaagisRent OÜ",
    integrationType: "manual",
    customerName: "Jüri Kask",
    customerEmail: "jyri@email.com",
    customerPhone: "+372 5234 5678",
    city: "Tallinn",
    startDate: "2026-03-10",
    endDate: "2026-03-12",
    duration: "2 päeva",
    extras: [],
    basePrice: 50,
    platformPrice: 48,
    supplierPrice: 43,
    extrasTotal: 0,
    total: 48,
    margin: 5,
    status: "completed",
    createdAt: "2026-03-08 16:30",
    sentAt: "2026-03-08 16:35",
    confirmedAt: "2026-03-09 08:00",
    timeline: [
      { date: "2026-03-08", time: "16:30", event: "Tellimus loodud", status: "created" },
      { date: "2026-03-08", time: "16:35", event: "Ootame operaatori tegevust", status: "sending", detail: "Manuaalne integratsioon — operaator peab partneri teavitama" },
      { date: "2026-03-08", time: "17:00", event: "Operaator edastas partneri", status: "sent" },
      { date: "2026-03-09", time: "08:00", event: "Partner kinnitas", status: "confirmed" },
      { date: "2026-03-10", time: "09:00", event: "Teenus algas", status: "active" },
      { date: "2026-03-12", time: "18:00", event: "Teenus lõpetatud", status: "completed" },
    ],
    notes: "",
  },
  {
    id: "ORD-2026-004",
    bookingId: "BK-2026-004",
    listingId: "w2",
    listingTitle: "MiniLadu Tartu",
    listingType: "warehouse",
    supplierId: "sup-2",
    supplierName: "MiniLadu AS",
    integrationType: "email",
    customerName: "Maria Saar",
    customerEmail: "maria@email.com",
    customerPhone: "+372 5345 6789",
    city: "Tartu",
    startDate: "2026-04-15",
    endDate: "2026-07-15",
    duration: "3 kuud",
    extras: [],
    basePrice: 87,
    platformPrice: 83,
    supplierPrice: 74,
    extrasTotal: 0,
    total: 83,
    margin: 9,
    status: "rejected",
    createdAt: "2026-03-19 11:20",
    sentAt: "2026-03-19 11:21",
    timeline: [
      { date: "2026-03-19", time: "11:20", event: "Tellimus loodud", status: "created" },
      { date: "2026-03-19", time: "11:21", event: "Tellimus saadetud e-postiga", status: "sent", detail: "E-kiri saadetud: tiina@miniladu.ee" },
      { date: "2026-03-20", time: "14:30", event: "Partner lükkas tagasi", status: "rejected", detail: "Põhjus: Soovitud perioodil pole ruumi saadaval" },
    ],
    notes: "Klient teavitatud, pakume alternatiivi",
  },
];

// ─── Integration type config ───

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

// ─── Email template preview data ───

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
