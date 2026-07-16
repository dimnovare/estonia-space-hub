import type { AdminOffer, OfferOptionInput, ProviderCandidate } from "@/services";
import { parseMoney } from "@/lib/parseMoney";

export interface EditableOption {
  localId: string;
  supplierId: string | null;
  supplierName: string | null;
  supplierLocationId: string | null;
  title: string;
  price: string;
  priceUnit: string;
  notes: string;
  /** Backend-derived: this option was auto-seeded from a provider's tokenized
   *  quote (Feature B). Surfaced as a badge; never sent back on save. */
  fromProviderQuote: boolean;
}

let localSeq = 0;

export const nextLocalId = () => `opt-local-${++localSeq}`;

export function toEditable(option: AdminOffer["options"][number]): EditableOption {
  return {
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
    title: option.title.trim(),
    supplierId: option.supplierId ?? undefined,
    supplierLocationId: option.supplierLocationId ?? undefined,
    priceAmount: parsePrice(option.price),
    priceUnit: option.priceUnit.trim() || null,
    notes: option.notes.trim() || null,
    sortOrder: index,
  };
}
