import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { superAdminMiddleware } from '@/lib/middleware-super-admin';
import { unlink } from 'fs/promises';
import path from 'path';

/**
 * DELETE /api/super-admin/content/delete?id={content_id}
 * DELETE /api/super-admin/content/delete?ids={id1,id2,id3}
 * DELETE /api/super-admin/content/delete?source_file={filename}
 * DELETE /api/super-admin/content/delete?source_files={file1,file2}
 *
 * Delete content from database and filesystem
 *
 * Query params:
 * - id: string (single content UUID)
 * - ids: string (comma-separated content UUIDs for batch delete)
 * - source_file: string (delete ALL chunks of a document by source_file)
 * - source_files: string (comma-separated source_files for batch delete)
 *
 * Returns:
 * - success: boolean
 * - message: string
 * - deletedCount: number
 * - filesDeleted: number
 */
export async function DELETE(request: NextRequest) {
  console.log('[content-delete] ========== DELETE REQUEST START ==========');

  // Verify super admin authentication
  const authResult = await superAdminMiddleware(request);
  console.log('[content-delete] Auth result:', authResult.status);

  // If middleware returns a response (error), return it
  if (authResult instanceof NextResponse && authResult.status !== 200) {
    console.log('[content-delete] Auth failed:', authResult.status);
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const singleId = searchParams.get('id');
    const multipleIds = searchParams.get('ids');
    const singleSourceFile = searchParams.get('source_file');
    const multipleSourceFiles = searchParams.get('source_files');

    const supabase = createServerClient();

    // Determine delete mode: by ID or by source_file
    let contentIds: string[] = [];
    let sourceFiles: string[] = [];

    if (singleSourceFile) {
      sourceFiles.push(singleSourceFile);
    } else if (multipleSourceFiles) {
      sourceFiles.push(...multipleSourceFiles.split(',').filter(f => f.trim()));
    } else if (singleId) {
      contentIds.push(singleId);
    } else if (multipleIds) {
      contentIds.push(...multipleIds.split(',').filter(id => id.trim()));
    }

    // If deleting by source_file, first get all chunk IDs
    if (sourceFiles.length > 0) {
      console.log(`[content-delete] Deleting by source_file: ${sourceFiles.join(', ')}`);

      const { data: chunks, error: fetchError } = await supabase
        .from('muva_content')
        .select('id')
        .in('source_file', sourceFiles);

      if (fetchError) {
        console.error(`[content-delete] Fetch error:`, fetchError);
        throw fetchError;
      }

      if (chunks && chunks.length > 0) {
        contentIds = chunks.map(c => c.id);
        console.log(`[content-delete] Found ${contentIds.length} chunks for ${sourceFiles.length} document(s)`);
      }
    }

    if (contentIds.length === 0) {
      console.log('[content-delete] Missing ID parameter or no content found');
      return NextResponse.json(
        { error: 'Missing content ID parameter or no content found. Use ?id=xxx, ?ids=xxx,yyy, ?source_file=xxx, or ?source_files=xxx,yyy' },
        { status: 400 }
      );
    }

    const isBatch = contentIds.length > 1;

    console.log(`[content-delete] Deleting ${contentIds.length} content item(s)`);
    console.log(`[content-delete] ENV check - SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30)}...`);
    console.log(`[content-delete] ENV check - SERVICE_ROLE_KEY exists: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`);

    // Fetch all content items to get file paths (for filesystem cleanup)
    const { data: contentItems, error: fetchError } = await supabase
      .from('muva_content')
      .select('id, title, category, source_file')
      .in('id', contentIds);

    if (fetchError) {
      console.error(`[content-delete] Fetch error:`, fetchError);
      console.error(`[content-delete] Fetch error code:`, fetchError.code);
      console.error(`[content-delete] Fetch error details:`, fetchError.details);
      console.error(`[content-delete] Fetch error hint:`, fetchError.hint);
      throw fetchError;
    }

    if (!contentItems || contentItems.length === 0) {
      console.log('[content-delete] Content not found');
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    // Get unique source_files for filesystem cleanup
    const uniqueSourceFiles = [...new Set(contentItems.map(c => c.source_file).filter(Boolean))];
    console.log(`[content-delete] Found ${contentItems.length} chunks from ${uniqueSourceFiles.length} unique document(s)`);

    // Delete from database
    console.log('[content-delete] Attempting DELETE from database...');
    const { error: deleteError } = await supabase
      .from('muva_content')
      .delete()
      .in('id', contentIds);

    if (deleteError) {
      console.error(`[content-delete] Delete error:`, deleteError);
      console.error(`[content-delete] Delete error code:`, deleteError.code);
      console.error(`[content-delete] Delete error details:`, deleteError.details);
      console.error(`[content-delete] Delete error hint:`, deleteError.hint);
      console.error(`[content-delete] Delete error message:`, deleteError.message);
      throw deleteError;
    }

    console.log(`[content-delete] ${contentItems.length} chunk(s) deleted from database`);

    // Try to delete files from filesystem (only once per unique source_file)
    let filesDeleted = 0;
    const deletedFiles = new Set<string>();

    for (const sourceFile of uniqueSourceFiles) {
      if (sourceFile && !deletedFiles.has(sourceFile)) {
        try {
          const filePath = path.join(process.cwd(), sourceFile);
          await unlink(filePath);
          filesDeleted++;
          deletedFiles.add(sourceFile);
          console.log(`[content-delete] File deleted: ${filePath}`);
        } catch (fsError: any) {
          console.warn(`[content-delete] Could not delete file ${sourceFile}:`, fsError.message);
        }
      }
    }

    console.log('[content-delete] ========== DELETE SUCCESS ==========');
    console.log(`[content-delete] Deleted ${contentItems.length} chunks from ${uniqueSourceFiles.length} documents, ${filesDeleted} files removed`);

    return NextResponse.json({
      success: true,
      message: uniqueSourceFiles.length > 1
        ? `${uniqueSourceFiles.length} documents deleted successfully (${contentItems.length} chunks)`
        : `Document deleted successfully (${contentItems.length} chunks)`,
      deletedCount: contentItems.length,
      documentsDeleted: uniqueSourceFiles.length,
      filesDeleted,
      deletedDocuments: uniqueSourceFiles
    });

  } catch (error: any) {
    console.error(`[content-delete] Error:`, error);

    return NextResponse.json({
      error: 'Failed to delete content',
      details: error.message
    }, { status: 500 });
  }
}
