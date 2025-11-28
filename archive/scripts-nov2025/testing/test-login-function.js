/**
 * Test super admin login function directly
 */

// Simulate Next.js environment
process.env.NODE_ENV = 'development';

async function testLoginFunction() {
  try {
    // Import the function (using dynamic import for ESM compatibility)
    const { loginSuperAdmin } = await import('../src/lib/super-admin-auth.ts');

    console.log('Testing loginSuperAdmin function...\n');

    // Test valid credentials
    console.log('1. Testing valid credentials...');
    const token = await loginSuperAdmin('oneill', 'rabbitHole0+');

    if (token) {
      console.log('✅ Login successful!');
      console.log('Token:', token.substring(0, 50) + '...');
    } else {
      console.log('❌ Login failed - returned null');
    }

    // Test invalid password
    console.log('\n2. Testing invalid password...');
    const invalidToken = await loginSuperAdmin('oneill', 'wrong_password');

    if (!invalidToken) {
      console.log('✅ Correctly rejected invalid password');
    } else {
      console.log('❌ Should have rejected invalid password');
    }

  } catch (error) {
    console.error('❌ Error testing function:', error);
    console.error('Stack:', error.stack);
  }
}

testLoginFunction();
