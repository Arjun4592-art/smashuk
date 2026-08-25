declare global {
  interface Window {
    StripeTerminal?: any;
  }
}
let terminalInstance: any = null;
let scriptLoadPromise: Promise<void> | null = null;
function loadTerminalScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Client only'));
  if (window.StripeTerminal) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/terminal/v1/';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Stripe Terminal SDK'));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}
async function fetchConnectionToken(): Promise<string> {
  const res = await fetch('/api/pos/stripe/connection-token', {
    method: 'POST',
    credentials: 'include'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Failed to fetch connection token');
  return data.secret;
}
export async function getTerminal(onUnexpectedDisconnect?: () => void) {
  await loadTerminalScript();
  if (!terminalInstance) {
    terminalInstance = window.StripeTerminal!.create({
      onFetchConnectionToken: fetchConnectionToken,
      onUnexpectedReaderDisconnect: () => {
        terminalInstance = null;
        onUnexpectedDisconnect?.();
      }
    });
  }
  return terminalInstance;
}
export interface TerminalPaymentResult {
  success: boolean;
  paymentIntentId?: string;
  error?: string;
}
export async function collectCardPresentPayment(amountInPence: number, options: {
  simulated?: boolean;
  onStatus?: (msg: string) => void;
} = {}): Promise<TerminalPaymentResult> {
  const {
    simulated = true,
    onStatus
  } = options;
  try {
    const terminal = await getTerminal();
    onStatus?.('Looking for a card reader…');
    const discoverResult = await terminal.discoverReaders({
      simulated
    });
    if (discoverResult.error) {
      return {
        success: false,
        error: discoverResult.error.message
      };
    }
    if (!discoverResult.discoveredReaders?.length) {
      return {
        success: false,
        error: simulated ? 'No simulated reader available.' : 'No card reader found. Check it is powered on and on the same network, or set up a Location/Reader in the Stripe Dashboard.'
      };
    }
    onStatus?.('Connecting to reader…');
    const connectResult = await terminal.connectReader(discoverResult.discoveredReaders[0]);
    if (connectResult.error) {
      return {
        success: false,
        error: connectResult.error.message
      };
    }
    onStatus?.('Creating payment…');
    const piRes = await fetch('/api/pos/stripe/payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        amount: amountInPence,
        currency: 'gbp'
      })
    });
    const piData = await piRes.json();
    if (!piRes.ok) {
      return {
        success: false,
        error: piData.error ?? 'Payment intent create failed'
      };
    }
    onStatus?.(simulated ? 'Simulating card tap…' : 'Waiting for card — tap, insert or swipe…');
    const collectResult = await terminal.collectPaymentMethod(piData.client_secret);
    if (collectResult.error) {
      return {
        success: false,
        error: collectResult.error.message
      };
    }
    onStatus?.('Processing payment…');
    const processResult = await terminal.processPayment(collectResult.paymentIntent);
    if (processResult.error) {
      return {
        success: false,
        error: processResult.error.message
      };
    }
    return {
      success: true,
      paymentIntentId: processResult.paymentIntent.id
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Card payment failed'
    };
  }
}
