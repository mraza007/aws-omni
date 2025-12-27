# AWS OmniConsole Privacy Policy

**Last Updated:** December 27, 2025

## Overview

AWS OmniConsole is a browser extension that helps you manage multiple AWS accounts. Your privacy is important to us, and this extension is designed with privacy as a core principle.

## Data Collection

**We do not collect any data.** This extension does not transmit any information to external servers.

## Data Storage

All data is stored locally in your browser using the browser's built-in storage API:

- **Account Information:** Account names, AWS account IDs, regions, colors, and group assignments are stored locally on your device.
- **Credentials:** If you choose to save AWS credentials, they are encrypted using AES-GCM encryption before being stored locally. The encryption key is derived from a password you set.
- **Preferences:** Your extension settings and preferences are stored locally.

## Data Sharing

**We do not share any data.** Since no data is collected or transmitted, there is nothing to share with third parties.

## Third-Party Services

This extension only communicates with official AWS domains to facilitate the sign-in process:

- `*.aws.amazon.com`
- `*.console.aws.amazon.com`
- `signin.aws.amazon.com`
- `*.awsapps.com`

No other external services are contacted.

## Data Deletion

You can delete all stored data at any time by:

1. Using the "Clear All Data" option in the extension settings
2. Uninstalling the extension (this removes all stored data)

## Permissions

The extension requests the following permissions, used solely for functionality:

- **Storage:** Save your account list locally
- **Tabs:** Open AWS console tabs when you click an account
- **ActiveTab:** Display an account identification banner on AWS pages
- **Notifications:** Alert you when sessions are expiring
- **Context Menus:** Provide right-click options on AWS sign-in pages
- **Alarms:** Check for expiring sessions periodically
- **Host Permissions (AWS domains):** Interact with AWS sign-in pages

## Open Source

This extension is open source. You can review the code yourself to verify these privacy practices.

## Changes to This Policy

If we make changes to this privacy policy, we will update the "Last Updated" date above.

## Contact

If you have questions about this privacy policy, please open an issue on our GitHub repository.
