import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ItemsPanel } from '../ItemsPanel';
import { useBillStore } from '../../store/billStore';

beforeEach(() => {
  useBillStore.setState({
    people: [],
    items: [],
    settings: { defaultTipPercent: 18, defaultTaxPercent: 0 },
  });
});

describe('ItemsPanel', () => {
  it('shows empty state when no items (ITEMS-01)', () => {
    render(<ItemsPanel />);
    expect(screen.getByText(/no items yet/i)).toBeInTheDocument();
  });

  it('adds an item with name and price (ITEMS-01)', async () => {
    const user = userEvent.setup();
    render(<ItemsPanel />);

    await user.type(screen.getByPlaceholderText(/item name/i), 'Burger');
    await user.type(screen.getByPlaceholderText('$0.00'), '12.50');
    await user.click(screen.getByText('Add Item'));

    expect(screen.getByText('Burger')).toBeInTheDocument();
    expect(screen.getByText('$12.50')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/item name/i)).toHaveValue('');
    expect(screen.getByPlaceholderText('$0.00')).toHaveValue('');
  });

  it('adds item on Enter in price field (ITEMS-01)', async () => {
    const user = userEvent.setup();
    render(<ItemsPanel />);

    await user.type(screen.getByPlaceholderText(/item name/i), 'Fries');
    await user.type(screen.getByPlaceholderText('$0.00'), '5.99{Enter}');

    expect(screen.getByText('Fries')).toBeInTheDocument();
    expect(screen.getByText('$5.99')).toBeInTheDocument();
  });

  it('shows error for invalid price (ITEMS-01)', async () => {
    const user = userEvent.setup();
    render(<ItemsPanel />);

    await user.type(screen.getByPlaceholderText(/item name/i), 'Salad');
    await user.type(screen.getByPlaceholderText('$0.00'), 'abc');
    await user.click(screen.getByText('Add Item'));

    expect(screen.getByText(/enter a valid price/i)).toBeInTheDocument();
  });

  it('does not add item with empty name', async () => {
    const user = userEvent.setup();
    render(<ItemsPanel />);

    await user.type(screen.getByPlaceholderText('$0.00'), '10.00');
    await user.click(screen.getByText('Add Item'));

    expect(screen.getByText(/no items yet/i)).toBeInTheDocument();
  });

  it('deletes an item (ITEMS-02)', async () => {
    const user = userEvent.setup();
    useBillStore.getState().addItem('Burger', 1250);
    render(<ItemsPanel />);

    expect(screen.getByText('Burger')).toBeInTheDocument();
    await user.click(screen.getByText('Remove'));

    expect(screen.queryByText('Burger')).not.toBeInTheDocument();
    expect(screen.getByText(/no items yet/i)).toBeInTheDocument();
  });
});
