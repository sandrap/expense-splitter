import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ItemRow } from '../ItemRow';
import { useBillStore } from '../../store/billStore';
import type { Item } from '../../types/models';

function getItem(): Item {
  return useBillStore.getState().items[0];
}

beforeEach(() => {
  useBillStore.setState({
    people: [],
    items: [],
    settings: { defaultTipPercent: 18, defaultTaxPercent: 0 },
  });
  useBillStore.getState().addPerson('Alice');
  useBillStore.getState().addPerson('Bob');
  useBillStore.getState().addItem('Burger', 1250);
});

describe('ItemRow', () => {
  it('renders item name and formatted price', () => {
    render(<ItemRow item={getItem()} />);
    expect(screen.getByText('Burger')).toBeInTheDocument();
    expect(screen.getByText('$12.50')).toBeInTheDocument();
  });

  it('edits item description inline (ITEMS-02)', async () => {
    const user = userEvent.setup();
    render(<ItemRow item={getItem()} />);

    await user.click(screen.getByText('Burger'));
    const input = screen.getByDisplayValue('Burger');
    await user.clear(input);
    await user.type(input, 'Cheeseburger{Enter}');

    expect(useBillStore.getState().items[0].description).toBe('Cheeseburger');
  });

  it('edits item price inline (ITEMS-02)', async () => {
    const user = userEvent.setup();
    render(<ItemRow item={getItem()} />);

    await user.click(screen.getByText('$12.50'));
    const input = screen.getByDisplayValue('12.50');
    await user.clear(input);
    await user.type(input, '15.00{Enter}');

    expect(useBillStore.getState().items[0].priceInCents).toBe(1500);
  });

  it('assigns a person via chip toggle (ITEMS-03)', async () => {
    const user = userEvent.setup();
    render(<ItemRow item={getItem()} />);

    const aliceChip = screen.getByText('Alice');
    expect(aliceChip).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();

    await user.click(aliceChip);

    const aliceId = useBillStore.getState().people[0].id;
    expect(useBillStore.getState().items[0].assignedTo).toContain(aliceId);
  });

  it('unassigns a person by toggling chip off (ITEMS-03)', async () => {
    const user = userEvent.setup();
    const aliceId = useBillStore.getState().people[0].id;
    useBillStore.getState().updateItem(getItem().id, { assignedTo: [aliceId] });

    render(<ItemRow item={getItem()} />);
    await user.click(screen.getByText('Alice'));

    expect(useBillStore.getState().items[0].assignedTo).not.toContain(aliceId);
  });

  it('shows shared/assigned toggle and switches mode (ITEMS-04)', async () => {
    const user = userEvent.setup();
    render(<ItemRow item={getItem()} />);

    expect(screen.getByText('Shared')).toBeInTheDocument();
    expect(screen.getByText('Assigned')).toBeInTheDocument();

    await user.click(screen.getByText('Assigned'));
    expect(useBillStore.getState().items[0].splitMode).toBe('assigned');
  });

  it('shows unassigned warning when splitMode=assigned and no one assigned (ITEMS-04)', () => {
    const item = getItem();
    useBillStore.getState().updateItem(item.id, {
      splitMode: 'assigned',
      assignedTo: [],
    });

    render(<ItemRow item={useBillStore.getState().items[0]} />);
    expect(screen.getByText(/not assigned to anyone/i)).toBeInTheDocument();
  });

  it('hides unassigned warning when someone is assigned (ITEMS-04)', () => {
    const item = getItem();
    const aliceId = useBillStore.getState().people[0].id;
    useBillStore.getState().updateItem(item.id, {
      splitMode: 'assigned',
      assignedTo: [aliceId],
    });

    render(<ItemRow item={useBillStore.getState().items[0]} />);
    expect(screen.queryByText(/not assigned to anyone/i)).not.toBeInTheDocument();
  });

  it('shows hint when no people exist (ITEMS-03)', () => {
    useBillStore.setState({
      people: [],
      items: useBillStore.getState().items,
      settings: { defaultTipPercent: 18, defaultTaxPercent: 0 },
    });

    render(<ItemRow item={getItem()} />);
    expect(screen.getByText(/add people first/i)).toBeInTheDocument();
  });
});
