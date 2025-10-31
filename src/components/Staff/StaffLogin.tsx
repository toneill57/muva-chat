'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import type { StaffLoginResponse, Tenant } from './types';
import { getSubdomainFromClient } from '@/lib/subdomain-detector';

// Test accounts data (only for development)
const TEST_ACCOUNTS = [
  {
    username: 'admin_ceo',
    password: 'Staff2024!',
    tenant_id: 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf',
    role: 'ceo',
  },
  {
    username: 'admin_simmer',
    password: 'Staff2024!',
    tenant_id: 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf',
    role: 'admin',
  },
  {
    username: 'housekeeping_maria',
    password: 'Staff2024!',
    tenant_id: 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf',
    role: 'housekeeper',
  },
];

export default function StaffLogin() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [formData, setFormData] = useState({
    tenant_id: '',
    username: '',
    password: '',
    remember_me: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detectedSubdomain, setDetectedSubdomain] = useState<string | null>(null);
  const [autoSelectedTenant, setAutoSelectedTenant] = useState<Tenant | null>(null);

  // Auto-detect subdomain and fetch appropriate tenant data
  useEffect(() => {
    const subdomain = getSubdomainFromClient();
    setDetectedSubdomain(subdomain);

    // Clean up tokens from other tenants if switching subdomains
    const existingToken = localStorage.getItem('staff_token');
    if (existingToken && subdomain) {
      try {
        // Decode JWT to check tenant_id
        const parts = existingToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

          // Fetch current subdomain's tenant_id
          fetch(`/api/tenant/resolve?subdomain=${encodeURIComponent(subdomain)}`)
            .then(res => res.json())
            .then(data => {
              if (data.tenant_id && payload.tenant_id !== data.tenant_id) {
                console.log('[staff-login] Clearing token from different tenant');
                localStorage.removeItem('staff_token');
                localStorage.removeItem('staff_info');
              }
            })
            .catch(err => console.error('Error checking tenant:', err));
        }
      } catch (error) {
        // Invalid token format, clear it
        localStorage.removeItem('staff_token');
        localStorage.removeItem('staff_info');
      }
    }

    if (subdomain) {
      // If subdomain detected, fetch specific tenant
      fetchTenantBySubdomain(subdomain);
    } else {
      // No subdomain, fetch all tenants (legacy behavior)
      fetchTenants();
    }
  }, []);

  const fetchTenantBySubdomain = async (subdomain: string) => {
    try {
      setLoadingTenants(true);
      const response = await fetch(`/api/tenant/resolve?subdomain=${encodeURIComponent(subdomain)}`);

      if (!response.ok) {
        throw new Error(`Tenant not found for subdomain: ${subdomain}`);
      }

      const data = await response.json();

      // Create tenant object from resolved data
      const tenant: Tenant = {
        id: data.tenant_id,
        name: data.business_name || data.nombre_comercial || subdomain,
        slug: subdomain,
      };

      setAutoSelectedTenant(tenant);
      setTenants([tenant]); // Set single tenant in array
      setFormData(prev => ({ ...prev, tenant_id: tenant.id }));

      console.log('✅ Auto-selected tenant:', tenant.name, 'for subdomain:', subdomain);
    } catch (err) {
      console.error('Error fetching tenant by subdomain:', err);
      setError(`No se encontró el hotel para el subdominio: ${subdomain}`);
    } finally {
      setLoadingTenants(false);
    }
  };

  const fetchTenants = async () => {
    try {
      setLoadingTenants(true);
      const response = await fetch('/api/tenant/list');

      if (!response.ok) {
        throw new Error('Failed to fetch tenant list');
      }

      const data = await response.json();
      setTenants(data.tenants || []);

      // Auto-select if only one tenant
      if (data.tenants?.length === 1) {
        setFormData(prev => ({ ...prev, tenant_id: data.tenants[0].id }));
      }
    } catch (err) {
      console.error('Error fetching tenants:', err);
      setError('Unable to load hotel list. Please refresh the page.');
    } finally {
      setLoadingTenants(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validations
    if (!formData.username) {
      setError('Username is required');
      return;
    }
    if (!formData.password) {
      setError('Password is required');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // tenant_id is auto-filled from subdomain detection
    if (!formData.tenant_id) {
      setError('No se pudo detectar el hotel. Intenta recargar la página.');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/staff/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          subdomain: detectedSubdomain, // Pass detected subdomain for validation
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 401) {
          setError('Invalid username or password');
        } else if (response.status === 403) {
          setError('Your account is inactive. Please contact the administrator.');
        } else {
          setError(data.error || 'Login failed. Please try again.');
        }
        return;
      }

      // API returns data wrapped in 'data' property
      const loginData = data.data as StaffLoginResponse;

      // IMPORTANT: Clear ALL old staff tokens before saving new one
      // This prevents cross-tenant token pollution
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('staff_token') || key.startsWith('staff_info')) {
          localStorage.removeItem(key);
        }
      });

      // Store JWT in localStorage
      localStorage.setItem('staff_token', loginData.token);
      localStorage.setItem('staff_info', JSON.stringify(loginData.staff_info));

      console.log('✅ Token saved for tenant:', loginData.staff_info.staff_id);

      // Redirect to dashboard (maintain current subdomain)
      // Use router.push to navigate within the current subdomain context
      router.push('/dashboard');

    } catch (err) {
      console.error('Login error:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Quick fill test account
  const fillTestAccount = (account: typeof TEST_ACCOUNTS[0]) => {
    setFormData({
      tenant_id: account.tenant_id,
      username: account.username,
      password: account.password,
      remember_me: false,
    });
    setError(null);
  };

  // Always show test credentials (needed for production testing)
  const isDevelopment = true;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-blue-900" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Staff Login Portal</h1>
            <p className="text-sm text-slate-500 mt-1">Access your staff dashboard</p>
          </div>

          {/* Subdomain Context Banner */}
          {detectedSubdomain && autoSelectedTenant && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏨</span>
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Iniciando sesión en:
                  </p>
                  <p className="text-lg font-bold text-blue-900">
                    {autoSelectedTenant.name}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                disabled={loading}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                placeholder="Enter your username"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={loading}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed pr-12"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember_me"
                name="remember_me"
                checked={formData.remember_me}
                onChange={handleInputChange}
                disabled={loading}
                className="h-4 w-4 text-blue-900 border-slate-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="remember_me" className="ml-2 text-sm text-slate-700">
                Remember me for 7 days
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || loadingTenants}
              className="w-full bg-blue-900 text-white py-3 rounded-lg font-semibold hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Forgot password? Contact your administrator
            </p>
          </div>

          {/* Test Credentials (Discrete) */}
          {isDevelopment && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-xs text-slate-400 text-center mb-3">Test Credentials</p>
              <div className="space-y-2">
                {TEST_ACCOUNTS.map((account) => (
                  <button
                    key={account.username}
                    type="button"
                    onClick={() => fillTestAccount(account)}
                    className="w-full text-left px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded text-xs transition-colors border border-slate-200"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono font-medium text-slate-700">{account.username}</span>
                        <span className="mx-2 text-slate-400">/</span>
                        <span className="font-mono text-slate-600">{account.password}</span>
                      </div>
                      <span className="text-slate-500 text-[10px] uppercase">{account.role}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
