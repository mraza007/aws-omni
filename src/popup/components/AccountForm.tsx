import { useState } from 'preact/hooks';
import type { AWSAccount, AuthType } from '@/shared/types';
import { useAccountStore } from '../store';
import { AWS_REGIONS, AUTH_TYPES, ACCOUNT_COLORS } from '@/shared/constants';
import { encrypt } from '@/shared/encryption';

// Simple key for local encryption (in production, use master password)
const LOCAL_KEY = 'aws-switcher-local-key';

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  fontSize: '14px',
  border: '1px solid var(--border-color)',
  borderRadius: '8px',
  background: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  outline: 'none',
};

const labelStyle = {
  display: 'block',
  fontSize: '13px',
  fontWeight: '500' as const,
  color: 'var(--text-secondary)',
  marginBottom: '6px',
};

const errorStyle = {
  marginTop: '4px',
  fontSize: '12px',
  color: '#ef4444',
};

export function AccountForm() {
  const { closeForm, createAccount, updateAccount, editingAccount } = useAccountStore();
  const isEditing = !!editingAccount;

  const [formData, setFormData] = useState({
    name: editingAccount?.name ?? '',
    accountId: editingAccount?.accountId ?? '',
    defaultRegion: editingAccount?.defaultRegion ?? 'us-east-1',
    authType: editingAccount?.authType ?? 'iam' as AuthType,
    clientName: editingAccount?.clientName ?? '',
    tags: editingAccount?.tags?.join(', ') ?? '',
    color: editingAccount?.color ?? ACCOUNT_COLORS[0],
    // IAM credentials
    iamUsername: editingAccount?.iamCredentials?.username ?? '',
    iamPassword: '', // Never pre-fill password for security
    // SSO config
    ssoStartUrl: editingAccount?.ssoConfig?.startUrl ?? '',
    ssoRoleName: editingAccount?.ssoConfig?.roleName ?? '',
    // Assume Role config
    roleArn: editingAccount?.assumeRoleConfig?.roleArn ?? '',
    externalId: editingAccount?.assumeRoleConfig?.externalId ?? '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.accountId.match(/^\d{12}$/)) {
      newErrors.accountId = 'Account ID must be 12 digits';
    }

    if (formData.authType === 'sso' && !formData.ssoStartUrl) {
      newErrors.ssoStartUrl = 'SSO Start URL is required';
    }

    if (formData.authType === 'assume-role' && !formData.roleArn) {
      newErrors.roleArn = 'Role ARN is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    if (!validate()) return;

    const tags = formData.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    // Handle IAM credentials encryption
    let iamCredentials = undefined;
    if (formData.authType === 'iam' && formData.iamUsername) {
      if (formData.iamPassword) {
        // New password provided - encrypt it
        const encryptedPassword = await encrypt(formData.iamPassword, LOCAL_KEY);
        iamCredentials = {
          username: formData.iamUsername,
          encryptedPassword,
        };
      } else if (isEditing && editingAccount?.iamCredentials?.encryptedPassword) {
        // Keep existing password
        iamCredentials = {
          username: formData.iamUsername,
          encryptedPassword: editingAccount.iamCredentials.encryptedPassword,
        };
      } else {
        // Username only, no password
        iamCredentials = {
          username: formData.iamUsername,
          encryptedPassword: '',
        };
      }
    }

    const accountData: Omit<AWSAccount, 'id' | 'createdAt'> = {
      name: formData.name.trim(),
      accountId: formData.accountId,
      defaultRegion: formData.defaultRegion,
      authType: formData.authType,
      clientName: formData.clientName.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      color: formData.color,
      iamCredentials,
      ssoConfig:
        formData.authType === 'sso'
          ? {
              startUrl: formData.ssoStartUrl,
              accountId: formData.accountId,
              roleName: formData.ssoRoleName,
            }
          : undefined,
      assumeRoleConfig:
        formData.authType === 'assume-role'
          ? {
              roleArn: formData.roleArn,
              externalId: formData.externalId || undefined,
            }
          : undefined,
    };

    if (isEditing) {
      await updateAccount({
        ...editingAccount,
        ...accountData,
      });
    } else {
      await createAccount(accountData);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '500px',
      width: '380px',
      background: 'var(--bg-primary)',
      overflow: 'hidden',
    }}>
      {/* Header - Fixed */}
      <header style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)',
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
          {isEditing ? 'Edit Account' : 'Add Account'}
        </h2>
        <button
          onClick={closeForm}
          style={{
            padding: '6px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            borderRadius: '6px',
          }}
        >
          <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      {/* Form - Scrollable */}
      <form onSubmit={handleSubmit} style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '16px',
        minHeight: 0,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Name */}
          <div>
            <label style={labelStyle}>Display Name *</label>
            <input
              type="text"
              value={formData.name}
              onInput={(e) => setFormData({ ...formData, name: (e.target as HTMLInputElement).value })}
              placeholder="e.g., Client A - Production"
              style={{
                ...inputStyle,
                borderColor: errors.name ? '#ef4444' : '#e2e8f0',
              }}
            />
            {errors.name && <p style={errorStyle}>{errors.name}</p>}
          </div>

          {/* Account ID */}
          <div>
            <label style={labelStyle}>AWS Account ID *</label>
            <input
              type="text"
              value={formData.accountId}
              onInput={(e) => setFormData({ ...formData, accountId: (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 12) })}
              placeholder="123456789012"
              maxLength={12}
              style={{
                ...inputStyle,
                fontFamily: 'monospace',
                borderColor: errors.accountId ? '#ef4444' : '#e2e8f0',
              }}
            />
            {errors.accountId && <p style={errorStyle}>{errors.accountId}</p>}
          </div>

          {/* Region */}
          <div>
            <label style={labelStyle}>Default Region</label>
            <select
              value={formData.defaultRegion}
              onChange={(e) => setFormData({ ...formData, defaultRegion: (e.target as HTMLSelectElement).value })}
              style={{
                ...inputStyle,
                cursor: 'pointer',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                backgroundSize: '16px',
                paddingRight: '40px',
              }}
            >
              {AWS_REGIONS.map((region) => (
                <option key={region.value} value={region.value}>
                  {region.value} - {region.label}
                </option>
              ))}
            </select>
          </div>

          {/* Auth Type */}
          <div>
            <label style={labelStyle}>Authentication Type</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {AUTH_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, authType: type.value as AuthType })}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    borderRadius: '6px',
                    border: formData.authType === type.value ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                    background: formData.authType === type.value ? 'var(--accent-color)' : 'var(--bg-secondary)',
                    color: formData.authType === type.value ? 'white' : 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* IAM Credentials */}
          {formData.authType === 'iam' && (
            <>
              <div>
                <label style={labelStyle}>IAM Username</label>
                <input
                  type="text"
                  value={formData.iamUsername}
                  onInput={(e) => setFormData({ ...formData, iamUsername: (e.target as HTMLInputElement).value })}
                  placeholder="e.g., admin-user"
                  style={inputStyle}
                  autoComplete="off"
                />
                <p style={{ marginTop: '4px', fontSize: '11px', color: 'var(--text-light)' }}>
                  Optional - for auto-fill on login page
                </p>
              </div>
              <div>
                <label style={labelStyle}>IAM Password</label>
                <input
                  type="password"
                  value={formData.iamPassword}
                  onInput={(e) => setFormData({ ...formData, iamPassword: (e.target as HTMLInputElement).value })}
                  placeholder={isEditing && editingAccount?.iamCredentials?.encryptedPassword ? '••••••••' : 'Enter password'}
                  style={inputStyle}
                  autoComplete="new-password"
                />
                <p style={{ marginTop: '4px', fontSize: '11px', color: 'var(--text-light)' }}>
                  {isEditing && editingAccount?.iamCredentials?.encryptedPassword
                    ? 'Leave blank to keep existing password'
                    : 'Stored locally with encryption'}
                </p>
              </div>
            </>
          )}

          {/* SSO Fields */}
          {formData.authType === 'sso' && (
            <>
              <div>
                <label style={labelStyle}>SSO Start URL *</label>
                <input
                  type="url"
                  value={formData.ssoStartUrl}
                  onInput={(e) => setFormData({ ...formData, ssoStartUrl: (e.target as HTMLInputElement).value })}
                  placeholder="https://d-xxxxxx.awsapps.com/start"
                  style={{
                    ...inputStyle,
                    borderColor: errors.ssoStartUrl ? '#ef4444' : '#e2e8f0',
                  }}
                />
                {errors.ssoStartUrl && <p style={errorStyle}>{errors.ssoStartUrl}</p>}
              </div>
              <div>
                <label style={labelStyle}>Role Name</label>
                <input
                  type="text"
                  value={formData.ssoRoleName}
                  onInput={(e) => setFormData({ ...formData, ssoRoleName: (e.target as HTMLInputElement).value })}
                  placeholder="e.g., AdministratorAccess"
                  style={inputStyle}
                />
              </div>
            </>
          )}

          {/* Assume Role Fields */}
          {formData.authType === 'assume-role' && (
            <>
              <div>
                <label style={labelStyle}>Role ARN *</label>
                <input
                  type="text"
                  value={formData.roleArn}
                  onInput={(e) => setFormData({ ...formData, roleArn: (e.target as HTMLInputElement).value })}
                  placeholder="arn:aws:iam::123456789012:role/RoleName"
                  style={{
                    ...inputStyle,
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    borderColor: errors.roleArn ? '#ef4444' : '#e2e8f0',
                  }}
                />
                {errors.roleArn && <p style={errorStyle}>{errors.roleArn}</p>}
              </div>
              <div>
                <label style={labelStyle}>External ID</label>
                <input
                  type="text"
                  value={formData.externalId}
                  onInput={(e) => setFormData({ ...formData, externalId: (e.target as HTMLInputElement).value })}
                  placeholder="Optional"
                  style={inputStyle}
                />
              </div>
            </>
          )}

          {/* Client/Group */}
          <div>
            <label style={labelStyle}>Client / Group</label>
            <input
              type="text"
              value={formData.clientName}
              onInput={(e) => setFormData({ ...formData, clientName: (e.target as HTMLInputElement).value })}
              placeholder="e.g., Client A"
              style={inputStyle}
            />
          </div>

          {/* Tags */}
          <div>
            <label style={labelStyle}>Tags</label>
            <input
              type="text"
              value={formData.tags}
              onInput={(e) => setFormData({ ...formData, tags: (e.target as HTMLInputElement).value })}
              placeholder="production, api (comma-separated)"
              style={inputStyle}
            />
          </div>

          {/* Color */}
          <div>
            <label style={labelStyle}>Color</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {ACCOUNT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    border: formData.color === color ? '3px solid #3b82f6' : '2px solid transparent',
                    background: color,
                    cursor: 'pointer',
                    outline: formData.color === color ? '2px solid white' : 'none',
                    outlineOffset: '-4px',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </form>

      {/* Footer - Fixed */}
      <div style={{
        flexShrink: 0,
        display: 'flex',
        gap: '12px',
        padding: '12px 16px',
        borderTop: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)',
      }}>
        <button
          type="button"
          onClick={closeForm}
          style={{
            flex: 1,
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: '500',
            color: 'var(--text-secondary)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          onClick={handleSubmit}
          style={{
            flex: 1,
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: '500',
            color: 'white',
            background: 'var(--accent-color)',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          {isEditing ? 'Save Changes' : 'Add Account'}
        </button>
      </div>
    </div>
  );
}
