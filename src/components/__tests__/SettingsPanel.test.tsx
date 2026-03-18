import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPanel } from '../SettingsPanel';
import { useBillStore } from '../../store/billStore';

beforeEach(() => {
  useBillStore.setState({
    people: [],
    items: [],
    settings: { defaultTipPercent: 18, defaultTaxPercent: 0 },
    tipOverrides: {},
  });
});

describe('SettingsPanel', () => {
  it('renders heading "Tip & Tax"', () => {
    render(<SettingsPanel />);
    expect(screen.getByText('Tip & Tax')).toBeInTheDocument();
  });

  it('renders 5 tip buttons (15%, 18%, 20%, 25%, Custom %)', () => {
    render(<SettingsPanel />);
    expect(screen.getByRole('radio', { name: '15%' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '18%' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '20%' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '25%' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Custom %' })).toBeInTheDocument();
  });

  it('18% button has aria-checked="true" by default', () => {
    render(<SettingsPanel />);
    expect(screen.getByRole('radio', { name: '18%' })).toHaveAttribute('aria-checked', 'true');
  });

  it('clicking 20% button calls updateSettings with defaultTipPercent: 20', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel />);

    await user.click(screen.getByRole('radio', { name: '20%' }));

    expect(useBillStore.getState().settings.defaultTipPercent).toBe(20);
  });

  it('clicking "Custom %" shows an input field', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel />);

    await user.click(screen.getByRole('radio', { name: 'Custom %' }));

    expect(screen.getByPlaceholderText('%')).toBeInTheDocument();
  });

  it('typing "22" in custom input and pressing Enter calls updateSettings with defaultTipPercent: 22', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel />);

    await user.click(screen.getByRole('radio', { name: 'Custom %' }));
    const input = screen.getByPlaceholderText('%');
    await user.type(input, '22{Enter}');

    expect(useBillStore.getState().settings.defaultTipPercent).toBe(22);
  });

  it('renders tax input with placeholder "0"', () => {
    render(<SettingsPanel />);
    expect(screen.getByPlaceholderText('0')).toBeInTheDocument();
  });

  it('typing "8.875" in tax input and pressing Enter calls updateSettings with defaultTaxPercent: 8.875', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel />);

    const input = screen.getByPlaceholderText('0');
    await user.type(input, '8.875{Enter}');

    expect(useBillStore.getState().settings.defaultTaxPercent).toBe(8.875);
  });
});

describe('input validation edge cases', () => {
  it('rejects empty custom tip input on Enter', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel />);
    await user.click(screen.getByRole('radio', { name: 'Custom %' }));
    // Input starts empty; press Enter directly
    await user.keyboard('{Enter}');
    expect(useBillStore.getState().settings.defaultTipPercent).toBe(18);
  });

  it('rejects negative custom tip input', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel />);
    await user.click(screen.getByRole('radio', { name: 'Custom %' }));
    const input = screen.getByPlaceholderText('%');
    await user.type(input, '-5{Enter}');
    expect(useBillStore.getState().settings.defaultTipPercent).toBe(18);
  });

  it('rejects tip percentage over 100', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel />);
    await user.click(screen.getByRole('radio', { name: 'Custom %' }));
    const input = screen.getByPlaceholderText('%');
    await user.type(input, '200{Enter}');
    expect(useBillStore.getState().settings.defaultTipPercent).toBe(18);
  });

  it('rejects non-numeric tax input', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel />);
    const taxInput = screen.getByPlaceholderText('0');
    await user.type(taxInput, 'abc{Enter}');
    expect(useBillStore.getState().settings.defaultTaxPercent).toBe(0);
  });

  it('rejects negative tax input', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel />);
    const taxInput = screen.getByPlaceholderText('0');
    await user.type(taxInput, '-1{Enter}');
    expect(useBillStore.getState().settings.defaultTaxPercent).toBe(0);
  });
});

describe('isCustom initialization', () => {
  it('shows custom input on mount when defaultTipPercent is non-preset', () => {
    useBillStore.setState({
      settings: { defaultTipPercent: 22, defaultTaxPercent: 0 },
    });
    render(<SettingsPanel />);
    expect(screen.getByRole('radio', { name: 'Custom %' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByPlaceholderText('%')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('%')).toHaveValue('22');
  });
});
