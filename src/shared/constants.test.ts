import { describe, it, expect } from 'vitest';
import { AWS_REGIONS, AUTH_TYPES, ACCOUNT_COLORS, AWS_CONSOLE_URL, AWS_SIGNIN_URL } from './constants';

describe('AWS_REGIONS', () => {
  it('should have multiple regions', () => {
    expect(AWS_REGIONS.length).toBeGreaterThan(20);
  });

  it('should have unique region codes', () => {
    const codes = AWS_REGIONS.map(r => r.value);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });

  it('should have valid region format', () => {
    const regionPattern = /^[a-z]{2}-[a-z]+-\d$/;
    AWS_REGIONS.forEach(region => {
      expect(region.value).toMatch(regionPattern);
    });
  });

  it('should have labels for all regions', () => {
    AWS_REGIONS.forEach(region => {
      expect(region.label).toBeTruthy();
      expect(region.label.length).toBeGreaterThan(5);
    });
  });

  it('should include common regions', () => {
    const codes = AWS_REGIONS.map(r => r.value);
    expect(codes).toContain('us-east-1');
    expect(codes).toContain('us-west-2');
    expect(codes).toContain('eu-west-1');
    expect(codes).toContain('ap-southeast-1');
  });

  it('should have us-east-1 as first option (default)', () => {
    expect(AWS_REGIONS[0].value).toBe('us-east-1');
  });
});

describe('AUTH_TYPES', () => {
  it('should have exactly 3 auth types', () => {
    expect(AUTH_TYPES.length).toBe(3);
  });

  it('should include IAM', () => {
    const iam = AUTH_TYPES.find(t => t.value === 'iam');
    expect(iam).toBeDefined();
    expect(iam?.label).toBe('IAM User');
  });

  it('should include SSO', () => {
    const sso = AUTH_TYPES.find(t => t.value === 'sso');
    expect(sso).toBeDefined();
    expect(sso?.label).toContain('SSO');
  });

  it('should include Assume Role', () => {
    const assumeRole = AUTH_TYPES.find(t => t.value === 'assume-role');
    expect(assumeRole).toBeDefined();
    expect(assumeRole?.label).toContain('Assume Role');
  });

  it('should have unique values', () => {
    const values = AUTH_TYPES.map(t => t.value);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });
});

describe('ACCOUNT_COLORS', () => {
  it('should have multiple color options', () => {
    expect(ACCOUNT_COLORS.length).toBeGreaterThanOrEqual(8);
  });

  it('should have valid hex colors', () => {
    const hexPattern = /^#[0-9a-f]{6}$/i;
    ACCOUNT_COLORS.forEach(color => {
      expect(color).toMatch(hexPattern);
    });
  });

  it('should have unique colors', () => {
    const uniqueColors = new Set(ACCOUNT_COLORS);
    expect(uniqueColors.size).toBe(ACCOUNT_COLORS.length);
  });

  it('should include semantic colors', () => {
    // Red for production
    expect(ACCOUNT_COLORS).toContain('#ef4444');
    // Green for dev
    expect(ACCOUNT_COLORS).toContain('#22c55e');
    // Blue as a common choice
    expect(ACCOUNT_COLORS).toContain('#3b82f6');
  });
});

describe('URL Constants', () => {
  it('should have valid AWS console URL', () => {
    expect(AWS_CONSOLE_URL).toBe('https://console.aws.amazon.com');
    expect(AWS_CONSOLE_URL).toMatch(/^https:\/\//);
  });

  it('should have valid AWS signin URL', () => {
    expect(AWS_SIGNIN_URL).toBe('https://signin.aws.amazon.com');
    expect(AWS_SIGNIN_URL).toMatch(/^https:\/\//);
  });

  it('should use HTTPS', () => {
    expect(AWS_CONSOLE_URL.startsWith('https://')).toBe(true);
    expect(AWS_SIGNIN_URL.startsWith('https://')).toBe(true);
  });
});
