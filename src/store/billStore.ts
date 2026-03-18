import { create } from 'zustand';
import type { Person, Item, BillSettings } from '../types/models';

interface BillState {
  people: Person[];
  items: Item[];
  settings: BillSettings;
  tipOverrides: Record<string, number>;
  addPerson: (name: string) => void;
  removePerson: (id: string) => void;
  updatePerson: (id: string, updates: Partial<Person>) => void;
  addItem: (description: string, priceInCents: number) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<Item>) => void;
  updateSettings: (updates: Partial<BillSettings>) => void;
  setPersonTipOverride: (personId: string, tipPercent: number) => void;
  clearPersonTipOverride: (personId: string) => void;
}

export const useBillStore = create<BillState>()((set) => ({
  people: [],
  items: [],
  settings: {
    defaultTipPercent: 18,
    defaultTaxPercent: 0,
  },
  tipOverrides: {},
  addPerson: (name) =>
    set((state) => ({
      people: [...state.people, { id: crypto.randomUUID(), name }],
    })),
  removePerson: (id) =>
    set((state) => {
      const { [id]: _, ...remainingOverrides } = state.tipOverrides;
      return {
        people: state.people.filter((p) => p.id !== id),
        items: state.items.map((item) => ({
          ...item,
          assignedTo: item.assignedTo.filter((pid) => pid !== id),
        })),
        tipOverrides: remainingOverrides,
      };
    }),
  updatePerson: (id, updates) =>
    set((state) => ({
      people: state.people.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),
  addItem: (description, priceInCents) =>
    set((state) => ({
      items: [
        ...state.items,
        {
          id: crypto.randomUUID(),
          description,
          priceInCents,
          splitMode: 'shared',
          assignedTo: [],
        },
      ],
    })),
  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),
  updateItem: (id, updates) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    })),
  updateSettings: (updates) =>
    set((state) => ({
      settings: { ...state.settings, ...updates },
    })),
  setPersonTipOverride: (personId, tipPercent) =>
    set((state) => ({
      tipOverrides: { ...state.tipOverrides, [personId]: tipPercent },
    })),
  clearPersonTipOverride: (personId) =>
    set((state) => {
      const { [personId]: _, ...rest } = state.tipOverrides;
      return { tipOverrides: rest };
    }),
}));
