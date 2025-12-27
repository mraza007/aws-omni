// Detect current AWS account from the console page and show banner

interface AWSAccountInfo {
  accountId: string;
  accountAlias?: string;
  region: string;
  userName?: string;
}

interface StoredAccount {
  id: string;
  name: string;
  accountId: string;
  color?: string;
  clientName?: string;
}

function detectAccountInfo(): AWSAccountInfo | null {
  const accountId = detectAccountId();
  const region = detectRegion();

  if (!accountId || !region) {
    return null;
  }

  return {
    accountId,
    region,
    accountAlias: detectAccountAlias(),
    userName: detectUserName(),
  };
}

function detectAccountId(): string | null {
  // Method 1: From the account menu button text
  const menuButton = document.querySelector('[data-testid="awsc-nav-account-menu-button"]');
  if (menuButton) {
    const match = menuButton.textContent?.match(/(\d{12})/);
    if (match) return match[1];
  }

  // Method 2: From account detail menu
  const accountMenuText = document.querySelector('[data-testid="account-detail-menu"]')?.textContent;
  if (accountMenuText) {
    const match = accountMenuText.match(/(\d{12})/);
    if (match) return match[1];
  }

  // Method 3: From URL
  const urlMatch = window.location.href.match(/account[_-]?id[=:](\d{12})/i);
  if (urlMatch) return urlMatch[1];

  // Method 4: From the global nav header
  const globalNav = document.getElementById('awsc-nav-header');
  if (globalNav) {
    const match = globalNav.textContent?.match(/(\d{12})/);
    if (match) return match[1];
  }

  // Method 5: Look for account ID pattern anywhere in nav
  const navElements = document.querySelectorAll('nav span, nav button, header span');
  for (const el of navElements) {
    const match = el.textContent?.match(/(\d{12})/);
    if (match) return match[1];
  }

  return null;
}

function detectRegion(): string | null {
  // From URL subdomain
  const urlMatch = window.location.hostname.match(/^([a-z]{2}-[a-z]+-\d+)\./);
  if (urlMatch) return urlMatch[1];

  // From URL query/path
  const pathMatch = window.location.href.match(/region=([a-z]{2}-[a-z]+-\d+)/);
  if (pathMatch) return pathMatch[1];

  // From region selector in nav
  const regionSelector = document.querySelector('[data-testid="awsc-nav-regions-menu-button"]');
  if (regionSelector) {
    const match = regionSelector.textContent?.match(/([a-z]{2}-[a-z]+-\d+)/);
    if (match) return match[1];
  }

  // Default for global console
  if (window.location.hostname === 'console.aws.amazon.com') {
    return 'us-east-1';
  }

  return null;
}

function detectAccountAlias(): string | undefined {
  const accountMenu = document.querySelector('[data-testid="account-detail-menu"]');
  if (accountMenu) {
    const text = accountMenu.textContent ?? '';
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines[0] && !lines[0].match(/^\d{12}$/)) {
      return lines[0];
    }
  }
  return undefined;
}

function detectUserName(): string | undefined {
  const userElement = document.querySelector('[data-testid="awsc-nav-account-menu-button"]');
  if (userElement) {
    const text = userElement.textContent ?? '';
    const match = text.match(/^([^@]+)@/);
    if (match) return match[1].trim();
  }
  return undefined;
}

async function getStoredAccount(accountId: string): Promise<StoredAccount | null> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: 'GET_ACCOUNT_BY_AWS_ID', payload: { accountId } },
      (response) => {
        resolve(response?.account ?? null);
      }
    );
  });
}

function injectBannerStyles(): void {
  if (document.getElementById('aws-switcher-styles')) return;

  const style = document.createElement('style');
  style.id = 'aws-switcher-styles';
  style.textContent = `
    #aws-switcher-banner {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 8px 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      transition: transform 0.2s ease;
    }

    #aws-switcher-banner.aws-switcher-hidden {
      transform: translateY(-100%);
    }

    #aws-switcher-banner .aws-switcher-content {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    #aws-switcher-banner .aws-switcher-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    #aws-switcher-banner .aws-switcher-name {
      font-weight: 600;
      color: white;
    }

    #aws-switcher-banner .aws-switcher-id {
      opacity: 0.8;
      font-size: 12px;
      font-family: monospace;
    }

    #aws-switcher-banner .aws-switcher-divider {
      opacity: 0.4;
      margin: 0 4px;
    }

    #aws-switcher-banner .aws-switcher-region {
      background: rgba(255, 255, 255, 0.2);
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 12px;
    }

    #aws-switcher-banner .aws-switcher-client {
      opacity: 0.7;
      font-size: 12px;
    }

    #aws-switcher-banner .aws-switcher-close {
      position: absolute;
      right: 12px;
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      font-size: 16px;
      cursor: pointer;
      opacity: 0.7;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }

    #aws-switcher-banner .aws-switcher-close:hover {
      opacity: 1;
      background: rgba(255, 255, 255, 0.3);
    }

    /* Push AWS console content down */
    html:has(#aws-switcher-banner:not(.aws-switcher-hidden)) {
      margin-top: 40px !important;
    }
  `;
  document.head.appendChild(style);
}

async function injectAccountBanner(info: AWSAccountInfo): Promise<void> {
  // Remove existing banner
  document.getElementById('aws-switcher-banner')?.remove();

  // Inject styles
  injectBannerStyles();

  // Get stored account info
  const storedAccount = await getStoredAccount(info.accountId);

  // Determine display values
  const displayName = storedAccount?.name ?? info.accountAlias ?? 'Unknown Account';
  const color = storedAccount?.color ?? '#6b7280';
  const clientName = storedAccount?.clientName;

  // Create banner
  const banner = document.createElement('div');
  banner.id = 'aws-switcher-banner';
  banner.style.background = `linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -20)} 100%)`;
  banner.style.color = 'white';

  banner.innerHTML = `
    <div class="aws-switcher-content">
      <span class="aws-switcher-dot" style="background: rgba(255,255,255,0.9); box-shadow: 0 0 6px rgba(255,255,255,0.5);"></span>
      <span class="aws-switcher-name">${escapeHtml(displayName)}</span>
      <span class="aws-switcher-id">${info.accountId}</span>
      <span class="aws-switcher-divider">|</span>
      <span class="aws-switcher-region">${info.region}</span>
      ${clientName ? `<span class="aws-switcher-divider">|</span><span class="aws-switcher-client">${escapeHtml(clientName)}</span>` : ''}
    </div>
    <button class="aws-switcher-close" title="Hide banner">&times;</button>
  `;

  banner.querySelector('.aws-switcher-close')?.addEventListener('click', () => {
    banner.classList.add('aws-switcher-hidden');
    // Remember preference for this session
    sessionStorage.setItem('aws-switcher-banner-hidden', 'true');
  });

  // Check if user previously hid the banner
  if (sessionStorage.getItem('aws-switcher-banner-hidden') === 'true') {
    banner.classList.add('aws-switcher-hidden');
  }

  document.body.prepend(banner);
}

function adjustColor(hex: string, percent: number): string {
  // Darken or lighten a hex color
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function sendAccountInfo(info: AWSAccountInfo): void {
  chrome.runtime.sendMessage({
    type: 'ACCOUNT_DETECTED',
    payload: info,
  });
}

let lastAccountId: string | null = null;

function runDetection(): void {
  const info = detectAccountInfo();
  if (info && info.accountId !== lastAccountId) {
    lastAccountId = info.accountId;
    sendAccountInfo(info);
    injectAccountBanner(info);
  }
}

function init(): void {
  // Initial detection with delay for AWS console to load
  setTimeout(runDetection, 1500);

  // Re-detect periodically (AWS console is a SPA)
  setInterval(runDetection, 3000);

  // Also detect on URL changes
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(runDetection, 1000);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

init();
