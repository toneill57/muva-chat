import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface Advisor {
  name?: string;
  title?: string;
  message?: string;
  description?: string;
  level?: string;
  details?: any;
}

async function getAdvisors(type: string): Promise<Advisor[]> {
  console.log('');
  console.log('='.repeat(60));
  console.log(type.toUpperCase() + ' ADVISORS');
  console.log('='.repeat(60));
  console.log('');
  
  const { data, error } = await supabase.rpc('get_advisors', { 
    advisor_type: type 
  });
  
  if (error) {
    console.error('Error:', error);
    return [];
  }
  
  if (!data || data.length === 0) {
    console.log('No advisors found');
    return [];
  }
  
  const byLevel: Record<string, Advisor[]> = {
    ERROR: [],
    WARN: [],
    INFO: []
  };
  
  data.forEach((advisor: Advisor) => {
    const level = advisor.level || 'INFO';
    if (!byLevel[level]) byLevel[level] = [];
    byLevel[level].push(advisor);
  });
  
  console.log('SUMMARY:');
  console.log('  ERROR: ' + byLevel.ERROR.length);
  console.log('  WARN: ' + byLevel.WARN.length);
  console.log('  INFO: ' + byLevel.INFO.length);
  console.log('  TOTAL: ' + data.length);
  console.log('');
  
  ['ERROR', 'WARN', 'INFO'].forEach(level => {
    if (byLevel[level].length > 0) {
      console.log('');
      console.log(level + ' (' + byLevel[level].length + '):');
      console.log('-'.repeat(60));
      byLevel[level].forEach((advisor, idx) => {
        console.log('');
        console.log((idx + 1) + '. ' + (advisor.name || advisor.title || 'Unnamed'));
        console.log('   ' + (advisor.message || advisor.description || ''));
        if (advisor.details) {
          console.log('   Details: ' + JSON.stringify(advisor.details, null, 2));
        }
      });
    }
  });
  
  return data;
}

async function main() {
  const security = await getAdvisors('security');
  const performance = await getAdvisors('performance');
  
  console.log('');
  console.log('');
  console.log('='.repeat(60));
  console.log('FINAL SUMMARY');
  console.log('='.repeat(60));
  console.log('Security issues: ' + security.length);
  console.log('Performance issues: ' + performance.length);
  console.log('TOTAL issues: ' + (security.length + performance.length));
  console.log('');
}

main().catch(console.error);
