import type { AppState, PersonResult, ItemLine } from '../types/models';
import { largestRemainderDistribute, distributeProportional } from './distribute';

/**
 * Pure calculation engine.
 * Takes AppState and returns PersonResult[] with all monetary values in integer cents.
 *
 * Formula (locked decision):
 *   tip    = subtotal * tipRate   (pre-tax only)
 *   tax    = proportional share of total tax
 *   total  = subtotal + tip + tax
 *
 * No floating-point arithmetic on money values. All math uses integer cents.
 */
export function calculateResults(state: AppState): PersonResult[] {
  const { people, items, settings } = state;

  if (people.length === 0) return [];

  // Initialize accumulator for each person
  const accumulator = new Map<string, { itemLines: ItemLine[]; subtotalInCents: number }>();
  for (const person of people) {
    accumulator.set(person.id, { itemLines: [], subtotalInCents: 0 });
  }

  // Process each item
  for (const item of items) {
    // Resolve the person list for this item
    let assignees: string[];

    if (item.splitMode === 'shared') {
      if (item.assignedTo.length === 0) {
        // shared + empty assignedTo -> split among all people
        assignees = people.map((p) => p.id);
      } else {
        // shared + specific assignedTo -> split among that subset
        assignees = item.assignedTo;
      }
    } else {
      // splitMode === 'assigned'
      if (item.assignedTo.length === 0) {
        // assigned + empty assignedTo -> skip (no one charged, avoids division by zero)
        continue;
      } else {
        // assigned + specific people -> those people only
        assignees = item.assignedTo;
      }
    }

    // Only charge people who are in the current people list
    const validAssignees = assignees.filter((id) => accumulator.has(id));
    if (validAssignees.length === 0) continue;

    // Distribute item price equally among valid assignees
    const shares = largestRemainderDistribute(item.priceInCents, validAssignees.length);

    for (let i = 0; i < validAssignees.length; i++) {
      const personId = validAssignees[i];
      const acc = accumulator.get(personId)!;
      acc.itemLines.push({
        itemId: item.id,
        description: item.description,
        shareInCents: shares[i],
      });
      acc.subtotalInCents += shares[i];
    }
  }

  // Compute tax using distributeProportional (proportional by subtotal weight)
  const subtotals = people.map((p) => accumulator.get(p.id)!.subtotalInCents);
  const totalSubtotal = subtotals.reduce((sum, s) => sum + s, 0);
  const totalTaxCents = Math.round(totalSubtotal * settings.defaultTaxPercent / 100);
  const taxShares = distributeProportional(totalTaxCents, subtotals);

  // Build PersonResult for each person
  return people.map((person, idx) => {
    const acc = accumulator.get(person.id)!;
    const subtotalInCents = acc.subtotalInCents;

    // Tip: computed on pre-tax subtotal only, using per-person override if present
    const tipRate = state.tipOverrides?.[person.id] ?? settings.defaultTipPercent;
    const tipInCents = Math.round(subtotalInCents * tipRate / 100);
    const taxInCents = taxShares[idx];
    const totalInCents = subtotalInCents + tipInCents + taxInCents;

    return {
      personId: person.id,
      name: person.name,
      itemLines: acc.itemLines,
      subtotalInCents,
      tipInCents,
      taxInCents,
      totalInCents,
    };
  });
}
