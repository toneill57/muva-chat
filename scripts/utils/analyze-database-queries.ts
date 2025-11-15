/**
 * Database Query Analyzer
 *
 * Analyzes codebase for database query patterns, identifies N+1 issues,
 * and suggests optimization opportunities.
 *
 * Usage:
 *   pnpm dlx tsx scripts/analyze-database-queries.ts
 *   pnpm dlx tsx scripts/analyze-database-queries.ts --verbose
 *   pnpm dlx tsx scripts/analyze-database-queries.ts --export
 */

import fs from 'fs'
import path from 'path'
import { glob } from 'glob'

// ============================================================================
// Types
// ============================================================================

interface QueryPattern {
  file: string
  line: number
  type: 'select' | 'insert' | 'update' | 'delete' | 'rpc'
  table?: string
  method: string
  code: string
  risk: 'high' | 'medium' | 'low'
  issue?: string
}

interface FileAnalysis {
  file: string
  queries: QueryPattern[]
  loops: number
  potentialN1: boolean
}

interface AnalysisSummary {
  totalFiles: number
  totalQueries: number
  queriesByType: Record<string, number>
  highRiskPatterns: number
  potentialN1Issues: number
  recommendations: string[]
}

// ============================================================================
// Configuration
// ============================================================================

const PATTERNS = {
  // Supabase query patterns
  supabaseFrom: /supabase\.from\(['"]([\w_]+)['"]\)/g,
  supabaseRpc: /supabase\.rpc\(['"]([\w_]+)['"]/g,

  // Loop patterns (potential N+1)
  forLoop: /for\s*\([^)]+\)|for\s+\w+\s+of\s+/g,
  forEachLoop: /\.forEach\(/g,
  mapLoop: /\.map\(/g,

  // Async operations in loops (red flag)
  awaitInLoop: /for[^{]*{[^}]*await/gs,
}

const SRC_DIR = path.join(process.cwd(), 'src')

// ============================================================================
// File Scanner
// ============================================================================

async function scanFiles(): Promise<string[]> {
  const pattern = path.join(SRC_DIR, '**', '*.{ts,tsx}')
  const files = await glob(pattern, {
    ignore: ['**/node_modules/**', '**/*.test.ts', '**/*.spec.ts'],
  })
  return files
}

function readFileLines(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  return content.split('\n')
}

// ============================================================================
// Query Analysis
// ============================================================================

function analyzeFile(filePath: string): FileAnalysis {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = readFileLines(filePath)
  const queries: QueryPattern[] = []

  // Find all supabase.from() queries
  let match
  while ((match = PATTERNS.supabaseFrom.exec(content)) !== null) {
    const table = match[1]
    const lineNumber = content.substring(0, match.index).split('\n').length
    const line = lines[lineNumber - 1] || ''

    queries.push({
      file: filePath,
      line: lineNumber,
      type: 'select',
      table,
      method: 'from',
      code: line.trim(),
      risk: 'low',
    })
  }

  // Find all supabase.rpc() queries
  PATTERNS.supabaseRpc.lastIndex = 0
  while ((match = PATTERNS.supabaseRpc.exec(content)) !== null) {
    const rpcName = match[1]
    const lineNumber = content.substring(0, match.index).split('\n').length
    const line = lines[lineNumber - 1] || ''

    queries.push({
      file: filePath,
      line: lineNumber,
      type: 'rpc',
      method: 'rpc',
      code: line.trim(),
      risk: 'low',
    })
  }

  // Count loops
  const loops = (content.match(PATTERNS.forLoop) || []).length +
                (content.match(PATTERNS.forEachLoop) || []).length +
                (content.match(PATTERNS.mapLoop) || []).length

  // Check for await in loops (N+1 red flag)
  const awaitInLoops = content.match(PATTERNS.awaitInLoop) || []
  const potentialN1 = awaitInLoops.length > 0 && queries.length > 0

  // Mark queries in files with loops as potential N+1
  if (potentialN1) {
    queries.forEach(query => {
      query.risk = 'high'
      query.issue = 'Potential N+1: Query inside loop with await'
    })
  }

  return {
    file: path.relative(process.cwd(), filePath),
    queries,
    loops,
    potentialN1,
  }
}

// ============================================================================
// Analysis Functions
// ============================================================================

function analyzeAll(files: string[]): FileAnalysis[] {
  return files
    .map(analyzeFile)
    .filter(analysis => analysis.queries.length > 0)
    .sort((a, b) => {
      // Sort by risk: potential N+1 first
      if (a.potentialN1 && !b.potentialN1) return -1
      if (!a.potentialN1 && b.potentialN1) return 1
      return b.queries.length - a.queries.length
    })
}

function generateSummary(analyses: FileAnalysis[]): AnalysisSummary {
  const allQueries = analyses.flatMap(a => a.queries)
  const queriesByType: Record<string, number> = {}

  allQueries.forEach(q => {
    queriesByType[q.type] = (queriesByType[q.type] || 0) + 1
  })

  const highRiskPatterns = allQueries.filter(q => q.risk === 'high').length
  const potentialN1Issues = analyses.filter(a => a.potentialN1).length

  const recommendations: string[] = []

  if (potentialN1Issues > 0) {
    recommendations.push(`🚨 Found ${potentialN1Issues} files with potential N+1 query patterns`)
    recommendations.push('   → Use Promise.all() to parallelize independent queries')
    recommendations.push('   → Use JOINs instead of separate queries')
    recommendations.push('   → Consider batch loading with DataLoader pattern')
  }

  if (queriesByType.rpc > 10) {
    recommendations.push(`📊 Heavy RPC usage detected (${queriesByType.rpc} calls)`)
    recommendations.push('   → Review RPC function performance with EXPLAIN ANALYZE')
    recommendations.push('   → Consider adding indexes for common query patterns')
  }

  return {
    totalFiles: analyses.length,
    totalQueries: allQueries.length,
    queriesByType,
    highRiskPatterns,
    potentialN1Issues,
    recommendations,
  }
}

// ============================================================================
// Visualization
// ============================================================================

function printReport(analyses: FileAnalysis[], summary: AnalysisSummary): void {
  console.log('\n╔══════════════════════════════════════════════════════════════╗')
  console.log('║          📊 DATABASE QUERY ANALYSIS REPORT                  ║')
  console.log('╚══════════════════════════════════════════════════════════════╝\n')

  // Summary Statistics
  console.log('📈 SUMMARY STATISTICS')
  console.log('━'.repeat(64))
  console.log(`Files with queries:       ${summary.totalFiles}`)
  console.log(`Total queries found:      ${summary.totalQueries}`)
  console.log(`High-risk patterns:       ${summary.highRiskPatterns}`)
  console.log(`Potential N+1 issues:     ${summary.potentialN1Issues}`)

  console.log('\nQueries by type:')
  Object.entries(summary.queriesByType).forEach(([type, count]) => {
    const bar = '█'.repeat(Math.min(count, 30))
    console.log(`  ${type.padEnd(10)} ${bar} ${count}`)
  })

  // High Risk Files
  if (summary.potentialN1Issues > 0) {
    console.log('\n\n🚨 HIGH RISK: POTENTIAL N+1 QUERY PATTERNS')
    console.log('━'.repeat(64))

    analyses
      .filter(a => a.potentialN1)
      .slice(0, 10)
      .forEach((analysis, idx) => {
        console.log(`\n${idx + 1}. ${analysis.file}`)
        console.log(`   Queries: ${analysis.queries.length} | Loops: ${analysis.loops}`)

        analysis.queries
          .filter(q => q.risk === 'high')
          .slice(0, 3)
          .forEach(query => {
            console.log(`   Line ${query.line}: ${query.code.substring(0, 60)}...`)
          })
      })
  }

  // Top Query Files
  console.log('\n\n📁 TOP 10 FILES BY QUERY COUNT')
  console.log('━'.repeat(64))

  analyses
    .sort((a, b) => b.queries.length - a.queries.length)
    .slice(0, 10)
    .forEach((analysis, idx) => {
      const risk = analysis.potentialN1 ? '🚨' : '✓'
      console.log(`${idx + 1}. ${risk} ${analysis.file.padEnd(45)} ${analysis.queries.length} queries`)
    })

  // Recommendations
  if (summary.recommendations.length > 0) {
    console.log('\n\n💡 RECOMMENDATIONS')
    console.log('━'.repeat(64))
    summary.recommendations.forEach(rec => console.log(rec))
  }

  console.log('\n' + '━'.repeat(64))
  console.log(`\n✓ Analyzed ${analyses.length} files with database queries\n`)
}

// ============================================================================
// Export Functions
// ============================================================================

function exportToJSON(analyses: FileAnalysis[], summary: AnalysisSummary): void {
  const output = {
    generatedAt: new Date().toISOString(),
    summary,
    analyses: analyses.slice(0, 50), // Limit to top 50
  }

  const outputPath = path.join(process.cwd(), 'docs', 'performance-optimization', 'query-analysis.json')
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))
  console.log(`\n✓ Analysis exported to: ${outputPath}\n`)
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2)
  const verbose = args.includes('--verbose')
  const exportMode = args.includes('--export')

  console.log('\n🔍 Scanning codebase for database queries...\n')

  const files = await scanFiles()
  console.log(`   Found ${files.length} TypeScript files\n`)

  const analyses = analyzeAll(files)
  const summary = generateSummary(analyses)

  printReport(analyses, summary)

  if (exportMode) {
    exportToJSON(analyses, summary)
  }

  if (verbose) {
    console.log('\n📝 DETAILED FILE ANALYSIS')
    console.log('━'.repeat(64))

    analyses.slice(0, 5).forEach(analysis => {
      console.log(`\nFile: ${analysis.file}`)
      console.log(`Queries: ${analysis.queries.length} | Loops: ${analysis.loops} | Risk: ${analysis.potentialN1 ? 'HIGH' : 'LOW'}`)

      analysis.queries.forEach(query => {
        console.log(`  Line ${query.line} [${query.type}]: ${query.code}`)
        if (query.issue) {
          console.log(`    ⚠️  ${query.issue}`)
        }
      })
    })
  }
}

main()
