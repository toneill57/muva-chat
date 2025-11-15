/**
 * Get database advisors (security + performance) using Supabase Management API
 * 
 * NOTE: Supabase CLI `inspect db advisors` doesn't exist
 * We use the Management API directly to get advisors
 */

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = 'ooaumjzaztmutltifhoq'; // Production database

if (!SUPABASE_ACCESS_TOKEN) {
  console.error('ERROR: SUPABASE_ACCESS_TOKEN not found in environment');
  process.exit(1);
}

interface Advisor {
  name?: string;
  title?: string;
  message?: string;
  description?: string;
  level?: 'ERROR' | 'WARN' | 'INFO';
  details?: any;
}

async function getAdvisors(type: 'security' | 'performance'): Promise<Advisor[]> {
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/advisors/${type}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    console.error(`Failed to fetch ${type} advisors:`, response.status, response.statusText);
    const text = await response.text();
    console.error('Response:', text);
    return [];
  }
  
  const data = await response.json();
  return data;
}

function groupByLevel(advisors: Advisor[]): Record<string, Advisor[]> {
  const grouped: Record<string, Advisor[]> = {
    ERROR: [],
    WARN: [],
    INFO: []
  };
  
  advisors.forEach(advisor => {
    const level = advisor.level || 'INFO';
    if (!grouped[level]) grouped[level] = [];
    grouped[level].push(advisor);
  });
  
  return grouped;
}

function printAdvisors(type: string, advisors: Advisor[]) {
  console.log('');
  console.log('='.repeat(70));
  console.log(`${type.toUpperCase()} ADVISORS`);
  console.log('='.repeat(70));
  console.log('');
  
  if (advisors.length === 0) {
    console.log('✅ No advisors found');
    return;
  }
  
  const grouped = groupByLevel(advisors);
  
  console.log('SUMMARY:');
  console.log(`  ERROR: ${grouped.ERROR.length}`);
  console.log(`  WARN: ${grouped.WARN.length}`);
  console.log(`  INFO: ${grouped.INFO.length}`);
  console.log(`  TOTAL: ${advisors.length}`);
  console.log('');
  
  ['ERROR', 'WARN', 'INFO'].forEach(level => {
    const items = grouped[level];
    if (items.length > 0) {
      console.log('');
      console.log(`${level} (${items.length}):`);
      console.log('-'.repeat(70));
      items.forEach((advisor, idx) => {
        console.log('');
        console.log(`${idx + 1}. ${advisor.name || advisor.title || 'Unnamed'}`);
        const msg = advisor.message || advisor.description || '';
        if (msg) {
          console.log(`   ${msg}`);
        }
        if (advisor.details) {
          console.log(`   Details: ${JSON.stringify(advisor.details, null, 2)}`);
        }
      });
    }
  });
}

async function main() {
  console.log('Fetching advisors for project:', PROJECT_REF);
  
  const security = await getAdvisors('security');
  const performance = await getAdvisors('performance');
  
  printAdvisors('security', security);
  printAdvisors('performance', performance);
  
  console.log('');
  console.log('');
  console.log('='.repeat(70));
  console.log('FINAL SUMMARY');
  console.log('='.repeat(70));
  console.log(`Security issues: ${security.length}`);
  console.log(`Performance issues: ${performance.length}`);
  console.log(`TOTAL issues: ${security.length + performance.length}`);
  console.log('');
  
  // Return detailed counts for comparison
  const secGrouped = groupByLevel(security);
  const perfGrouped = groupByLevel(performance);
  
  console.log('DETAILED BREAKDOWN:');
  console.log('');
  console.log('SECURITY:');
  console.log(`  ERROR: ${secGrouped.ERROR.length}`);
  console.log(`  WARN: ${secGrouped.WARN.length}`);
  console.log(`  INFO: ${secGrouped.INFO.length}`);
  console.log('');
  console.log('PERFORMANCE:');
  console.log(`  ERROR: ${perfGrouped.ERROR.length}`);
  console.log(`  WARN: ${perfGrouped.WARN.length}`);
  console.log(`  INFO: ${perfGrouped.INFO.length}`);
  console.log('');
}

main().catch(console.error);
