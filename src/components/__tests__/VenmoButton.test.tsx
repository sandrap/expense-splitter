import { render, screen } from '@testing-library/react';
import { VenmoButton } from '../VenmoButton';
import { useBillStore } from '../../store/billStore';

beforeEach(() => {
  useBillStore.setState({
    billName: 'Dinner at Olive Garden',
    people: [],
    items: [],
    settings: { defaultTipPercent: 18, defaultTaxPercent: 0 },
    tipOverrides: {},
  });
});

describe('VenmoButton', () => {
  it('renders an anchor tag when amountInCents > 0', () => {
    render(<VenmoButton amountInCents={4250} personName="Alice" />);
    const link = screen.getByRole('link', { name: /Pay Alice/i });
    expect(link).toBeInTheDocument();
    expect(link.tagName).toBe('A');
  });

  it('returns null when amountInCents is 0', () => {
    const { container } = render(<VenmoButton amountInCents={0} personName="Alice" />);
    expect(container.innerHTML).toBe('');
  });

  it('sets href to venmo.com URL with correct amount', () => {
    render(<VenmoButton amountInCents={4250} personName="Alice" />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toContain('https://venmo.com/');
    expect(link.getAttribute('href')).toContain('amount=42.50');
  });

  it('includes bill name from store in href note parameter', () => {
    render(<VenmoButton amountInCents={4250} personName="Alice" />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toContain('note=Dinner+at+Olive+Garden');
  });

  it('uses "Split bill" fallback when billName is empty', () => {
    useBillStore.setState({ billName: '' });
    render(<VenmoButton amountInCents={4250} personName="Alice" />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toContain('note=Split+bill');
  });

  it('opens in a new tab with security attributes', () => {
    render(<VenmoButton amountInCents={4250} personName="Alice" />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('has descriptive aria-label with person name and formatted amount', () => {
    render(<VenmoButton amountInCents={4250} personName="Alice" />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('aria-label')).toBe('Pay Alice $42.50 with Venmo');
  });

  it('displays "Pay with Venmo" text', () => {
    render(<VenmoButton amountInCents={4250} personName="Alice" />);
    expect(screen.getByText('Pay with Venmo')).toBeInTheDocument();
  });
});
