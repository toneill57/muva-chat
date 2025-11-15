#!/usr/bin/env tsx
/**
 * Scan codebase and identify files for embedding generation
 * Excludes build artifacts, node_modules, and non-code files
 */

import fs from 'fs';
import path from 'path';

interface FileEntry {
  relativePath: string;
  absolutePath: string;
  extension: string;
  size: number;
}

// Files/directories to exclude
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.next/,
  /\.git/,
  /dist/,
  /build/,
  /coverage/,
  /\.nuxt/,
  /\.cache/,
  /\.turbo/,
  /\.vercel/,
  /\.swc/,
  // Data files from exports
  /^data\//,
  // Lock files
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  // Environment files
  /\.env/,
];

// Code file extensions to include
const INCLUDE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.py',
  '.sql',
  '.md',
  '.json', // Only specific JSON files (package.json, tsconfig.json)
  '.sh',
  '.yaml',
  '.yml',
]);

// Specific JSON files to include
const INCLUDE_JSON_FILES = new Set([
  'package.json',
  'tsconfig.json',
  'next.config.js',
  'tailwind.config.js',
  'supabase.json',
]);

function shouldExclude(relativePath: string): boolean {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(relativePath));
}

function shouldIncludeFile(relativePath: string, extension: string): boolean {
  // Exclude by pattern first
  if (shouldExclude(relativePath)) return false;

  // Include code files by extension
  if (INCLUDE_EXTENSIONS.has(extension)) {
    // For JSON files, only include specific ones
    if (extension === '.json') {
      const fileName = path.basename(relativePath);
      return INCLUDE_JSON_FILES.has(fileName);
    }
    return true;
  }

  return false;
}

function scanDirectory(dir: string, rootDir: string, files: FileEntry[] = []): FileEntry[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    const relativePath = path.relative(rootDir, absolutePath);

    if (entry.isDirectory()) {
      // Skip excluded directories
      if (!shouldExclude(relativePath)) {
        scanDirectory(absolutePath, rootDir, files);
      }
    } else if (entry.isFile()) {
      const extension = path.extname(entry.name);

      if (shouldIncludeFile(relativePath, extension)) {
        const stats = fs.statSync(absolutePath);

        // Skip files larger than 1MB (likely generated/binary)
        if (stats.size < 1024 * 1024) {
          files.push({
            relativePath,
            absolutePath,
            extension,
            size: stats.size,
          });
        }
      }
    }
  }

  return files;
}

async function main() {
  const rootDir = process.cwd();

  console.log('📂 Scanning codebase...');
  console.log(`   Root: ${rootDir}\n`);

  const files = scanDirectory(rootDir, rootDir);

  // Sort by path for consistent ordering
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  // Statistics
  const statsByExtension: Record<string, { count: number; size: number }> = {};
  let totalSize = 0;

  for (const file of files) {
    if (!statsByExtension[file.extension]) {
      statsByExtension[file.extension] = { count: 0, size: 0 };
    }
    statsByExtension[file.extension].count++;
    statsByExtension[file.extension].size += file.size;
    totalSize += file.size;
  }

  console.log(`✅ Found ${files.length} files (${(totalSize / 1024 / 1024).toFixed(2)} MB)\n`);
  console.log('📊 Breakdown by extension:');

  const sortedExtensions = Object.entries(statsByExtension)
    .sort((a, b) => b[1].count - a[1].count);

  for (const [ext, stats] of sortedExtensions) {
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`   ${ext.padEnd(8)} ${stats.count.toString().padStart(5)} files  ${sizeMB.padStart(8)} MB`);
  }

  // Write output file
  const outputPath = path.join(rootDir, 'data', 'codebase-files.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(files, null, 2));

  console.log(`\n💾 Output: ${outputPath}`);
}

main().catch(console.error);
