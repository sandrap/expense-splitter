import { render, screen } from '@testing-library/react';
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
    const expandBtn = screen.getByRole('button', { name: /toggle/i });
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

    const expandBtn = screen.getByRole('button', { name: /toggle/i });
    await user.click(expandBtn);

    expect(screen.getByText(/Tip/)).toBeInTheDocument();
    expect(screen.getByText('18%')).toBeInTheDocument();
  });
});
