import type { AdminOffer, OfferOptionInput, ProviderCandidate } from "@/services";
import { parseMoney } from "@/lib/parseMoney";

export interface EditableOption {
  /** The server row this option IS, or null for one the admin just added and
   *  has not saved yet. Sent back on every save so the backend edits the row in
   *  place — that is what keeps the option's link to the provider quote that
   *  seeded it, and with it the badge below. */
  id: string | null;
  localId: string;
  supplierId: string | null;
  supplierName: string | null;
  supplierLocationId: string | null;
  title: string;
  price: string;
  priceUnit: string;
  notes: string;
  /** Backend-derived: this option was auto-seeded from a provider's tokenized
   *  quote (Feature B). Surfaced as a badge; never sent back on save — the
   *  server decides provenance, we only echo the id it belongs to. */
  fromProviderQuote: boolean;
}

let localSeq = 0;

export const nextLocalId = () => `opt-local-${++localSeq}`;

export function toEditable(option: AdminOffer["options"][number]): EditableOption {
  return {
    id: option.id ?? null,
    localId: option.id || nextLocalId(),
    supplierId: option.supplierId,
    supplierName: option.supplierName,
    supplierLocationId: option.supplierLocationId,
    title: option.title ?? "",
    price: option.priceAmount != null ? String(option.priceAmount) : "",
    priceUnit: option.priceUnit ?? "",
    notes: option.notes ?? "",
    fromProviderQuote: option.fromProviderQuote ?? false,
  };
}

export function candidateToEditable(candidate: ProviderCandidate): EditableOption {
  return {
    // A candidate is a provider the admin picked off the shortlist, not a row
    // the offer already has — the server mints the id on save.
    id: null,
    localId: nextLocalId(),
    supplierId: candidate.supplierId,
    supplierName: candidate.supplierName,
    supplierLocationId: candidate.locationId,
    title: candidate.listingTitle ?? candidate.supplierName,
    price: candidate.price != null ? String(candidate.price) : "",
    priceUnit: candidate.priceUnit ?? "",
    notes: "",
    fromProviderQuote: false,
  };
}

/** Strict — see lib/parseMoney. parseFloat used to prefix-parse "1 200,50" to 1
 *  and this value flows straight to the customer's offer. */
export function parsePrice(value: string): number | null {
  return parseMoney(value);
}

export function toInput(option: EditableOption, index: number): OfferOptionInput {
  return {
    id: option.id ?? undefined,
    title: option.title.trim(),
    supplierId: option.supplierId ?? undefined,
    supplierLocationId: option.supplierLocationId ?? undefined,
    priceAmount: parsePrice(option.price),
    priceUnit: option.priceUnit.trim() || null,
    notes: option.notes.trim() || null,
    sortOrder: index,
  };
}
