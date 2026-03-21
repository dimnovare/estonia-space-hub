import { Warehouse, Truck, CarFront } from "lucide-react";

export type ListingType = "warehouse" | "moving" | "trailer";

export interface WarehouseListing {
  id: string;
  type: "warehouse";
  title: string;
  provider: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  priceFrom: number;
  priceUnit: string;
  size: number;
  sizeUnit: string;
  image: string;
  images: string[];
  heated: boolean;
  indoor: boolean;
  access24_7: boolean;
  security: boolean;
  loadingDock: boolean;
  forklift: boolean;
  shortTerm: boolean;
  longTerm: boolean;
  availableNow: boolean;
  rating: number;
  reviewCount: number;
  badge?: "cheapest" | "closest" | "best-value" | "promoted";
  description: string;
  features: string[];
}

export interface MovingListing {
  id: string;
  type: "moving";
  title: string;
  provider: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  priceFrom: number;
  priceUnit: string;
  image: string;
  images: string[];
  serviceArea: string[];
  withVan: boolean;
  packingHelp: boolean;
  loadingHelp: boolean;
  pricingModel: "fixed" | "hourly";
  availableNow: boolean;
  rating: number;
  reviewCount: number;
  badge?: "cheapest" | "closest" | "best-value" | "promoted";
  description: string;
  services: string[];
}

export interface TrailerListing {
  id: string;
  type: "trailer";
  title: string;
  provider: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  priceFrom: number;
  priceUnit: string;
  image: string;
  images: string[];
  trailerType: string;
  weightClass: string;
  availableNow: boolean;
  rating: number;
  reviewCount: number;
  badge?: "cheapest" | "closest" | "best-value" | "promoted";
  description: string;
  requirements: string[];
}

export type Listing = WarehouseListing | MovingListing | TrailerListing;

export const WAREHOUSES: WarehouseListing[] = [
  {
    id: "w1",
    type: "warehouse",
    title: "Laobox Tallinn Kesklinn",
    provider: "Laobox OÜ",
    address: "Pärnu mnt 139",
    city: "Tallinn",
    lat: 59.4270,
    lng: 24.7536,
    priceFrom: 49,
    priceUnit: "€/kuu",
    size: 5,
    sizeUnit: "m²",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&h=400&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&h=600&fit=crop",
    ],
    heated: true,
    indoor: true,
    access24_7: true,
    security: true,
    loadingDock: false,
    forklift: false,
    shortTerm: true,
    longTerm: true,
    availableNow: true,
    rating: 4.8,
    reviewCount: 124,
    badge: "promoted",
    description: "Kaasaegne iseteeninduslik laoruum Tallinna kesklinnas. Ideaalne nii eraklientidele kui ettevõtetele.",
    features: ["Kliimakontroll", "VideoValve 24/7", "Iseteenindus", "Lihtne juurdepääs"],
  },
  {
    id: "w2",
    type: "warehouse",
    title: "MiniLadu Tartu",
    provider: "MiniLadu AS",
    address: "Ringtee 75",
    city: "Tartu",
    lat: 58.3780,
    lng: 26.7290,
    priceFrom: 29,
    priceUnit: "€/kuu",
    size: 3,
    sizeUnit: "m²",
    image: "https://images.unsplash.com/photo-1553413077-190dd305871c?w=600&h=400&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&h=600&fit=crop",
    ],
    heated: false,
    indoor: true,
    access24_7: true,
    security: true,
    loadingDock: true,
    forklift: false,
    shortTerm: true,
    longTerm: true,
    availableNow: true,
    rating: 4.5,
    reviewCount: 67,
    badge: "cheapest",
    description: "Soodne laoruum Tartus. Sobiv mööbli, hooajaasjade või ärikauba hoiustamiseks.",
    features: ["Laadimisplatvorm", "Valve", "Paindlikud lepingud"],
  },
  {
    id: "w3",
    type: "warehouse",
    title: "SecureStore Ülemiste",
    provider: "SecureStore OÜ",
    address: "Suur-Sõjamäe 10a",
    city: "Tallinn",
    lat: 59.4200,
    lng: 24.7900,
    priceFrom: 79,
    priceUnit: "€/kuu",
    size: 10,
    sizeUnit: "m²",
    image: "https://images.unsplash.com/photo-1565610222536-ef125c59da2e?w=600&h=400&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1565610222536-ef125c59da2e?w=800&h=600&fit=crop",
    ],
    heated: true,
    indoor: true,
    access24_7: true,
    security: true,
    loadingDock: true,
    forklift: true,
    shortTerm: false,
    longTerm: true,
    availableNow: false,
    rating: 4.9,
    reviewCount: 203,
    badge: "best-value",
    description: "Kõrgeima turvatasemega laoruum Ülemiste piirkonnas. Ideaalne väärtuslikuma kauba hoiustamiseks.",
    features: ["Kaheastmeline turvakontroll", "Kindlustus", "Tõstuk", "Laadimisplatvorm", "Kliimakontroll"],
  },
  {
    id: "w4",
    type: "warehouse",
    title: "Pärnu Laokeskus",
    provider: "Pärnu Ladu OÜ",
    address: "Savi 25",
    city: "Pärnu",
    lat: 58.3850,
    lng: 24.5050,
    priceFrom: 35,
    priceUnit: "€/kuu",
    size: 6,
    sizeUnit: "m²",
    image: "https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=600&h=400&fit=crop",
    images: [],
    heated: false,
    indoor: true,
    access24_7: false,
    security: true,
    loadingDock: false,
    forklift: false,
    shortTerm: true,
    longTerm: true,
    availableNow: true,
    rating: 4.2,
    reviewCount: 31,
    description: "Taskukohane laopind Pärnus. Sobiv hooajaasjade ja väikeettevõtte vajadusteks.",
    features: ["Valve", "Hea asukoht", "Paindlik leping"],
  },
  {
    id: "w5",
    type: "warehouse",
    title: "NordicStorage Tallinn",
    provider: "NordicStorage OÜ",
    address: "Kadaka tee 56",
    city: "Tallinn",
    lat: 59.4050,
    lng: 24.6800,
    priceFrom: 59,
    priceUnit: "€/kuu",
    size: 8,
    sizeUnit: "m²",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&h=400&fit=crop",
    images: [],
    heated: true,
    indoor: true,
    access24_7: true,
    security: true,
    loadingDock: true,
    forklift: true,
    shortTerm: false,
    longTerm: true,
    availableNow: true,
    rating: 4.6,
    reviewCount: 89,
    badge: "closest",
    description: "Professionaalne laohoone Mustamäel. Ideaalne ettevõtetele, kes vajavad regulaarset juurdepääsu kaubale.",
    features: ["Tõstuk", "Laadimisplatvorm", "24/7 juurdepääs", "Kindlustus", "Kliimakontroll"],
  },
  {
    id: "w6",
    type: "warehouse",
    title: "Viljandi MiniLadu",
    provider: "Viljandi Laod OÜ",
    address: "Vaksali 12",
    city: "Viljandi",
    lat: 58.3639,
    lng: 25.5900,
    priceFrom: 22,
    priceUnit: "€/kuu",
    size: 4,
    sizeUnit: "m²",
    image: "https://images.unsplash.com/photo-1553413077-190dd305871c?w=600&h=400&fit=crop",
    images: [],
    heated: false,
    indoor: true,
    access24_7: false,
    security: true,
    loadingDock: false,
    forklift: false,
    shortTerm: true,
    longTerm: true,
    availableNow: true,
    rating: 4.0,
    reviewCount: 15,
    description: "Odav ladu Viljandis. Sobib hooajaasjade ja väiksema kauba hoiustamiseks.",
    features: ["Valve", "Paindlik leping"],
  },
];

export const MOVING_SERVICES: MovingListing[] = [
  {
    id: "m1",
    type: "moving",
    title: "KoliExpress",
    provider: "KoliExpress OÜ",
    address: "Peterburi tee 81",
    city: "Tallinn",
    lat: 59.4350,
    lng: 24.7850,
    priceFrom: 45,
    priceUnit: "€/h",
    image: "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=600&h=400&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=800&h=600&fit=crop",
    ],
    serviceArea: ["Tallinn", "Harjumaa", "Kogu Eesti"],
    withVan: true,
    packingHelp: true,
    loadingHelp: true,
    pricingModel: "hourly",
    availableNow: true,
    rating: 4.7,
    reviewCount: 189,
    badge: "promoted",
    description: "Kiire ja usaldusväärne kolimisteenus Tallinnas ja üle Eesti. Pakume ka pakkimis- ja laadimisabi.",
    services: ["Kolimine", "Pakkimine", "Laadimine", "Mööbli kokkupanek", "Prügi äravedu"],
  },
  {
    id: "m2",
    type: "moving",
    title: "VeoPro Tartu",
    provider: "VeoPro OÜ",
    address: "Turu 45",
    city: "Tartu",
    lat: 58.3800,
    lng: 26.7200,
    priceFrom: 35,
    priceUnit: "€/h",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=400&fit=crop",
    images: [],
    serviceArea: ["Tartu", "Tartumaa"],
    withVan: true,
    packingHelp: false,
    loadingHelp: true,
    pricingModel: "hourly",
    availableNow: true,
    rating: 4.4,
    reviewCount: 78,
    badge: "cheapest",
    description: "Soodne kolimisteenus Tartus. Kiire ja korralik teenindus.",
    services: ["Kolimine", "Laadimine", "Transport"],
  },
  {
    id: "m3",
    type: "moving",
    title: "FlexMove Pärnu",
    provider: "FlexMove OÜ",
    address: "Riia mnt 130",
    city: "Pärnu",
    lat: 58.3750,
    lng: 24.5200,
    priceFrom: 40,
    priceUnit: "€/h",
    image: "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=600&h=400&fit=crop",
    images: [],
    serviceArea: ["Pärnu", "Pärnumaa"],
    withVan: true,
    packingHelp: true,
    loadingHelp: true,
    pricingModel: "hourly",
    availableNow: false,
    rating: 4.3,
    reviewCount: 42,
    description: "Professionaalne kolimisteenus Pärnus ja ümbruses. Pakume täisteenust koos pakkimisega.",
    services: ["Kolimine", "Pakkimine", "Laadimine", "Transport"],
  },
  {
    id: "m4",
    type: "moving",
    title: "BudgetKoli",
    provider: "BudgetKoli OÜ",
    address: "Endla 45",
    city: "Tallinn",
    lat: 59.4320,
    lng: 24.7300,
    priceFrom: 25,
    priceUnit: "€/h",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=400&fit=crop",
    images: [],
    serviceArea: ["Tallinn", "Harjumaa"],
    withVan: true,
    packingHelp: false,
    loadingHelp: false,
    pricingModel: "fixed",
    availableNow: true,
    rating: 4.1,
    reviewCount: 56,
    badge: "cheapest",
    description: "Eesti soodsaim kolimisteenus. Fikseeritud hind ilma üllatusteta.",
    services: ["Transport", "Kolimine"],
  },
];

export const TRAILER_RENTALS: TrailerListing[] = [
  {
    id: "t1",
    type: "trailer",
    title: "HaagisRent Tallinn",
    provider: "HaagisRent OÜ",
    address: "Tehnika 14",
    city: "Tallinn",
    lat: 59.4300,
    lng: 24.7600,
    priceFrom: 25,
    priceUnit: "€/päev",
    image: "https://images.unsplash.com/photo-1601628828688-632f38a5a7d0?w=600&h=400&fit=crop",
    images: [],
    trailerType: "Kinnine haagis",
    weightClass: "750 kg",
    availableNow: true,
    rating: 4.6,
    reviewCount: 95,
    badge: "closest",
    description: "Haagiste rent Tallinnas. Lai valik erinevaid haagiseid kinnistest avatud haagisteni.",
    requirements: ["B-kategooria juhiluba", "Krediitkaart", "Isikut tõendav dokument"],
  },
  {
    id: "t2",
    type: "trailer",
    title: "Haagis24 Tartu",
    provider: "Haagis24 OÜ",
    address: "Aardla 130",
    city: "Tartu",
    lat: 58.3700,
    lng: 26.7100,
    priceFrom: 20,
    priceUnit: "€/päev",
    image: "https://images.unsplash.com/photo-1562962230-16e4623d36e6?w=600&h=400&fit=crop",
    images: [],
    trailerType: "Avatud haagis",
    weightClass: "500 kg",
    availableNow: true,
    rating: 4.3,
    reviewCount: 42,
    badge: "cheapest",
    description: "Soodsad haagised rendiks Tartus. Saadaval 24/7 iseteenindusega.",
    requirements: ["B-kategooria juhiluba", "Deposiit"],
  },
  {
    id: "t3",
    type: "trailer",
    title: "AutoHaagis Pärnu",
    provider: "AutoHaagis OÜ",
    address: "Lai 12",
    city: "Pärnu",
    lat: 58.3900,
    lng: 24.4950,
    priceFrom: 22,
    priceUnit: "€/päev",
    image: "https://images.unsplash.com/photo-1601628828688-632f38a5a7d0?w=600&h=400&fit=crop",
    images: [],
    trailerType: "Kinnine haagis",
    weightClass: "1000 kg",
    availableNow: true,
    rating: 4.5,
    reviewCount: 38,
    description: "Kvaliteetsed haagised rendiks Pärnus. Suured kinnised haagised kuni 1000 kg.",
    requirements: ["B-kategooria juhiluba", "Krediitkaart", "Kindlustus"],
  },
  {
    id: "t4",
    type: "trailer",
    title: "RentTrailer Narva",
    provider: "RentTrailer OÜ",
    address: "Kangelaste prospekt 30",
    city: "Narva",
    lat: 59.3793,
    lng: 28.1791,
    priceFrom: 18,
    priceUnit: "€/päev",
    image: "https://images.unsplash.com/photo-1562962230-16e4623d36e6?w=600&h=400&fit=crop",
    images: [],
    trailerType: "Avatud haagis",
    weightClass: "750 kg",
    availableNow: false,
    rating: 4.0,
    reviewCount: 19,
    badge: "cheapest",
    description: "Soodsad haagised Narvas ja Ida-Virumaal.",
    requirements: ["B-kategooria juhiluba", "Deposiit 100€"],
  },
];

export const ALL_LISTINGS: Listing[] = [...WAREHOUSES, ...MOVING_SERVICES, ...TRAILER_RENTALS];

export const LISTING_TYPE_CONFIG = {
  warehouse: { label: "Laopinnad", icon: Warehouse, color: "primary" },
  moving: { label: "Kolimisteenus", icon: Truck, color: "info" },
  trailer: { label: "Haagise rent", icon: CarFront, color: "success" },
} as const;
