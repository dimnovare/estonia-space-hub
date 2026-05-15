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

type EmailLabels = {
  greeting: string;
  intro: string;
  detailsHeader: string;
  orderNo: string;
  service: string;
  type: string;
  warehouse: string;
  moving: string;
  trailer: string;
  clientHeader: string;
  name: string;
  email: string;
  phone: string;
  bookingHeader: string;
  startDate: string;
  endDate: string;
  period: string;
  extras: string;
  priceHeader: string;
  partnerPrice: string;
  totalToPartner: string;
  notesHeader: string;
  confirmAsk: string;
  confirmHow: string;
  signoff: string;
  team: string;
};

const EMAIL_LABELS: Record<string, EmailLabels> = {
  et: {
    greeting: "Tere", intro: "Ruumly platvormilt on saabunud uus tellimus.",
    detailsHeader: "TELLIMUSE ANDMED", orderNo: "Tellimuse nr", service: "Teenus", type: "Tüüp",
    warehouse: "Laopind", moving: "Kolimine", trailer: "Haagise rent",
    clientHeader: "KLIENT", name: "Nimi", email: "E-post", phone: "Telefon",
    bookingHeader: "DETAILID", startDate: "Alguskuupäev", endDate: "Lõppkuupäev",
    period: "Periood", extras: "Lisateenused",
    priceHeader: "HIND", partnerPrice: "Partneri hind", totalToPartner: "Kokku partnerile",
    notesHeader: "MÄRKUSED",
    confirmAsk: "Palun kinnitage tellimus 2 tunni jooksul.",
    confirmHow: "Kinnitamiseks vastake sellele e-kirjale märksõnaga KINNITAN\nvõi logige sisse Ruumly partneripaneeli.",
    signoff: "Lugupidamisega,", team: "Ruumly meeskond",
  },
  en: {
    greeting: "Hello", intro: "A new order has arrived from the Ruumly platform.",
    detailsHeader: "ORDER DETAILS", orderNo: "Order no.", service: "Service", type: "Type",
    warehouse: "Warehouse", moving: "Moving", trailer: "Trailer rental",
    clientHeader: "CLIENT", name: "Name", email: "Email", phone: "Phone",
    bookingHeader: "BOOKING", startDate: "Start date", endDate: "End date",
    period: "Period", extras: "Extras",
    priceHeader: "PRICE", partnerPrice: "Partner price", totalToPartner: "Total to partner",
    notesHeader: "NOTES",
    confirmAsk: "Please confirm the order within 2 hours.",
    confirmHow: "To confirm, reply to this email with the keyword CONFIRM\nor sign in to the Ruumly partner panel.",
    signoff: "Best regards,", team: "The Ruumly team",
  },
  ru: {
    greeting: "Здравствуйте", intro: "На платформе Ruumly поступил новый заказ.",
    detailsHeader: "ДАННЫЕ ЗАКАЗА", orderNo: "Номер заказа", service: "Услуга", type: "Тип",
    warehouse: "Склад", moving: "Переезд", trailer: "Аренда прицепа",
    clientHeader: "КЛИЕНТ", name: "Имя", email: "Эл. почта", phone: "Телефон",
    bookingHeader: "ДЕТАЛИ", startDate: "Дата начала", endDate: "Дата окончания",
    period: "Период", extras: "Доп. услуги",
    priceHeader: "ЦЕНА", partnerPrice: "Цена партнёра", totalToPartner: "Итого партнёру",
    notesHeader: "ПРИМЕЧАНИЯ",
    confirmAsk: "Пожалуйста, подтвердите заказ в течение 2 часов.",
    confirmHow: "Для подтверждения ответьте на это письмо словом ПОДТВЕРЖДАЮ\nили войдите в партнёрскую панель Ruumly.",
    signoff: "С уважением,", team: "Команда Ruumly",
  },
  lv: {
    greeting: "Sveiki", intro: "No Ruumly platformas saņemts jauns pasūtījums.",
    detailsHeader: "PASŪTĪJUMA DATI", orderNo: "Pasūtījuma nr.", service: "Pakalpojums", type: "Tips",
    warehouse: "Noliktava", moving: "Pārvākšanās", trailer: "Piekabes noma",
    clientHeader: "KLIENTS", name: "Vārds", email: "E-pasts", phone: "Tālrunis",
    bookingHeader: "DETAĻAS", startDate: "Sākuma datums", endDate: "Beigu datums",
    period: "Periods", extras: "Papildpakalpojumi",
    priceHeader: "CENA", partnerPrice: "Partnera cena", totalToPartner: "Kopā partnerim",
    notesHeader: "PIEZĪMES",
    confirmAsk: "Lūdzu, apstipriniet pasūtījumu 2 stundu laikā.",
    confirmHow: "Lai apstiprinātu, atbildiet uz šo e-pastu ar atslēgvārdu APSTIPRINU\nvai pieslēdzieties Ruumly partneru panelim.",
    signoff: "Ar cieņu,", team: "Ruumly komanda",
  },
  lt: {
    greeting: "Sveiki", intro: "Iš Ruumly platformos gautas naujas užsakymas.",
    detailsHeader: "UŽSAKYMO DUOMENYS", orderNo: "Užsakymo nr.", service: "Paslauga", type: "Tipas",
    warehouse: "Sandėlis", moving: "Perkraustymas", trailer: "Priekabos nuoma",
    clientHeader: "KLIENTAS", name: "Vardas", email: "El. paštas", phone: "Telefonas",
    bookingHeader: "DETALĖS", startDate: "Pradžios data", endDate: "Pabaigos data",
    period: "Laikotarpis", extras: "Papildomos paslaugos",
    priceHeader: "KAINA", partnerPrice: "Partnerio kaina", totalToPartner: "Iš viso partneriui",
    notesHeader: "PASTABOS",
    confirmAsk: "Prašome patvirtinti užsakymą per 2 valandas.",
    confirmHow: "Norėdami patvirtinti, atsakykite į šį laišką žodžiu PATVIRTINU\narba prisijunkite prie Ruumly partnerių skydelio.",
    signoff: "Pagarbiai,", team: "Ruumly komanda",
  },
};

export function generateOrderEmailPreview(order: Order, lang: string = "et"): string {
  const l = EMAIL_LABELS[lang] ?? EMAIL_LABELS.en;
  const typeLabel = order.listingType === "warehouse" ? l.warehouse : order.listingType === "moving" ? l.moving : l.trailer;
  return `${l.greeting}, ${order.supplierName}!

${l.intro}

═══════════════════════════════════
${l.detailsHeader}
═══════════════════════════════════

${l.orderNo}:    ${order.id}
${l.service}:    ${order.listingTitle}
${l.type}:       ${typeLabel}

═══════════════════════════════════
${l.clientHeader}
═══════════════════════════════════

${l.name}:       ${order.customerName}
${l.email}:      ${order.customerEmail}
${l.phone}:      ${order.customerPhone}

═══════════════════════════════════
${l.bookingHeader}
═══════════════════════════════════

${l.startDate}:  ${order.startDate}
${order.endDate ? `${l.endDate}:    ${order.endDate}` : ""}
${l.period}:     ${order.duration}
${order.extras.length > 0 ? `${l.extras}:  ${order.extras.join(", ")}` : ""}

═══════════════════════════════════
${l.priceHeader}
═══════════════════════════════════

${l.partnerPrice}:    €${order.supplierPrice}
${order.extrasTotal > 0 ? `${l.extras}:  €${order.extrasTotal}` : ""}
${l.totalToPartner}:  €${order.supplierPrice + order.extrasTotal}

${order.notes ? `═══════════════════════════════════
${l.notesHeader}
═══════════════════════════════════

${order.notes}` : ""}

═══════════════════════════════════

${l.confirmAsk}

${l.confirmHow}

${l.signoff}
${l.team}
info@ruumly.eu | +372 5555 1234
`;
}
