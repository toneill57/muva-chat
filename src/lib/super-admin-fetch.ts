/**
 * Helper function to make authenticated requests to super admin APIs
 * Automatically includes JWT token from localStorage
 */

export async function superAdminFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Get token from localStorage
  const token = localStorage.getItem('super_admin_token');

  // Merge headers with Authorization
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  // Make request with token
  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Helper to handle logout when token is invalid
 */
export function handleUnauthorized() {
  localStorage.removeItem('super_admin_token');
  window.location.href = '/sign-in';
}
