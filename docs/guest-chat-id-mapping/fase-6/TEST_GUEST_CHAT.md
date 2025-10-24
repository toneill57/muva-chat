# FASE 6.3: Guest Chat End-to-End Testing

**Fecha:** Octubre 23, 2025
**Tenant:** simmerdown (Simmer Down Guest House)
**Objetivo:** Validar funcionalidad completa del guest chat desde perspectiva del usuario final

---

## 🎯 Test Objectives

Verificar que después de toda la arquitectura de stable IDs y CASCADE FKs, el **guest chat** sigue funcionando perfectamente para:

1. ✅ Login de guests
2. ✅ Búsqueda de información (embeddings)
3. ✅ Acceso a datos de reservación
4. ✅ Respuestas contextuales basadas en chunks semánticos
5. ✅ Información turística (MUVA content)

---

## 📋 Pre-Requisites

### System Status
- ✅ Dev server running on `http://simmerdown.localhost:3000`
- ✅ Database health validated (FASE 6.2)
- ✅ 94 chunks indexed
- ✅ Vector search operational

### Test Environment
```bash
# Ensure dev server is running
./scripts/dev-with-keys.sh

# Verify health
set -a && source .env.local && set +a && \
npx tsx scripts/validate-tenant-health.ts simmerdown
```

---

## 🧪 Test Scenarios

### Test 1: Guest Login
**URL:** `http://simmerdown.localhost:3000/guest`

**Steps:**
1. Navigate to guest login page
2. Enter test credentials:
   - **Reservation Code:** (Use existing reservation from DB)
   - **Last Name:** (Match reservation)

**Expected Results:**
- ✅ Login successful
- ✅ Redirected to `/guest/chat`
- ✅ Welcome message displayed
- ✅ No authentication errors

**SQL to find test reservation:**
```sql
SELECT
  reservation_code,
  guest_name,
  guest_last_name,
  accommodation_unit_name,
  check_in_date,
  check_out_date
FROM guest_reservations
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND check_out_date > NOW()
ORDER BY check_in_date DESC
LIMIT 5;
```

**Status:** ⏸️ PENDING USER VERIFICATION

---

### Test 2: WiFi Information Query
**Scenario:** Guest asks about WiFi password

**Steps:**
1. In chat, type: *"What is the WiFi password?"*
2. Submit message

**Expected Results:**
- ✅ AI responds with WiFi information from manual chunks
- ✅ Response cites specific section (e.g., "Apartamento X - Amenities")
- ✅ Information is accurate and relevant
- ✅ Response time < 3 seconds

**How it works:**
1. Query embedded using Tier 1 (1024d) fast search
2. Top 3 chunks retrieved from `accommodation_units_public`
3. Chunks filtered by `tenant_id`
4. Context sent to Claude AI
5. Response generated and displayed

**Status:** ⏸️ PENDING USER VERIFICATION

---

### Test 3: Accommodation Details Query
**Scenario:** Guest asks about room capacity

**Steps:**
1. In chat, type: *"How many people can stay in my room?"*
2. Submit message

**Expected Results:**
- ✅ AI responds with specific capacity from guest's accommodation
- ✅ Uses semantic chunk: "Habitación X - Capacity & Beds"
- ✅ Information matches `metadata.capacity` field
- ✅ Contextual to guest's specific unit

**Validation:**
- Query should retrieve chunk with `section_type: 'capacity'`
- Response should mention bed configuration
- Information should be specific to guest's unit, not generic

**Status:** ⏸️ PENDING USER VERIFICATION

---

### Test 4: Pricing Information Query
**Scenario:** Guest asks about pricing or checkout

**Steps:**
1. In chat, type: *"What are the checkout procedures?"*
2. Submit message

**Expected Results:**
- ✅ AI responds with checkout policies
- ✅ Uses semantic chunk: "Policies" or "Booking"
- ✅ Information from manual chunks
- ✅ Tenant-specific rules mentioned

**Validation:**
- Query should retrieve chunk with `section_type: 'policies'`
- Response should include checkout time
- May include late checkout information

**Status:** ⏸️ PENDING USER VERIFICATION

---

### Test 5: Tourism Information Query
**Scenario:** Guest asks about local attractions

**Steps:**
1. In chat, type: *"What are the best beaches nearby?"*
2. Submit message

**Expected Results:**
- ✅ AI responds with tourism information
- ✅ Uses MUVA tourism content (if available)
- ✅ Location-specific recommendations
- ✅ Relevant to Providencia island context

**Validation:**
- Response should mention local beaches
- Information should be accurate for Providencia
- May include distances or transportation tips

**Status:** ⏸️ PENDING USER VERIFICATION

---

### Test 6: Reservation Data Visibility
**Scenario:** Verify guest can see their reservation details

**Steps:**
1. Check sidebar or UI for reservation info
2. Verify data displayed:
   - Accommodation name
   - Check-in date
   - Check-out date
   - Guest name
   - Reservation source (MotoPress/Airbnb)

**Expected Results:**
- ✅ Reservation data visible in UI
- ✅ Dates formatted correctly
- ✅ Accommodation name matches booking
- ✅ No SQL errors in console

**Status:** ⏸️ PENDING USER VERIFICATION

---

### Test 7: Multi-Turn Conversation
**Scenario:** Test conversation context retention

**Steps:**
1. Ask: *"Tell me about the apartment"*
2. Follow up: *"What amenities does it have?"*
3. Follow up: *"And the WiFi password?"*

**Expected Results:**
- ✅ AI maintains conversation context
- ✅ "it" refers to previously mentioned apartment
- ✅ Responses build on previous context
- ✅ No repetitive information

**Status:** ⏸️ PENDING USER VERIFICATION

---

## 🔍 Backend Validation

### Vector Search Performance Test

```bash
# Test vector search directly via SQL
set -a && source .env.local && set +a && \
npx tsx -e "
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function testSearch() {
  const query = 'WiFi password and internet access';

  // Generate embedding
  const embResponse = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: query,
    dimensions: 1024
  });

  const embedding = embResponse.data[0].embedding;

  // Search
  const { data, error } = await supabase.rpc('match_accommodation_chunks_public', {
    query_embedding: embedding,
    match_threshold: 0.5,
    match_count: 5,
    filter_tenant_id: 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  });

  if (error) {
    console.error('Search error:', error);
  } else {
    console.log('Search results:', data.length);
    data.forEach((result, i) => {
      console.log(\`\${i + 1}. \${result.name} (similarity: \${result.similarity})\`);
    });
  }
}

testSearch();
"
```

**Expected Results:**
- ✅ 3-5 relevant chunks returned
- ✅ Similarity scores > 0.5
- ✅ Results include WiFi-related chunks
- ✅ All results from simmerdown tenant only

**Status:** ⏸️ PENDING USER VERIFICATION

---

## 📊 Success Criteria

| Test | Criteria | Status |
|------|----------|--------|
| Login | Guest can authenticate | ⏸️ Pending |
| WiFi Query | Accurate WiFi info from chunks | ⏸️ Pending |
| Capacity Query | Correct accommodation details | ⏸️ Pending |
| Policies Query | Relevant policy information | ⏸️ Pending |
| Tourism Query | Local recommendations provided | ⏸️ Pending |
| Reservation Data | Booking details visible | ⏸️ Pending |
| Multi-Turn Chat | Context maintained | ⏸️ Pending |
| Vector Search | <3s response, relevant results | ⏸️ Pending |

**Overall Status:** ⏸️ AWAITING USER TESTING

---

## 🐛 Known Issues / Edge Cases

### Issue 1: Chunk Inheritance Warning
**Description:** 58 chunks show warning for missing `motopress_unit_id`

**Impact:** NONE - Chunks inherit stable IDs via `metadata.original_accommodation`

**Resolution:** This is expected behavior, not a bug

**Documented in:** `docs/guest-chat-id-mapping/fase-6/TEST_SIMMERDOWN.md`

---

### Issue 2: Legacy vs. Full Accommodations
**Description:** Some accommodations have 2-3 chunks (legacy) vs. 7-8 chunks (full v3.0)

**Impact:** Legacy accommodations may have less detailed responses

**Resolution:** Re-sync legacy accommodations with v3.0 markdown format (future enhancement)

**Priority:** LOW - Functionality not affected

---

## 🔄 Testing Workflow

### Automated Tests (Already Completed)
1. ✅ Health check script validated all infrastructure
2. ✅ Vector search operational
3. ✅ Database integrity confirmed

### Manual UI/UX Tests (User Required)
1. ⏸️ Login functionality
2. ⏸️ Chat interactions
3. ⏸️ Response quality
4. ⏸️ Performance metrics

### Recommended Test Order
1. **First:** Run health check script (automated)
2. **Second:** Test backend vector search (automated)
3. **Third:** Login and test chat queries (manual)
4. **Fourth:** Verify reservation data (manual)
5. **Fifth:** Test edge cases and multi-turn conversations (manual)

---

## 📝 Test Report Template

### USER REPORT (To be filled after manual testing)

**Tester:** [Your Name]
**Date:** [Date]
**Environment:** simmerdown.localhost:3000

#### Test 1: Login
- [ ] ✅ Success / ❌ Failed
- Notes:

#### Test 2: WiFi Query
- [ ] ✅ Success / ❌ Failed
- Notes:

#### Test 3: Capacity Query
- [ ] ✅ Success / ❌ Failed
- Notes:

#### Test 4: Policies Query
- [ ] ✅ Success / ❌ Failed
- Notes:

#### Test 5: Tourism Query
- [ ] ✅ Success / ❌ Failed
- Notes:

#### Test 6: Reservation Data
- [ ] ✅ Success / ❌ Failed
- Notes:

#### Test 7: Multi-Turn Chat
- [ ] ✅ Success / ❌ Failed
- Notes:

#### Overall Assessment
**Pass:** [ ] Yes / [ ] No
**Issues Found:**
**Recommendations:**

---

## 🎯 Next Steps After User Testing

### If All Tests Pass ✅
1. Mark FASE 6.3 as complete
2. Update TODO.md
3. Proceed to FASE 6.1 (Complete Reset Test with test tenant)

### If Issues Found ❌
1. Document issues in detail
2. Create fix tasks
3. Re-test after fixes
4. Update architecture docs if needed

---

**Document Status:** READY FOR USER TESTING
**Last Updated:** 2025-10-23 23:50 UTC
**Created by:** @agent-backend-developer
