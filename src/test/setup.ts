import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Chrome Extension APIs
const mockStorage: Record<string, unknown> = {};

globalThis.chrome = {
  storage: {
    local: {
      get: vi.fn((key: string) => Promise.resolve({ [key]: mockStorage[key] })),
      set: vi.fn((data: Record<string, unknown>) => {
        Object.assign(mockStorage, data);
        return Promise.resolve();
      }),
    },
    session: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
      remove: vi.fn(() => Promise.resolve()),
    },
    onChanged: {
      addListener: vi.fn(),
    },
  },
  runtime: {
    sendMessage: vi.fn(() => Promise.resolve()),
    onMessage: {
      addListener: vi.fn(),
    },
    openOptionsPage: vi.fn(),
  },
  tabs: {
    create: vi.fn(() => Promise.resolve()),
    sendMessage: vi.fn(() => Promise.resolve()),
    onRemoved: { addListener: vi.fn() },
    onUpdated: { addListener: vi.fn() },
  },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
  },
  alarms: {
    create: vi.fn(),
    onAlarm: { addListener: vi.fn() },
  },
  notifications: {
    create: vi.fn(),
  },
  commands: {
    onCommand: { addListener: vi.fn() },
  },
  contextMenus: {
    create: vi.fn(),
    removeAll: vi.fn(() => Promise.resolve()),
    onClicked: { addListener: vi.fn() },
  },
} as unknown as typeof chrome;

// Mock crypto for encryption tests
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    subtle: {
      importKey: vi.fn(() => Promise.resolve({})),
      deriveKey: vi.fn(() => Promise.resolve({})),
      encrypt: vi.fn(() => Promise.resolve(new ArrayBuffer(32))),
      decrypt: vi.fn(() => Promise.resolve(new TextEncoder().encode('decrypted'))),
    },
  },
});

// Helper to reset mock storage between tests
export function resetMockStorage() {
  Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
}

export { mockStorage };
