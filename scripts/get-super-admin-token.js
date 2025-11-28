/**
 * Get Super Admin Token (full token for testing)
 */

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

async function getToken() {
  try {
    const response = await fetch(`${API_BASE}/api/super-admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'oneill',
        password: 'rabbitHole0+',
      }),
    });

    const data = await response.json();

    if (response.status === 200 && data.token) {
      // Output ONLY the token (for easy piping)
      console.log(data.token);
      return data.token;
    } else {
      console.error(`Login failed: ${JSON.stringify(data)}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`Request failed: ${error.message}`);
    process.exit(1);
  }
}

getToken();
