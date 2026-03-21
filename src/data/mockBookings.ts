export type BookingStatus = "pending" | "confirmed" | "active" | "completed" | "cancelled";

export interface Booking {
  id: string;
  listingId: string;
  listingTitle: string;
  listingType: "warehouse" | "moving" | "trailer";
  provider: string;
  city: string;
  startDate: string;
  endDate?: string;
  duration: string;
  status: BookingStatus;
  basePrice: number;
  platformPrice: number;
  extras: string[];
  extrasTotal: number;
  total: number;
  createdAt: string;
  timeline: { date: string; event: string; status: BookingStatus }[];
}

export const MOCK_BOOKINGS: Booking[] = [
  {
    id: "BK-2026-001",
    listingId: "w1",
    listingTitle: "Laobox Tallinn Kesklinn",
    listingType: "warehouse",
    provider: "Laobox OÜ",
    city: "Tallinn",
    startDate: "2026-04-01",
    endDate: "2026-06-30",
    duration: "3 kuud",
    status: "confirmed",
    basePrice: 147,
    platformPrice: 140,
    extras: ["Kindlustus"],
    extrasTotal: 30,
    total: 170,
    createdAt: "2026-03-18",
    timeline: [
      { date: "2026-03-18", event: "Broneering esitatud", status: "pending" },
      { date: "2026-03-18", event: "Makse kinnitatud", status: "pending" },
      { date: "2026-03-19", event: "Partner kinnitas", status: "confirmed" },
    ],
  },
  {
    id: "BK-2026-002",
    listingId: "m1",
    listingTitle: "KoliExpress",
    listingType: "moving",
    provider: "KoliExpress OÜ",
    city: "Tallinn",
    startDate: "2026-03-25",
    duration: "Ühekordne",
    status: "pending",
    basePrice: 180,
    platformPrice: 171,
    extras: ["Pakkimisabi", "Laadimisabi"],
    extrasTotal: 35,
    total: 206,
    createdAt: "2026-03-20",
    timeline: [
      { date: "2026-03-20", event: "Broneering esitatud", status: "pending" },
    ],
  },
  {
    id: "BK-2026-003",
    listingId: "t1",
    listingTitle: "HaagisRent Tallinn",
    listingType: "trailer",
    provider: "HaagisRent OÜ",
    city: "Tallinn",
    startDate: "2026-03-10",
    endDate: "2026-03-12",
    duration: "2 päeva",
    status: "completed",
    basePrice: 50,
    platformPrice: 48,
    extras: [],
    extrasTotal: 0,
    total: 48,
    createdAt: "2026-03-08",
    timeline: [
      { date: "2026-03-08", event: "Broneering esitatud", status: "pending" },
      { date: "2026-03-08", event: "Kinnitatud", status: "confirmed" },
      { date: "2026-03-10", event: "Teenus algas", status: "active" },
      { date: "2026-03-12", event: "Teenus lõpetatud", status: "completed" },
    ],
  },
  {
    id: "BK-2025-015",
    listingId: "w2",
    listingTitle: "MiniLadu Tartu",
    listingType: "warehouse",
    provider: "MiniLadu AS",
    city: "Tartu",
    startDate: "2025-12-01",
    endDate: "2026-02-28",
    duration: "3 kuud",
    status: "completed",
    basePrice: 87,
    platformPrice: 83,
    extras: [],
    extrasTotal: 0,
    total: 83,
    createdAt: "2025-11-25",
    timeline: [
      { date: "2025-11-25", event: "Broneering esitatud", status: "pending" },
      { date: "2025-11-25", event: "Kinnitatud", status: "confirmed" },
      { date: "2025-12-01", event: "Teenus algas", status: "active" },
      { date: "2026-02-28", event: "Leping lõppes", status: "completed" },
    ],
  },
];

export const MOCK_NOTIFICATIONS = [
  { id: "n1", type: "booking" as const, title: "Broneering kinnitatud", desc: "KoliExpress kinnitas teie broneeringu 25. märtsiks.", time: "2 tundi tagasi", read: false },
  { id: "n2", type: "alert" as const, title: "Uus laopind saadaval", desc: "Tallinna kesklinnas on saadaval uus köetud laopind al. 45€/kuu.", time: "5 tundi tagasi", read: false },
  { id: "n3", type: "system" as const, title: "Profiil uuendatud", desc: "Teie kontaktandmed on edukalt uuendatud.", time: "1 päev tagasi", read: true },
  { id: "n4", type: "booking" as const, title: "Broneering lõpetatud", desc: "MiniLadu Tartu leping on lõppenud. Jätke hinnang!", time: "3 päeva tagasi", read: true },
];
