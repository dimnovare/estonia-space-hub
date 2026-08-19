import { describe, it, expect } from "vitest";
import {
  scopeAnswered, scopeChips, scopeSelections, toggleScopeOption,
  type ScopeQuestion,
} from "@/components/RequestScopeSections";

/**
 * The two intake questions that are genuinely "tick all that apply".
 *
 * "Anything heavy or awkward?" and "windows, oven or fridge as well?" were
 * squeezed into single choice to match the shape of the other chip rows, and
 * both paid for it with an option describing the CONTROL rather than the job —
 * "several of these", "all three". A customer with a piano and an aquarium could
 * not say so, and the mover pricing "several of these" is guessing at exactly
 * the fact that decides the price; the question exists because a real mover
 * refused to quote a Haapsalu move without knowing what was in it.
 *
 * These are the rules that make the multi-select answer behave, and every one of
 * them is invisible in the rendered output until it is wrong:
 *
 *  - an empty answer is NO answer (an empty array is truthy in JS, so the Next
 *    gate would have waved through a question with nothing recorded),
 *  - a retired chip position is skipped rather than renumbered, because the
 *    position is the identity of every answer already stored,
 *  - "no, nothing unusual" and "not sure" cannot sit alongside an actual item.
 */
const heavyItems: ScopeQuestion = {
  id: "movingHeavyItems", options: 6, multi: true, retired: [5], exclusive: [1, 6],
};
const size: ScopeQuestion = { id: "movingSize", options: 6 };

describe("scope answers", () => {
  it("reads both shapes — a single question's answer did not change form", () => {
    expect(scopeSelections(3)).toEqual([3]);
    expect(scopeSelections([2, 4])).toEqual([2, 4]);
    expect(scopeSelections(undefined)).toEqual([]);
  });

  it("treats an empty answer as unanswered, not as an answer", () => {
    // `!!scope[q.id]` is true for [], which would have walked the visitor past
    // the required-questions gate with nothing recorded for this question.
    expect(scopeAnswered([])).toBe(false);
    expect(scopeAnswered(undefined)).toBe(false);
    expect(scopeAnswered(0)).toBe(false);
    expect(scopeAnswered([2])).toBe(true);
    expect(scopeAnswered(2)).toBe(true);
  });

  it("offers every chip but the retired one, and does not renumber to close the gap", () => {
    // 5 was "several of these". Shifting "not sure" down into it would silently
    // change what every lead already taken said.
    expect(scopeChips(heavyItems)).toEqual([1, 2, 3, 4, 6]);
    expect(scopeChips(size)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("toggling a multi-select answer", () => {
  it("adds, removes and keeps the answer in chip order rather than tap order", () => {
    let value = toggleScopeOption(heavyItems, undefined, 4);
    expect(value).toEqual([4]);

    value = toggleScopeOption(heavyItems, value, 2);
    expect(value).toEqual([2, 4]);   // tapped 4 then 2

    value = toggleScopeOption(heavyItems, value, 4);
    expect(value).toEqual([2]);
  });

  it("returns an empty answer when the last box is unticked", () => {
    // The caller drops the key on this, which puts the question back to
    // unanswered — the visitor is not stuck with a choice they cannot undo.
    expect(toggleScopeOption(heavyItems, [2], 2)).toEqual([]);
  });

  it("upgrades an answer stored as a bare number by an older bundle", () => {
    // A sessionStorage draft written before this question took several answers.
    expect(toggleScopeOption(heavyItems, 2, 4)).toEqual([2, 4]);
  });

  it("clears everything else when an exclusive answer is picked", () => {
    // "No, nothing unusual, and a piano" is not an answer — it is two.
    expect(toggleScopeOption(heavyItems, [2, 4], 1)).toEqual([1]);
    expect(toggleScopeOption(heavyItems, [2, 4], 6)).toEqual([6]);
  });

  it("clears an exclusive answer when an actual item is picked", () => {
    expect(toggleScopeOption(heavyItems, [1], 3)).toEqual([3]);
    expect(toggleScopeOption(heavyItems, [6], 3)).toEqual([3]);
  });

  it("leaves single-choice questions replacing their answer, exactly as before", () => {
    expect(toggleScopeOption(size, undefined, 3)).toBe(3);
    expect(toggleScopeOption(size, 3, 5)).toBe(5);
    // Not clearable and never a list: the radio group cannot express either,
    // and every one of these is required anyway.
    expect(toggleScopeOption(size, 3, 3)).toBe(3);
  });
});
