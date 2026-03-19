import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShareButton } from '../ShareButton';
import { useBillStore } from '../../store/billStore';

beforeEach(() => {
  useBillStore.setState({
    billName: 'Test Bill',
    people: [],
    items: [],
    settings: { defaultTipPercent: 18, defaultTaxPercent: 0 },
    tipOverrides: {},
  });
  // Restore clipboard mock
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ShareButton', () => {
  it('renders a button with the given label', () => {
    render(<ShareButton label="Share this split" />);
    expect(screen.getByRole('button', { name: 'Share this split' })).toBeInTheDocument();
  });

  it('clicking the button calls navigator.clipboard.writeText with a URL containing #', async () => {
    const user = userEvent.setup();
    render(<ShareButton label="Share" />);
    await user.click(screen.getByRole('button', { name: 'Share' }));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('#')
      );
    });
  });

  it('after clipboard success, a toast with "Link copied!" is visible', async () => {
    const user = userEvent.setup();
    render(<ShareButton label="Share" />);
    await user.click(screen.getByRole('button', { name: 'Share' }));
    await waitFor(() => {
      expect(screen.getByText('Link copied!')).toBeInTheDocument();
    });
  });

  it('when clipboard writeText rejects, the fallback modal appears', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('not allowed')),
      },
    });
    const user = userEvent.setup();
    render(<ShareButton label="Share" />);
    await user.click(screen.getByRole('button', { name: 'Share' }));
    await waitFor(() => {
      expect(screen.getByText('Copy this link')).toBeInTheDocument();
    });
  });

  it('fallback modal contains a textarea with the URL', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('not allowed')),
      },
    });
    const user = userEvent.setup();
    render(<ShareButton label="Share" />);
    await user.click(screen.getByRole('button', { name: 'Share' }));
    await waitFor(() => {
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
      expect((textarea as HTMLTextAreaElement).value).toContain('#');
    });
  });

  it('fallback modal can be closed by clicking "Got it"', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('not allowed')),
      },
    });
    const user = userEvent.setup();
    render(<ShareButton label="Share" />);
    await user.click(screen.getByRole('button', { name: 'Share' }));
    await waitFor(() => {
      expect(screen.getByText('Copy this link')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Got it'));
    expect(screen.queryByText('Copy this link')).not.toBeInTheDocument();
  });
});
