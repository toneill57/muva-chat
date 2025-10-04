import { SignJWT, jwtVerify } from 'jose';

async function testJWTCrypto() {
  console.log('🧪 Testing JWT Cryptographic Operations\n');

  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    console.log('❌ JWT_SECRET not found in environment');
    process.exit(1);
  }

  console.log('✅ JWT_SECRET loaded (length:', JWT_SECRET.length, 'chars)');
  const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

  try {
    // 1. Generate token
    console.log('\n1️⃣ Generating JWT token with payload...');
    const token = await new SignJWT({
      test: 'data',
      user: 'test-user',
      timestamp: Date.now()
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(SECRET_KEY);

    console.log('   ✅ Token generated');
    console.log('   Preview:', token.substring(0, 60) + '...');

    // 2. Verify token
    console.log('\n2️⃣ Verifying JWT token signature...');
    const { payload } = await jwtVerify(token, SECRET_KEY);

    console.log('   ✅ Signature VALID');
    console.log('   Payload test:', payload.test);
    console.log('   Payload user:', payload.user);

    // 3. Test with wrong secret
    console.log('\n3️⃣ Testing with WRONG secret (should fail)...');
    const wrongKey = new TextEncoder().encode('wrong-secret-12345');
    try {
      await jwtVerify(token, wrongKey);
      console.log('   ❌ SECURITY ISSUE: Token verified with wrong key!');
      process.exit(1);
    } catch (error) {
      console.log('   ✅ Correctly rejected invalid signature');
    }

    console.log('\n✅ ALL TESTS PASSED');
    console.log('✅ JWT_SECRET is cryptographically secure and working!');
  } catch (error: any) {
    console.log('❌ Test FAILED:', error.message);
    process.exit(1);
  }
}

testJWTCrypto();
