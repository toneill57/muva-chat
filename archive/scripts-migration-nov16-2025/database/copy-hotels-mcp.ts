#!/usr/bin/env tsx
/**
 * Copy hotels.accommodation_units one by one using smaller queries
 */

const UNIT_IDS = [
  '662d4724-4126-5a80-8607-172fecddbf5e',
  '4b28c7fa-9a5f-5210-8821-91153467f353',
  'db07ee63-9f06-5354-94b2-7a0e389ec7b8',
  '1480ec8d-f2a4-5c33-9ae8-187dd4355024',
  'f739a9c4-e5f5-593e-bd85-b4cb94a74010',
  '70824b56-e072-5d10-a712-577c1f71da52',
  '68c1980d-cd6f-5918-a862-b57dc97fb95e',
  '71538799-dfe1-52bd-8aa4-250dbc77c2d2',
  '9f4b022a-882a-54ad-a521-691e5c5c3c59',
  '9492af59-84a6-5626-857e-683c94717390',
  '27045009-b981-5d91-bffb-0ac65989edad',
  '71bf7eb9-cb1f-5a2a-a665-5a9a1b85fb9e',
  '0683b66c-d7ad-51d0-8fd9-7099af81f75f',
  '506a9029-d188-5cad-a4fa-bd0f0df19b98',
  'ea5b3337-5a7b-56cc-96ab-18da0ba04e81',
  'd5fb62d9-429f-53ab-b01c-abd534271ebf',
  '8300f006-5fc7-475c-9f59-edba707bad62',
  '23449de1-d3c4-4f91-bd9e-4b8cea1ba44a',
  '265b2421-526d-4e71-b87c-6f0f7c2b7d4e',
  '11c6bdba-c595-432e-9b3f-abcb5eb1a8a4',
  '6a945198-180d-496a-9f56-16a2f954a16f',
  '690d3332-2bf5-44e9-b40c-9adc271ec68f',
  '007fabb8-4373-4d8a-bbd0-d60eb42e862b',
  '14fc28a0-f6ac-4789-bc95-47c18bc4bf33',
  '51ac0aaa-683d-49fe-ae40-af48e6ba0096',
  '980a0d29-95db-4ec0-a390-590eb23b033d',
];

console.log('📋 Use MCP tools directly to copy units:');
console.log('');
console.log('For each unit ID:');
console.log('1. mcp__supabase__execute_sql(prod, SELECT * FROM hotels.accommodation_units WHERE id = \'...\')');
console.log('2. Generate INSERT INTO statement');
console.log('3. mcp__supabase__execute_sql(staging, INSERT INTO...)');
console.log('');
console.log(`Total units to copy: ${UNIT_IDS.length}`);
console.log('');
console.log('Unit IDs:', UNIT_IDS.join('\n'));
