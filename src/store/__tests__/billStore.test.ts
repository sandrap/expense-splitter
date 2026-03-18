import { describe, it, expect, beforeEach } from 'vitest';
import { useBillStore } from '../billStore';

beforeEach(() => {
  // Reset only data fields — using merge mode (no second arg) preserves action functions.
  // Note: setState(obj, true) in Zustand v5 replaces the entire state including actions,
  // which causes "action is not a function" errors. Merge mode is correct for test reset.
  useBillStore.setState({ people: [], items: [], settings: { defaultTipPercent: 18, defaultTaxPercent: 0 } });
});

// Helper to get fresh state after each operation
function getStore() {
  return useBillStore.getState();
}

describe('addPerson', () => {
  it('creates a person with the given name and a UUID id', () => {
    getStore().addPerson('Alice');
    const { people } = getStore();
    expect(people).toHaveLength(1);
    expect(people[0].name).toBe('Alice');
    expect(typeof people[0].id).toBe('string');
    expect(people[0].id.length).toBeGreaterThan(0);
  });

  it('produces different UUIDs for subsequent calls', () => {
    getStore().addPerson('Alice');
    getStore().addPerson('Bob');
    const { people } = getStore();
    expect(people).toHaveLength(2);
    expect(people[0].id).not.toBe(people[1].id);
  });
});

describe('removePerson', () => {
  it('removes the person from the people array', () => {
    getStore().addPerson('Alice');
    const aliceId = getStore().people[0].id;

    getStore().removePerson(aliceId);
    expect(getStore().people).toHaveLength(0);
  });

  it('removes the person id from all items assignedTo arrays', () => {
    getStore().addPerson('Alice');
    const aliceId = getStore().people[0].id;

    getStore().addItem('Pizza', 1200);
    const itemId = getStore().items[0].id;
    getStore().updateItem(itemId, { splitMode: 'assigned', assignedTo: [aliceId] });

    // Verify alice is in assignedTo before removal
    expect(getStore().items[0].assignedTo).toContain(aliceId);

    getStore().removePerson(aliceId);

    // Alice's id must be removed from item's assignedTo
    expect(getStore().items[0].assignedTo).not.toContain(aliceId);
    expect(getStore().items[0].assignedTo).toHaveLength(0);
  });
});

describe('updatePerson', () => {
  it('updates the name of an existing person', () => {
    getStore().addPerson('Alice');
    const aliceId = getStore().people[0].id;

    getStore().updatePerson(aliceId, { name: 'Alicia' });
    expect(getStore().people[0].name).toBe('Alicia');
    expect(getStore().people[0].id).toBe(aliceId);
  });
});

describe('addItem', () => {
  it('creates an item with description, priceInCents, default splitMode shared, and empty assignedTo', () => {
    getStore().addItem('Burger', 1500);
    const { items } = getStore();
    expect(items).toHaveLength(1);
    expect(items[0].description).toBe('Burger');
    expect(items[0].priceInCents).toBe(1500);
    expect(items[0].splitMode).toBe('shared');
    expect(items[0].assignedTo).toEqual([]);
    expect(typeof items[0].id).toBe('string');
  });
});

describe('removeItem', () => {
  it('removes the item from items array', () => {
    getStore().addItem('Fries', 500);
    const itemId = getStore().items[0].id;

    getStore().removeItem(itemId);
    expect(getStore().items).toHaveLength(0);
  });
});

describe('updateItem', () => {
  it('updates fields of an existing item', () => {
    getStore().addItem('Salad', 800);
    const itemId = getStore().items[0].id;

    getStore().updateItem(itemId, { splitMode: 'assigned', assignedTo: ['p1', 'p2'] });
    const item = getStore().items[0];
    expect(item.splitMode).toBe('assigned');
    expect(item.assignedTo).toEqual(['p1', 'p2']);
    expect(item.description).toBe('Salad');
  });
});

describe('updateSettings', () => {
  it('merges partial settings, updating only the provided fields', () => {
    getStore().updateSettings({ defaultTipPercent: 20 });
    const { settings } = getStore();
    expect(settings.defaultTipPercent).toBe(20);
    // defaultTaxPercent should remain unchanged
    expect(settings.defaultTaxPercent).toBe(0);
  });
});
