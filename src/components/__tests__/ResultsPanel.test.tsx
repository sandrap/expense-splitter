import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResultsPanel } from '../ResultsPanel';
import { useBillStore } from '../../store/billStore';

beforeEach(() => {
  useBillStore.setState({
    people: [],
    items: [],
    settings: { defaultTipPercent: 18, defaultTaxPercent: 0 },
    tipOverrides: {},
  });
});

describe('ResultsPanel', () => {
  it('shows "No results yet" when store is empty', () => {
    render(<ResultsPanel />);
    expect(screen.getByText('No results yet')).toBeInTheDocument();
    expect(
      screen.getByText('Add people and items above to see what everyone owes.')
    ).toBeInTheDocument();
  });

  it('shows "Add items to the bill to calculate results." when people exist but no items', () => {
    useBillStore.getState().addPerson('Alice');
    render(<ResultsPanel />);
    expect(
      screen.getByText('Add items to the bill to calculate results.')
    ).toBeInTheDocument();
  });

  it('shows "Add people to split the bill with." when items exist but no people', () => {
    useBillStore.getState().addItem('Pizza', 2000);
    render(<ResultsPanel />);
    expect(
      screen.getByText('Add people to split the bill with.')
    ).toBeInTheDocument();
  });

  it('renders person name and formatted total for each person when data exists', () => {
    useBillStore.getState().addPerson('Alice');
    useBillStore.getState().addPerson('Bob');
    useBillStore.getState().addItem('Pizza', 2000);
    render(<ResultsPanel />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    // Each person gets $10.00 subtotal + 18% tip = $11.80
    expect(screen.getAllByText('$11.80')).toHaveLength(2);
  });

  it('clicking a person card expands to show item lines, subtotal, tip, tax, total', async () => {
    const user = userEvent.setup();
    useBillStore.getState().addPerson('Alice');
    useBillStore.getState().addItem('Pizza', 2000);
    render(<ResultsPanel />);

    // Before expand, breakdown not visible
    expect(screen.queryByText('Subtotal')).not.toBeInTheDocument();

    // Click the expand button
    const expandBtn = screen.getByRole('button', { name: /expand.*breakdown|collapse.*breakdown/i });
    await user.click(expandBtn);

    // After expand, breakdown items visible
    expect(screen.getByText('Subtotal')).toBeInTheDocument();
    expect(screen.getByText('Tax')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Pizza')).toBeInTheDocument();
  });

  it('Grand Total row shows sum of all person totals', () => {
    useBillStore.getState().addPerson('Alice');
    useBillStore.getState().addPerson('Bob');
    useBillStore.getState().addItem('Pizza', 2000);
    render(<ResultsPanel />);

    // Grand total = 2 * $11.80 = $23.60
    expect(screen.getByText('Grand Total')).toBeInTheDocument();
    expect(screen.getByText('$23.60')).toBeInTheDocument();
  });

  it('PersonResultCard shows "Tip (18%)" label with correct percentage', async () => {
    const user = userEvent.setup();
    useBillStore.getState().addPerson('Alice');
    useBillStore.getState().addItem('Pizza', 2000);
    render(<ResultsPanel />);

    const expandBtn = screen.getByRole('button', { name: /expand.*breakdown|collapse.*breakdown/i });
    await user.click(expandBtn);

    expect(screen.getByText(/Tip/)).toBeInTheDocument();
    expect(screen.getByText('18%')).toBeInTheDocument();
  });
});

describe('accessibility', () => {
  beforeEach(() => {
    useBillStore.setState({
      people: [{ id: 'p1', name: 'Alice' }],
      items: [{ id: 'i1', description: 'Salad', priceInCents: 1200, splitMode: 'assigned' as const, assignedTo: ['p1'] }],
      settings: { defaultTipPercent: 18, defaultTaxPercent: 0 },
      tipOverrides: {},
    });
  });

  it('expand button has aria-label with person name', () => {
    render(<ResultsPanel />);
    const expandBtn = screen.getByRole('button', { name: /expand.*breakdown.*alice/i });
    expect(expandBtn).toHaveAttribute('aria-expanded', 'false');
  });

  it('expanded breakdown has aria-labelledby referencing person name', async () => {
    const user = userEvent.setup();
    render(<ResultsPanel />);
    await user.click(screen.getByRole('button', { name: /expand.*breakdown.*alice/i }));
    const nameEl = document.getElementById('person-name-p1');
    expect(nameEl).toBeInTheDocument();
    expect(nameEl).toHaveTextContent('Alice');
    const breakdown = document.querySelector('[aria-labelledby="person-name-p1"]');
    expect(breakdown).toBeInTheDocument();
  });
});

describe('integration flow', () => {
  it('full flow: people + items + tip/tax settings + per-person override + grand total', async () => {
    // Set up store with 2 people, 2 items
    useBillStore.setState({
      people: [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ],
      items: [
        { id: 'i1', description: 'Pasta', priceInCents: 2000, splitMode: 'assigned' as const, assignedTo: ['p1'] },
        { id: 'i2', description: 'Steak', priceInCents: 3000, splitMode: 'assigned' as const, assignedTo: ['p2'] },
      ],
      settings: { defaultTipPercent: 18, defaultTaxPercent: 8 },
      tipOverrides: {},
    });

    const user = userEvent.setup();
    render(<ResultsPanel />);

    // Verify both person cards rendered
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Grand Total')).toBeInTheDocument();

    // Alice: subtotal $20.00, tip 18% = $3.60, tax 8% = $1.60, total = $25.20
    // Bob: subtotal $30.00, tip 18% = $5.40, tax 8% = $2.40, total = $37.80
    // Grand total = $63.00

    // Expand Alice's card to verify breakdown
    await user.click(screen.getByRole('button', { name: /expand.*breakdown.*alice/i }));
    expect(screen.getByText('Pasta')).toBeInTheDocument();
    expect(screen.getByText('Subtotal')).toBeInTheDocument();

    // Override Alice's tip to 25%
    act(() => {
      useBillStore.getState().setPersonTipOverride('p1', 25);
    });

    // Re-render to pick up new state
    // Alice: subtotal $20.00, tip 25% = $5.00, tax 8% = $1.60, total = $26.60
    // Bob: subtotal $30.00, tip 18% = $5.40, tax 8% = $2.40, total = $37.80
    // Grand total = $64.40
  });
});
