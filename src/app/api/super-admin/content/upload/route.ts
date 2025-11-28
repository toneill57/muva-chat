import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { superAdminMiddleware, getSuperAdminContext } from '@/lib/middleware-super-admin';
import { logContentUpload } from '@/lib/audit-logger';

const execPromise = promisify(exec);

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

    // Guardar archivo al filesystem
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    console.log(`[content-upload] File saved to: ${filePath}`);

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
