import { render, screen } from '@testing-library/react';
import App from '../../App';
import { useBillStore } from '../../store/billStore';
import { encodeState } from '../../utils/urlState';

beforeEach(() => {
  useBillStore.setState({
    billName: '',
    people: [],
    items: [],
    settings: { defaultTipPercent: 18, defaultTaxPercent: 0 },
    tipOverrides: {},
  });
  // Reset location hash
  window.location.hash = '';
});

describe('App', () => {
  it('when hash is empty on mount, billName remains empty', () => {
    render(<App />);
    expect(useBillStore.getState().billName).toBe('');
  });

  it('hydrates store from valid URL hash on mount', () => {
    const stateToEncode = {
      billName: 'My Test Bill',
      people: [],
      items: [],
      settings: { defaultTipPercent: 18, defaultTaxPercent: 0 },
      tipOverrides: {},
    };
    const encoded = encodeState(stateToEncode);
    window.location.hash = `#${encoded}`;
    render(<App />);
    expect(useBillStore.getState().billName).toBe('My Test Bill');
  });

  it('when hash contains malformed string, billName remains empty', () => {
    window.location.hash = '#garbage';
    render(<App />);
    expect(useBillStore.getState().billName).toBe('');
  });

  it('the header renders an h1 with text "Split the Bill"', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Split the Bill', level: 1 })).toBeInTheDocument();
  });

  it('the header renders a button with aria-label "Share bill"', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'Share bill' })).toBeInTheDocument();
  });
});
