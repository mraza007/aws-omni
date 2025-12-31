import { getAccounts, getAccount, updateLastUsed } from '@/shared/storage';
import { decrypt } from '@/shared/encryption';
import type { Message } from '@/shared/types';

const LOCAL_KEY = 'aws-switcher-local-key';

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(
  message: Message,
  _sender: chrome.runtime.MessageSender
): Promise<unknown> {
  switch (message.type) {
    case 'GET_ACCOUNTS':
      return getAccounts();

    case 'GET_DECRYPTED_CREDENTIALS': {
      const { accountId } = message.payload as { accountId: string };
      const account = await getAccount(accountId);

      if (!account?.iamCredentials?.username) {
        return { credentials: null };
      }

      try {
        let password = '';
        if (account.iamCredentials.encryptedPassword) {
          password = await decrypt(account.iamCredentials.encryptedPassword, LOCAL_KEY);
        }

        return {
          credentials: {
            username: account.iamCredentials.username,
            password,
          },
        };
      } catch {
        return { credentials: null, error: 'Failed to decrypt credentials' };
      }
    }

    case 'OPEN_CONSOLE': {
      const payload = message.payload as { accountId: string; region?: string };
      const account = await getAccount(payload.accountId);
      if (account) {
        const region = payload.region ?? account.defaultRegion;

        if (account.authType === 'sso' && account.ssoConfig) {
          // Open SSO portal
          chrome.tabs.create({ url: account.ssoConfig.startUrl });
        } else if (account.authType === 'iam' && account.iamCredentials?.username) {
          // For IAM users with credentials, open the sign-in page directly
          // Store pending sign-in info for auto-fill
          await chrome.storage.session.set({
            pendingSignIn: {
              accountId: account.id,
              awsAccountId: account.accountId,
              timestamp: Date.now(),
            },
          });

          // Open the account-specific sign-in page
          const signInUrl = `https://${account.accountId}.signin.aws.amazon.com/console`;
          chrome.tabs.create({ url: signInUrl });
        } else {
          // Default: open console directly (user may already be logged in)
          const url = `https://${region}.console.aws.amazon.com/console/home?region=${region}`;
          chrome.tabs.create({ url });
        }

        await updateLastUsed(account.id);
      }
      return { success: true };
    }

    default:
      return { error: 'Unknown message type' };
  }
}

// Handle keyboard shortcuts for quick account switching
chrome.commands.onCommand.addListener(async (command) => {
  if (command.startsWith('quick-switch-')) {
    const index = parseInt(command.replace('quick-switch-', '')) - 1;
    const accounts = await getAccounts();

    if (accounts[index]) {
      const account = accounts[index];

      if (account.authType === 'sso' && account.ssoConfig) {
        chrome.tabs.create({ url: account.ssoConfig.startUrl });
      } else if (account.authType === 'iam' && account.iamCredentials?.username) {
        await chrome.storage.session.set({
          pendingSignIn: {
            accountId: account.id,
            awsAccountId: account.accountId,
            timestamp: Date.now(),
          },
        });
        const signInUrl = `https://${account.accountId}.signin.aws.amazon.com/console`;
        chrome.tabs.create({ url: signInUrl });
      } else {
        const region = account.defaultRegion;
        const url = `https://${region}.console.aws.amazon.com/console/home?region=${region}`;
        chrome.tabs.create({ url });
      }

      await updateLastUsed(account.id);
    }
  }
});

// Context menu setup
async function setupContextMenus(): Promise<void> {
  // Remove existing menus
  await chrome.contextMenus.removeAll();

  const accounts = await getAccounts();
  const accountsWithCreds = accounts.filter((a) => a.iamCredentials?.username);

  if (accountsWithCreds.length === 0) return;

  // Create parent menu
  chrome.contextMenus.create({
    id: 'aws-switcher-parent',
    title: 'AWS OmniConsole',
    contexts: ['editable'],
    documentUrlPatterns: ['https://*.signin.aws.amazon.com/*'],
  });

  // Create menu item for each account
  accountsWithCreds.forEach((account, index) => {
    chrome.contextMenus.create({
      id: `aws-account-${account.id}`,
      parentId: 'aws-switcher-parent',
      title: `${account.name} (${account.iamCredentials?.username})`,
      contexts: ['editable'],
    });
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!info.menuItemId.toString().startsWith('aws-account-')) return;
  if (!tab?.id) return;

  const accountId = info.menuItemId.toString().replace('aws-account-', '');
  const account = await getAccount(accountId);

  if (!account?.iamCredentials) return;

  // Decrypt password
  let password = '';
  if (account.iamCredentials.encryptedPassword) {
    try {
      password = await decrypt(account.iamCredentials.encryptedPassword, LOCAL_KEY);
    } catch {
      password = '';
    }
  }

  // Send message to content script to fill form
  chrome.tabs.sendMessage(tab.id, {
    type: 'FILL_CREDENTIALS',
    payload: {
      accountId: account.accountId,
      username: account.iamCredentials.username,
      password,
    },
  });

  await updateLastUsed(account.id);
});

// Rebuild context menus when accounts change
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes['aws-switcher-data']) {
    setupContextMenus();
  }
});

// Initial setup
setupContextMenus();

console.log('AWS OmniConsole background service started');
