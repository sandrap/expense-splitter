export interface Person {
  id: string;
  name: string;
}

export interface Item {
  id: string;
  description: string;
  priceInCents: number;
  splitMode: 'shared' | 'assigned';
  assignedTo: string[];
}

export interface BillSettings {
  defaultTipPercent: number;
  defaultTaxPercent: number;
}

export interface AppState {
  people: Person[];
  items: Item[];
  settings: BillSettings;
}

export interface ItemLine {
  itemId: string;
  description: string;
  shareInCents: number;
}

export interface PersonResult {
  personId: string;
  name: string;
  itemLines: ItemLine[];
  subtotalInCents: number;
  tipInCents: number;
  taxInCents: number;
  totalInCents: number;
}
