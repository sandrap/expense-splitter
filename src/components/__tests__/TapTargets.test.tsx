import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { PersonRow } from '../PersonRow';
import { ItemRow } from '../ItemRow';
import { PersonResultCard } from '../PersonResultCard';
import { useBillStore } from '../../store/billStore';
import type { PersonResult } from '../../types/models';

beforeEach(() => {
  useBillStore.setState({
    people: [],
    items: [],
    settings: { defaultTipPercent: 18, defaultTaxPercent: 0 },
    tipOverrides: {},
  });
});

describe('Tap target compliance (SC-2)', () => {
  it('PersonRow name span has 44px tap target', () => {
    const person = { id: 'p1', name: 'Alice' };
    render(<PersonRow person={person} />);
    const nameSpan = screen.getByText('Alice');
    expect(nameSpan.className).toContain('min-h-[44px]');
    expect(nameSpan.className).toContain('inline-flex');
    expect(nameSpan.className).toContain('items-center');
  });

  it('ItemRow description span has 44px tap target', () => {
    useBillStore.getState().addItem('Burger', 1250);
    const item = useBillStore.getState().items[0];
    render(<ItemRow item={item} />);
    const descSpan = screen.getByText('Burger');
    expect(descSpan.className).toContain('min-h-[44px]');
    expect(descSpan.className).toContain('inline-flex');
    expect(descSpan.className).toContain('items-center');
  });

  it('ItemRow price span has 44px tap target', () => {
    useBillStore.getState().addItem('Burger', 1250);
    const item = useBillStore.getState().items[0];
    render(<ItemRow item={item} />);
    const priceSpan = screen.getByText('$12.50');
    expect(priceSpan.className).toContain('min-h-[44px]');
    expect(priceSpan.className).toContain('inline-flex');
    expect(priceSpan.className).toContain('items-center');
  });

  it('ItemRow Shared/Assigned toggle buttons have 44px tap target', () => {
    useBillStore.getState().addItem('Burger', 1250);
    const item = useBillStore.getState().items[0];
    render(<ItemRow item={item} />);
    const sharedBtn = screen.getByText('Shared');
    const assignedBtn = screen.getByText('Assigned');
    expect(sharedBtn.className).toContain('min-h-[44px]');
    expect(assignedBtn.className).toContain('min-h-[44px]');
  });

  it('ItemRow Remove button has 44px min-width tap target', () => {
    useBillStore.getState().addItem('Burger', 1250);
    const item = useBillStore.getState().items[0];
    render(<ItemRow item={item} />);
    const removeBtn = screen.getByText('Remove');
    expect(removeBtn.className).toContain('min-h-[44px]');
    expect(removeBtn.className).toContain('min-w-[44px]');
  });

  it('PersonResultCard tip span has 44px tap target', () => {
    const result: PersonResult = {
      personId: 'p1',
      name: 'Alice',
      itemLines: [{ itemId: 'i1', description: 'Burger', shareInCents: 1000 }],
      subtotalInCents: 1000,
      tipInCents: 180,
      taxInCents: 0,
      totalInCents: 1180,
    };
    render(
      <PersonResultCard
        result={result}
        isExpanded={true}
        onToggle={() => {}}
        tipOverride={undefined}
        defaultTip={18}
        onTipOverride={() => {}}
        onClearTipOverride={() => {}}
      />
    );
    const tipSpan = screen.getByText('18%');
    expect(tipSpan.className).toContain('min-h-[44px]');
    expect(tipSpan.className).toContain('inline-flex');
    expect(tipSpan.className).toContain('items-center');
  });
});
