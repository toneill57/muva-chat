#!/usr/bin/env tsx
/**
 * Chunk code files for embedding generation
 * Uses simple character-based chunking with overlap
 */

import fs from 'fs';
import path from 'path';

interface FileEntry {
  relativePath: string;
  absolutePath: string;
  extension: string;
  size: number;
}

interface CodeChunk {
  file_path: string;
  chunk_index: number;
  content: string;
  start_line: number;
  end_line: number;
  metadata: {
    extension: string;
    language: string;
    file_size: number;
  };
}

// Chunk configuration
const CHUNK_SIZE = 2000; // ~512 tokens
const CHUNK_OVERLAP = 500; // ~128 tokens for context

function getLanguage(extension: string): string {
  const languageMap: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'typescript-react',
    '.js': 'javascript',
    '.jsx': 'javascript-react',
    '.py': 'python',
    '.sql': 'sql',
    '.md': 'markdown',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.sh': 'bash',
  };
  return languageMap[extension] || 'text';
}

function countLines(text: string, endPos: number): number {
  return text.substring(0, endPos).split('\n').length;
}

function chunkFile(file: FileEntry): CodeChunk[] {
  const content = fs.readFileSync(file.absolutePath, 'utf-8');
  const chunks: CodeChunk[] = [];

  // If file is smaller than chunk size, return as single chunk
  if (content.length <= CHUNK_SIZE) {
    chunks.push({
      file_path: file.relativePath,
      chunk_index: 0,
      content: content.trim(),
      start_line: 1,
      end_line: content.split('\n').length,
      metadata: {
        extension: file.extension,
        language: getLanguage(file.extension),
        file_size: file.size,
      },
    });
    return chunks;
  }

  // Chunk larger files with overlap
  let chunkIndex = 0;
  let position = 0;

  while (position < content.length) {
    const endPos = Math.min(position + CHUNK_SIZE, content.length);
    let chunkContent = content.substring(position, endPos);

    // Try to end at a newline for cleaner chunks
    if (endPos < content.length) {
      const lastNewline = chunkContent.lastIndexOf('\n');
      if (lastNewline > CHUNK_SIZE * 0.8) { // At least 80% of chunk size
        chunkContent = chunkContent.substring(0, lastNewline);
      }
    }

    const startLine = countLines(content, position);
    const endLine = countLines(content, position + chunkContent.length);

    chunks.push({
      file_path: file.relativePath,
      chunk_index: chunkIndex,
      content: chunkContent.trim(),
      start_line: startLine,
      end_line: endLine,
      metadata: {
        extension: file.extension,
        language: getLanguage(file.extension),
        file_size: file.size,
      },
    });

    chunkIndex++;
    position += chunkContent.length;

    // Apply overlap for next chunk
    if (position < content.length) {
      position -= CHUNK_OVERLAP;
    }
  }

  return chunks;
}

async function main() {
  const rootDir = process.cwd();
  const filesPath = path.join(rootDir, 'data', 'codebase-files.json');

  if (!fs.existsSync(filesPath)) {
    console.error('❌ Error: codebase-files.json not found');
    console.error('   Run: npx tsx scripts/scan-codebase.ts first');
    process.exit(1);
  }

  console.log('📄 Loading file list...');
  const files: FileEntry[] = JSON.parse(fs.readFileSync(filesPath, 'utf-8'));

  console.log(`📝 Chunking ${files.length} files...\n`);

  const allChunks: CodeChunk[] = [];
  let filesProcessed = 0;

  for (const file of files) {
    try {
      const chunks = chunkFile(file);
      allChunks.push(...chunks);
      filesProcessed++;

      if (filesProcessed % 50 === 0) {
        console.log(`   Processed ${filesProcessed}/${files.length} files (${allChunks.length} chunks)...`);
      }
    } catch (error) {
      console.error(`   ⚠️  Failed to chunk ${file.relativePath}: ${error}`);
    }
  }

  console.log(`\n✅ Generated ${allChunks.length} chunks from ${filesProcessed} files`);

  // Statistics
  const chunksByLanguage: Record<string, number> = {};
  for (const chunk of allChunks) {
    const lang = chunk.metadata.language;
    chunksByLanguage[lang] = (chunksByLanguage[lang] || 0) + 1;
  }

  console.log('\n📊 Chunks by language:');
  const sortedLangs = Object.entries(chunksByLanguage)
    .sort((a, b) => b[1] - a[1]);

  for (const [lang, count] of sortedLangs) {
    const percentage = ((count / allChunks.length) * 100).toFixed(1);
    console.log(`   ${lang.padEnd(20)} ${count.toString().padStart(6)} (${percentage}%)`);
  }

  // Write output
  const outputPath = path.join(rootDir, 'data', 'code-chunks.jsonl');
  const writer = fs.createWriteStream(outputPath);

  for (const chunk of allChunks) {
    writer.write(JSON.stringify(chunk) + '\n');
  }

  await new Promise<void>((resolve) => {
    writer.end(() => resolve());
  });

  const outputSizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
  console.log(`\n💾 Output: ${outputPath} (${outputSizeMB} MB)`);
}

main().catch(console.error);
