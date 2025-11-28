#!/usr/bin/env node

console.log('Testing login endpoint...\n');

const response = await fetch('http://localhost:3000/api/super-admin/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'oneill',
    password: 'test123'
  })
});

console.log(`Status: ${response.status} ${response.statusText}`);

const text = await response.text();
console.log('Response:', text);

if (response.ok) {
  const data = JSON.parse(text);
  console.log('\n✅ Login successful!');
  console.log(`Token: ${data.token.substring(0, 50)}...`);
} else {
  console.log('\n❌ Login failed');
}
