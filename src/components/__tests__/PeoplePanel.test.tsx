import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PeoplePanel } from '../PeoplePanel';
import { useBillStore } from '../../store/billStore';

beforeEach(() => {
  useBillStore.setState({
    people: [],
    items: [],
    settings: { defaultTipPercent: 18, defaultTaxPercent: 0 },
  });
});

describe('PeoplePanel', () => {
  it('shows empty state when no people added', () => {
    render(<PeoplePanel />);
    expect(screen.getByText(/no people added yet/i)).toBeInTheDocument();
  });

  it('adds a person when name is submitted (PEOPLE-01)', async () => {
    const user = userEvent.setup();
    render(<PeoplePanel />);

    const input = screen.getByPlaceholderText(/enter name/i);
    await user.type(input, 'Alice');
    await user.click(screen.getByText('Add Person'));

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('adds person on Enter key press (PEOPLE-01)', async () => {
    const user = userEvent.setup();
    render(<PeoplePanel />);

    const input = screen.getByPlaceholderText(/enter name/i);
    await user.type(input, 'Bob{Enter}');

    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('does not add person with empty name', async () => {
    const user = userEvent.setup();
    render(<PeoplePanel />);

    await user.click(screen.getByText('Add Person'));

    expect(screen.getByText(/no people added yet/i)).toBeInTheDocument();
  });

  it('removes a person (PEOPLE-02)', async () => {
    const user = userEvent.setup();
    useBillStore.getState().addPerson('Alice');
    render(<PeoplePanel />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    await user.click(screen.getByText('Remove Person'));

    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    expect(screen.getByText(/no people added yet/i)).toBeInTheDocument();
  });

  it('edits a person name inline (PEOPLE-03)', async () => {
    const user = userEvent.setup();
    useBillStore.getState().addPerson('Alice');
    render(<PeoplePanel />);

    await user.click(screen.getByText('Alice'));
    const input = screen.getByDisplayValue('Alice');
    await user.clear(input);
    await user.type(input, 'Alicia{Enter}');

    expect(screen.getByText('Alicia')).toBeInTheDocument();
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });

  it('cancels edit on Escape (PEOPLE-03)', async () => {
    const user = userEvent.setup();
    useBillStore.getState().addPerson('Alice');
    render(<PeoplePanel />);

    await user.click(screen.getByText('Alice'));
    const input = screen.getByDisplayValue('Alice');
    await user.clear(input);
    await user.type(input, 'Wrong{Escape}');

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Wrong')).not.toBeInTheDocument();
  });
});
