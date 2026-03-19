import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BillName } from '../BillName';
import { useBillStore } from '../../store/billStore';

beforeEach(() => {
  useBillStore.setState({
    billName: '',
    people: [],
    items: [],
    settings: { defaultTipPercent: 18, defaultTaxPercent: 0 },
    tipOverrides: {},
  });
});

describe('BillName', () => {
  it('renders placeholder when billName is empty', () => {
    render(<BillName />);
    expect(screen.getByText('Tap to name this bill')).toBeInTheDocument();
  });

  it('renders the bill name text when billName is set', () => {
    useBillStore.setState({ billName: 'Dinner at Luigi' });
    render(<BillName />);
    expect(screen.getByText('Dinner at Luigi')).toBeInTheDocument();
  });

  it('clicking the display element renders an input', async () => {
    const user = userEvent.setup();
    render(<BillName />);
    await user.click(screen.getByText('Tap to name this bill'));
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('typing and pressing Enter commits the value to the store', async () => {
    const user = userEvent.setup();
    render(<BillName />);
    await user.click(screen.getByText('Tap to name this bill'));
    await user.type(screen.getByRole('textbox'), 'Friday Dinner{Enter}');
    expect(useBillStore.getState().billName).toBe('Friday Dinner');
  });

  it('pressing Escape cancels edit and reverts without committing new text', async () => {
    useBillStore.setState({ billName: 'Original' });
    const user = userEvent.setup();
    render(<BillName />);
    await user.click(screen.getByText('Original'));
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), 'Changed{Escape}');
    expect(useBillStore.getState().billName).toBe('Original');
    expect(screen.getByText('Original')).toBeInTheDocument();
  });

  it('blurring the input commits the value', async () => {
    const user = userEvent.setup();
    render(<BillName />);
    await user.click(screen.getByText('Tap to name this bill'));
    await user.type(screen.getByRole('textbox'), 'Blur Test');
    await user.tab();
    expect(useBillStore.getState().billName).toBe('Blur Test');
  });

  it('committing a string of only spaces sets billName to empty', async () => {
    useBillStore.setState({ billName: 'Something' });
    const user = userEvent.setup();
    render(<BillName />);
    await user.click(screen.getByText('Something'));
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), '   {Enter}');
    expect(useBillStore.getState().billName).toBe('');
  });
});
