export interface PartnerLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  openingHours: string | null;
  description: string | null;
  images: string[];
  listingCount: number;
  totalUnitCount: number | null;
  availableUnitCount: number | null;
}

export interface PartnerProfile {
  id: string;
  slug: string;
  name: string;
  country: string;
  tagline: string | null;
  longDescription: Record<string, string> | null;
  logoUrl: string | null;
  heroImageUrl: string | null;
  websiteUrl: string | null;
  foundedYear: number | null;
  rating: number;
  reviewCount: number;
  tier: string;
  isVerified: boolean;
  foundingPartner: boolean;
  locationCount: number;
  listingCount: number;
  locations: PartnerLocation[];
  hasGoogleReviews?: boolean;
  // Provider directory: unclaimed company profile — public page + map pin,
  // no listings/pricing/booking. Claimable by the company later.
  isDirectory?: boolean;
  /** Service slugs: warehouse|moving|trailer|cleaning|packing|vanrental|insurance */
  serviceTypes?: string[];
}

export interface FeaturedPartner {
  id: string;
  slug: string | null;
  name: string;
  tagline: string | null;
  logoUrl: string | null;
  locationCount: number;
  tier: string;
  isVerified: boolean;
}