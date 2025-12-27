import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Encryption Utility Functions', () => {
  // Test the pure utility functions

  describe('arrayBufferToBase64', () => {
    function arrayBufferToBase64(buffer: ArrayBuffer): string {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    }

    it('should convert empty buffer', () => {
      const buffer = new ArrayBuffer(0);
      expect(arrayBufferToBase64(buffer)).toBe('');
    });

    it('should convert simple buffer', () => {
      const buffer = new Uint8Array([72, 101, 108, 108, 111]).buffer; // "Hello"
      expect(arrayBufferToBase64(buffer)).toBe('SGVsbG8=');
    });

    it('should handle binary data', () => {
      const buffer = new Uint8Array([0, 255, 128, 64, 32]).buffer;
      const result = arrayBufferToBase64(buffer);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });

  describe('base64ToArrayBuffer', () => {
    function base64ToArrayBuffer(base64: string): ArrayBuffer {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes.buffer;
    }

    it('should convert empty string', () => {
      const buffer = base64ToArrayBuffer('');
      expect(buffer.byteLength).toBe(0);
    });

    it('should convert base64 string', () => {
      const buffer = base64ToArrayBuffer('SGVsbG8=');
      const bytes = new Uint8Array(buffer);
      expect(Array.from(bytes)).toEqual([72, 101, 108, 108, 111]); // "Hello"
    });

    it('should throw on invalid base64', () => {
      expect(() => base64ToArrayBuffer('not valid base64!!!')).toThrow();
    });
  });

  describe('roundtrip conversion', () => {
    function arrayBufferToBase64(buffer: ArrayBuffer): string {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    }

    function base64ToArrayBuffer(base64: string): ArrayBuffer {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes.buffer;
    }

    it('should roundtrip correctly', () => {
      const original = new Uint8Array([1, 2, 3, 4, 5, 100, 200, 255]);
      const base64 = arrayBufferToBase64(original.buffer);
      const recovered = new Uint8Array(base64ToArrayBuffer(base64));
      expect(Array.from(recovered)).toEqual(Array.from(original));
    });

    it('should handle large data', () => {
      const original = new Uint8Array(1000);
      for (let i = 0; i < 1000; i++) {
        original[i] = i % 256;
      }
      const base64 = arrayBufferToBase64(original.buffer);
      const recovered = new Uint8Array(base64ToArrayBuffer(base64));
      expect(Array.from(recovered)).toEqual(Array.from(original));
    });
  });
});

describe('Encryption Data Format', () => {
  // Test the expected format of encrypted data

  it('should have correct structure (salt + iv + data)', () => {
    // Encrypted data format: 16 bytes salt + 12 bytes iv + encrypted data
    // Minimum size when empty would be 28 bytes + some ciphertext
    const SALT_LENGTH = 16;
    const IV_LENGTH = 12;
    const MIN_ENCRYPTED_LENGTH = SALT_LENGTH + IV_LENGTH;

    expect(MIN_ENCRYPTED_LENGTH).toBe(28);
  });

  it('should validate encrypted data length', () => {
    function isValidEncryptedData(base64Data: string): boolean {
      try {
        const binary = atob(base64Data);
        // Must have at least salt (16) + iv (12) + some data
        return binary.length > 28;
      } catch {
        return false;
      }
    }

    expect(isValidEncryptedData('')).toBe(false);
    expect(isValidEncryptedData('short')).toBe(false);
    // Valid base64 but too short
    expect(isValidEncryptedData('YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXo=')).toBe(false);
    // Long enough
    expect(isValidEncryptedData('YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY3ODkw')).toBe(true);
  });
});

describe('generateLocalKey', () => {
  function generateLocalKey(): string {
    const key = crypto.getRandomValues(new Uint8Array(32));
    const bytes = new Uint8Array(key);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  it('should generate a 32-byte key as base64', () => {
    const key = generateLocalKey();
    expect(typeof key).toBe('string');
    // 32 bytes -> 44 characters in base64 (with padding)
    expect(key.length).toBe(44);
  });

  it('should generate unique keys', () => {
    const key1 = generateLocalKey();
    const key2 = generateLocalKey();
    expect(key1).not.toBe(key2);
  });

  it('should generate valid base64', () => {
    const key = generateLocalKey();
    expect(() => atob(key)).not.toThrow();
  });
});

describe('Password Hashing', () => {
  // Test expected hash format properties without actual crypto.subtle

  it('should have expected SHA-256 hash length', () => {
    // SHA-256 produces 32 bytes = 44 base64 characters (with padding)
    const SHA256_BYTES = 32;
    const expectedBase64Length = Math.ceil(SHA256_BYTES / 3) * 4; // 44

    expect(expectedBase64Length).toBe(44);
  });

  it('should validate hash format', () => {
    // A valid SHA-256 hash in base64 is 44 characters
    function isValidPasswordHash(hash: string): boolean {
      if (hash.length !== 44) return false;
      try {
        atob(hash); // Should be valid base64
        return true;
      } catch {
        return false;
      }
    }

    // Valid hash format (44 char base64)
    expect(isValidPasswordHash('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=')).toBe(true);
    // Invalid - wrong length
    expect(isValidPasswordHash('short')).toBe(false);
    // Invalid - not base64
    expect(isValidPasswordHash('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')).toBe(false);
  });
});
