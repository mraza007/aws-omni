// Login helper for AWS sign-in page
// Handles credential filling from context menu and auto sign-in

interface PendingSignIn {
  accountId: string;
  awsAccountId: string;
  timestamp: number;
}

interface DecryptedCredentials {
  username: string;
  password: string;
}

interface FillCredentialsMessage {
  type: 'FILL_CREDENTIALS';
  payload: {
    accountId: string;
    username: string;
    password: string;
  };
}

async function getDecryptedCredentials(accountId: string): Promise<DecryptedCredentials | null> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: 'GET_DECRYPTED_CREDENTIALS', payload: { accountId } },
      (response) => {
        resolve(response?.credentials ?? null);
      }
    );
  });
}

function fillAndSubmitForm(accountId: string, username: string, password: string, autoSubmit = true): void {
  // Account ID field
  const accountField = document.querySelector<HTMLInputElement>(
    '#account, input[name="account"], input[id*="accountId"]'
  );
  if (accountField && !accountField.disabled) {
    accountField.value = accountId;
    accountField.dispatchEvent(new Event('input', { bubbles: true }));
    accountField.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Username field
  const usernameField = document.querySelector<HTMLInputElement>(
    '#username, input[name="username"]'
  );
  if (usernameField && !usernameField.disabled) {
    usernameField.value = username;
    usernameField.dispatchEvent(new Event('input', { bubbles: true }));
    usernameField.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Password field
  const passwordField = document.querySelector<HTMLInputElement>(
    '#password, input[type="password"]'
  );
  if (passwordField && password && !passwordField.disabled) {
    passwordField.value = password;
    passwordField.dispatchEvent(new Event('input', { bubbles: true }));
    passwordField.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Auto-submit if requested
  if (autoSubmit) {
    setTimeout(() => {
      // Be very specific - only click the actual sign-in button
      // Look for the primary submit button in the sign-in form
      const signInForm = document.querySelector('#signin-form, form[name="signIn"], .signin-card form');

      // Try specific AWS sign-in button selectors
      let submitButton = document.querySelector<HTMLButtonElement>('#signin_button');

      if (!submitButton) {
        submitButton = document.querySelector<HTMLButtonElement>('button[data-testid="signin-button"]');
      }

      if (!submitButton && signInForm) {
        // Only look within the sign-in form for submit button
        submitButton = signInForm.querySelector<HTMLButtonElement>('button[type="submit"]');
      }

      // Fallback: find button with "Sign in" text
      if (!submitButton) {
        const buttons = document.querySelectorAll<HTMLButtonElement>('button');
        for (const btn of buttons) {
          if (btn.textContent?.toLowerCase().includes('sign in') && !btn.disabled) {
            submitButton = btn;
            break;
          }
        }
      }

      if (submitButton && !submitButton.disabled) {
        submitButton.click();
      }
    }, 150);
  }
}

// Listen for messages from background script (context menu clicks)
chrome.runtime.onMessage.addListener((message: FillCredentialsMessage, _sender, sendResponse) => {
  if (message.type === 'FILL_CREDENTIALS') {
    const { accountId, username, password } = message.payload;

    // Close any open modals/dialogs first
    const closeButtons = document.querySelectorAll<HTMLButtonElement>(
      '[aria-label="Close"], .modal-close, button[data-dismiss="modal"]'
    );
    closeButtons.forEach((btn) => btn.click());

    // Small delay to let modal close, then fill (no auto-submit for context menu)
    setTimeout(() => {
      fillAndSubmitForm(accountId, username, password, false);
    }, 100);

    sendResponse({ success: true });
  }
  return true;
});

// Handle pending sign-in (from popup click)
async function checkPendingSignIn(): Promise<void> {
  try {
    const result = await chrome.storage.session.get('pendingSignIn');
    const pending = result.pendingSignIn as PendingSignIn | undefined;

    if (!pending) return;

    // Clear immediately
    await chrome.storage.session.remove('pendingSignIn');

    // Check if recent (30 seconds)
    if (Date.now() - pending.timestamp > 30000) return;

    // Wait for form
    await waitForForm();

    // Sign in
    const creds = await getDecryptedCredentials(pending.accountId);
    if (creds) {
      fillAndSubmitForm(pending.awsAccountId, creds.username, creds.password, true);
    }
  } catch (e) {
    console.error('AWS OmniConsole: Auto sign-in error', e);
  }
}

function waitForForm(): Promise<void> {
  return new Promise((resolve) => {
    const check = () => {
      const hasForm =
        document.querySelector('#username, input[name="username"]') ||
        document.querySelector('#password, input[type="password"]') ||
        document.querySelector('#account, input[name="account"]');

      if (hasForm) {
        resolve();
      } else {
        setTimeout(check, 200);
      }
    };

    setTimeout(check, 300);
    setTimeout(resolve, 10000); // Timeout
  });
}

function init(): void {
  if (!window.location.hostname.includes('signin.aws.amazon.com')) {
    return;
  }

  // Check for pending auto sign-in
  checkPendingSignIn();
}

init();
