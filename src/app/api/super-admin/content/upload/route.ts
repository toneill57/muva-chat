import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { superAdminMiddleware, getSuperAdminContext } from '@/lib/middleware-super-admin';
import { logContentUpload } from '@/lib/audit-logger';

const execPromise = promisify(exec);

// ============================================================================
// Frontmatter Processing (Merge Inteligente)
// ============================================================================

/**
 * Mapeo de categorías del dropdown a document.category
 */
const CATEGORY_MAP: Record<string, string> = {
  'actividades': 'activities',
  'accommodations': 'accommodations',
  'restaurants': 'restaurants',
  'rentals': 'rentals',
  'spots': 'spots',
  'culture': 'culture'
};

/**
 * Parse frontmatter YAML from content
 * Returns { frontmatter: object | null, body: string }
 */
function parseFrontmatter(content: string): { frontmatter: Record<string, any> | null; body: string } {
  const trimmed = content.trim();

  // Check if starts with ---
  if (!trimmed.startsWith('---')) {
    return { frontmatter: null, body: content };
  }

  // Find closing ---
  const endIndex = trimmed.indexOf('---', 3);
  if (endIndex === -1) {
    return { frontmatter: null, body: content };
  }

  const yamlContent = trimmed.substring(3, endIndex).trim();
  const body = trimmed.substring(endIndex + 3).trim();

  // Simple YAML parser for our specific structure
  try {
    const frontmatter = parseSimpleYaml(yamlContent);
    return { frontmatter, body };
  } catch (e) {
    console.warn('[content-upload] Failed to parse YAML frontmatter:', e);
    return { frontmatter: null, body: content };
  }
}

/**
 * Simple YAML parser (handles nested objects)
 */
function parseSimpleYaml(yaml: string): Record<string, any> {
  const result: Record<string, any> = {};
  const lines = yaml.split('\n');
  const stack: { obj: Record<string, any>; indent: number }[] = [{ obj: result, indent: -1 }];

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const match = line.match(/^(\s*)([^:]+):\s*(.*)$/);
    if (!match) continue;

    const indent = match[1].length;
    const key = match[2].trim();
    let value: any = match[3].trim();

    // Remove quotes from value
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    // Pop stack until we find parent
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].obj;

    if (value === '' || value === null) {
      // Nested object
      parent[key] = {};
      stack.push({ obj: parent[key], indent });
    } else {
      // Simple value
      parent[key] = value;
    }
  }

  return result;
}

/**
 * Convert object to YAML string
 */
function stringifyYaml(obj: Record<string, any>, indent: number = 0): string {
  let result = '';
  const spaces = '  '.repeat(indent);

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;

    if (typeof value === 'object' && !Array.isArray(value)) {
      result += `${spaces}${key}:\n`;
      result += stringifyYaml(value, indent + 1);
    } else if (Array.isArray(value)) {
      result += `${spaces}${key}:\n`;
      for (const item of value) {
        if (typeof item === 'object') {
          result += `${spaces}  -\n`;
          result += stringifyYaml(item, indent + 2);
        } else {
          result += `${spaces}  - ${item}\n`;
        }
      }
    } else {
      // Quote strings that might need it
      const needsQuotes = typeof value === 'string' &&
        (value.includes(':') || value.includes('#') || value.includes('"'));
      const quotedValue = needsQuotes ? `"${value}"` : value;
      result += `${spaces}${key}: ${quotedValue}\n`;
    }
  }

  return result;
}

/**
 * Deep merge two objects (source has priority)
 */
function deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else if (source[key] !== undefined && source[key] !== '' && source[key] !== null) {
      result[key] = source[key];
    }
  }

  return result;
}

/**
 * Build template frontmatter based on category
 */
function buildTemplateFrontmatter(category: string, filename: string): Record<string, any> {
  const documentCategory = CATEGORY_MAP[category] || category;
  const title = filename.replace(/\.md$/i, '').replace(/-/g, ' ');

  return {
    version: '3.0',
    type: 'tourism',
    destination: {
      schema: 'public',
      table: 'muva_content'
    },
    document: {
      title: title,
      description: 'Documento turistico MUVA',
      category: documentCategory,
      subcategory: 'general'
    },
    metadata: {
      created_via: 'super_admin_upload',
      uploaded_at: new Date().toISOString()
    }
  };
}

/**
 * Process frontmatter with merge strategy
 * - If no frontmatter: inject complete template
 * - If partial frontmatter: merge with template (user fields have priority)
 */
function processContentWithFrontmatter(
  content: string,
  category: string,
  filename: string
): string {
  const { frontmatter: existing, body } = parseFrontmatter(content);
  const template = buildTemplateFrontmatter(category, filename);

  // Merge: template as base, existing has priority
  const merged = existing ? deepMerge(template, existing) : template;

  // Ensure critical fields from category
  if (!merged.document) merged.document = {};
  if (!merged.document.category || merged.document.category === 'general') {
    merged.document.category = CATEGORY_MAP[category] || category;
  }

  // Build final content
  const yamlStr = stringifyYaml(merged);
  return `---\n${yamlStr}---\n\n${body}`;
}

// Categorías válidas basadas en la estructura de _assets/muva/listings/
const VALID_CATEGORIES = [
  'actividades',
  'accommodations',
  'restaurants',
  'rentals',
  'spots',
  'culture'
] as const;

type Category = typeof VALID_CATEGORIES[number];

/**
 * POST /api/super-admin/content/upload
 *
 * Upload .md file and process embeddings
 *
 * Body (FormData):
 * - file: File (.md)
 * - category: string (actividades|accommodations|restaurants|rentals|spots|culture)
 *
 * Returns:
 * - success: boolean
 * - filename: string
 * - category: string
 * - embeddings: number (count of embeddings created)
 * - message: string
 * - output: string (script stdout)
 */
export async function POST(request: NextRequest) {
  // Verify super admin authentication
  const authResult = await superAdminMiddleware(request);

  // If middleware returns a response (error), return it
  if (authResult instanceof NextResponse && authResult.status !== 200) {
    return authResult;
  }

  // Extract super admin context for audit logging
  const adminContext = getSuperAdminContext(request);
  if (!adminContext) {
    return NextResponse.json(
      { error: 'Unauthorized - Missing admin context' },
      { status: 401 }
    );
  }

  try {
    // Parse FormData
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const category = formData.get('category') as string | null;

    // Validar que tenemos file y category
    if (!file || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: file and category' },
        { status: 400 }
      );
    }

    // Validar que es un archivo .md
    if (!file.name.endsWith('.md')) {
      return NextResponse.json(
        { error: 'Only .md (Markdown) files are allowed' },
        { status: 400 }
      );
    }

    // Validar category contra whitelist
    if (!VALID_CATEGORIES.includes(category as Category)) {
      return NextResponse.json(
        {
          error: 'Invalid category',
          validCategories: VALID_CATEGORIES
        },
        { status: 400 }
      );
    }

    // Sanitizar filename para evitar path traversal
    const sanitizedFilename = path.basename(file.name);
    if (sanitizedFilename !== file.name) {
      return NextResponse.json(
        { error: 'Invalid filename. Path traversal detected.' },
        { status: 400 }
      );
    }

    console.log(`[content-upload] Processing file: ${sanitizedFilename}, category: ${category}`);

    // Construir path de destino
    const uploadDir = path.join(
      process.cwd(),
      '_assets',
      'muva',
      'listings',
      category
    );

    // Crear directorio si no existe (recursive: true)
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, sanitizedFilename);

    // Guardar archivo al filesystem (inicial)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    console.log(`[content-upload] File saved to: ${filePath}`);

    // Process frontmatter: merge with template based on category
    console.log(`[content-upload] Processing frontmatter for category: ${category}`);
    const rawContent = await readFile(filePath, 'utf-8');
    const processedContent = processContentWithFrontmatter(rawContent, category, sanitizedFilename);
    await writeFile(filePath, processedContent);
    console.log(`[content-upload] Frontmatter processed and file updated`);

    // Ejecutar script populate-embeddings.js
    const scriptPath = path.join(process.cwd(), 'scripts', 'database', 'populate-embeddings.js');

    console.log(`[content-upload] Executing embeddings script for: ${filePath}`);

    try {
      const { stdout, stderr } = await execPromise(
        `node "${scriptPath}" "${filePath}"`,
        {
          timeout: 120000, // 2 minutos timeout (algunos archivos pueden ser grandes)
          env: { ...process.env }, // Pasar variables de entorno (SUPABASE_URL, etc)
          cwd: process.cwd() // Ejecutar desde project root
        }
      );

      console.log(`[content-upload] Script executed successfully`);
      console.log(`[content-upload] STDOUT:`, stdout);

      if (stderr) {
        console.warn(`[content-upload] STDERR:`, stderr);
      }

      // Parse output para extraer embeddings count
      // El script loggea: "Successful embeddings: X"
      const embeddingsMatch = stdout.match(/Successful embeddings:\s*(\d+)/i);
      const embeddingsCount = embeddingsMatch ? parseInt(embeddingsMatch[1], 10) : 0;

      // También extraer chunks totales
      const chunksMatch = stdout.match(/Total chunks:\s*(\d+)/i);
      const chunksCount = chunksMatch ? parseInt(chunksMatch[1], 10) : 0;

      // Log content upload to audit log (fire and forget - don't block response)
      logContentUpload(
        adminContext.super_admin_id,
        sanitizedFilename,
        category,
        request
      ).catch((error) => {
        console.error('[content-upload] Failed to log audit entry:', error);
      });

      return NextResponse.json({
        success: true,
        filename: sanitizedFilename,
        category,
        embeddings: embeddingsCount,
        chunks: chunksCount,
        message: 'File uploaded and embeddings processed successfully',
        output: stdout
      });

    } catch (execError: any) {
      console.error(`[content-upload] Embeddings script failed:`, execError);

      return NextResponse.json({
        success: false,
        filename: sanitizedFilename,
        category,
        error: 'Failed to process embeddings',
        details: execError.message,
        stdout: execError.stdout || '',
        stderr: execError.stderr || ''
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error(`[content-upload] Upload error:`, error);

    return NextResponse.json({
      error: 'Upload failed',
      details: error.message
    }, { status: 500 });
  }
}
