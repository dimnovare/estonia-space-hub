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
  /** True when this partner has a provider login and therefore actually RECEIVES
   *  a message sent from their page. Distinct from `isDirectory`, which is only
   *  provenance: a partner hand-added by an admin is not a directory row and can
   *  still have nobody to email. Absent/false means promise nothing — the safe
   *  direction, and what a cached profile written before this field returns. */
  repliesDirectly?: boolean;
  /** Service slugs: warehouse|moving|trailer|cleaning|vanrental (legacy rows may
   *  still carry the retired packing|insurance slugs — see lib/serviceTypes). */
  serviceTypes?: string[];
  /** Headline "from" price the provider set through the claim form. Null until
   *  they give us one — the page renders nothing rather than a placeholder. */
  priceFrom?: number | null;
  priceUnit?: string | null;
  priceNote?: string | null;
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