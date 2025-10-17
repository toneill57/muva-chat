'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, AlertCircle, ChevronDown, ChevronUp, Crown, Shield, Briefcase } from 'lucide-react';
import type { StaffLoginResponse, Tenant } from './types';

// Test accounts data (only for development)
const TEST_ACCOUNTS = [
  {
    username: 'admin_ceo',
    password: 'Staff2024!',
    tenant_id: 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf',
    role: 'ceo',
    name: 'Carlos Ospina (CEO)',
    icon: Crown,
    color: 'amber',
    permissions: ['Admin Panel', 'SIRE Access', 'Reports', 'Modify Operations'],
  },
  {
    username: 'admin_simmer',
    password: 'Staff2024!',
    tenant_id: 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf',
    role: 'admin',
    name: 'Laura Martínez (Admin)',
    icon: Shield,
    color: 'blue',
    permissions: ['Admin Panel', 'SIRE Access', 'Reports'],
  },
  {
    username: 'housekeeping_maria',
    password: 'Staff2024!',
    tenant_id: 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf',
    role: 'housekeeper',
    name: 'María Rodríguez (Housekeeper)',
    icon: Briefcase,
    color: 'green',
    permissions: ['SIRE Access'],
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
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch tenant list on mount
  useEffect(() => {
    fetchTenants();
  }, []);

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
    if (!formData.tenant_id) {
      setError('Please select a hotel');
      return;
    }
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

    try {
      setLoading(true);

      const response = await fetch('/api/staff/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
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

      // Store JWT in localStorage
      localStorage.setItem('staff_token', loginData.token);
      localStorage.setItem('staff_info', JSON.stringify(loginData.staff_info));

      // Redirect to staff portal
      router.push('/staff');

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

          {/* Test Credentials Panel (Development Only) */}
          {isDevelopment && (
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setShowTestPanel(!showTestPanel)}
                className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">🧪</span>
                  <span className="text-sm font-medium text-blue-900">
                    {showTestPanel ? 'Hide' : 'Show'} Test Accounts
                  </span>
                </div>
                {showTestPanel ? (
                  <ChevronUp className="h-4 w-4 text-blue-700" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-blue-700" />
                )}
              </button>

              {showTestPanel && (
                <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  {TEST_ACCOUNTS.map((account) => {
                    const Icon = account.icon;
                    const colorClasses = {
                      amber: 'bg-amber-50 border-amber-200 text-amber-900',
                      blue: 'bg-blue-50 border-blue-200 text-blue-900',
                      green: 'bg-green-50 border-green-200 text-green-900',
                    }[account.color];

                    const badgeClasses = {
                      amber: 'bg-amber-100 text-amber-800 border-amber-300',
                      blue: 'bg-blue-100 text-blue-800 border-blue-300',
                      green: 'bg-green-100 text-green-800 border-green-300',
                    }[account.color];

                    return (
                      <div
                        key={account.username}
                        className={`p-4 border rounded-lg ${colorClasses}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Icon className="h-5 w-5" />
                            <div>
                              <p className="font-semibold text-sm">{account.name}</p>
                              <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full border ${badgeClasses}`}>
                                {account.role.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 text-xs mb-3">
                          <div className="flex gap-2">
                            <span className="font-medium">Username:</span>
                            <span className="font-mono">{account.username}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="font-medium">Password:</span>
                            <span className="font-mono">{account.password}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="font-medium">Permissions:</span>
                            <span>{account.permissions.join(', ')}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => fillTestAccount(account)}
                          className={`w-full py-2 px-3 text-xs font-semibold rounded-md border-2 transition-colors ${
                            account.color === 'amber'
                              ? 'border-amber-300 hover:bg-amber-100'
                              : account.color === 'blue'
                              ? 'border-blue-300 hover:bg-blue-100'
                              : 'border-green-300 hover:bg-green-100'
                          }`}
                        >
                          Use This Account
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
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
            {/* Tenant Selection */}
            <div>
              <label htmlFor="tenant_id" className="block text-sm font-medium text-slate-700 mb-2">
                Hotel
              </label>
              <select
                id="tenant_id"
                name="tenant_id"
                value={formData.tenant_id}
                onChange={handleInputChange}
                disabled={loadingTenants || loading}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed text-slate-900"
                required
              >
                <option value="">
                  {loadingTenants ? 'Loading hotels...' : 'Select a hotel'}
                </option>
                {tenants.map(tenant => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>

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
        </div>
      </div>
    </div>
  );
}
