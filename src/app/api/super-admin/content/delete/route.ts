import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { superAdminMiddleware } from '@/lib/middleware-super-admin';
import { unlink } from 'fs/promises';
import path from 'path';

/**
 * DELETE /api/super-admin/content/delete?id={content_id}
 * DELETE /api/super-admin/content/delete?ids={id1,id2,id3}
 *
 * Delete content from database and filesystem
 *
 * Query params:
 * - id: string (single content UUID)
 * - ids: string (comma-separated content UUIDs for batch delete)
 *
 * Returns:
 * - success: boolean
 * - message: string
 * - deletedCount: number
 * - filesDeleted: number
 */
export async function DELETE(request: NextRequest) {
  // Verify super admin authentication
  const authResult = await superAdminMiddleware(request);

  // If middleware returns a response (error), return it
  if (authResult instanceof NextResponse && authResult.status !== 200) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const singleId = searchParams.get('id');
    const multipleIds = searchParams.get('ids');

    // Support both single ID and multiple IDs
    const contentIds: string[] = [];
    if (singleId) {
      contentIds.push(singleId);
    } else if (multipleIds) {
      contentIds.push(...multipleIds.split(',').filter(id => id.trim()));
    }

    if (contentIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing content ID parameter. Use ?id=xxx or ?ids=xxx,yyy,zzz' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const isBatch = contentIds.length > 1;

    console.log(`[content-delete] Deleting ${contentIds.length} content item(s): ${contentIds.join(', ')}`);

    // Fetch all content items to get file paths
    const { data: contentItems, error: fetchError } = await supabase
      .from('muva_content')
      .select('id, title, category, source_file')
      .in('id', contentIds);

    if (fetchError) {
      console.error(`[content-delete] Fetch error:`, fetchError);
      throw fetchError;
    }

    if (!contentItems || contentItems.length === 0) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    console.log(`[content-delete] Found ${contentItems.length} content item(s)`);

    // Delete from database
    const { error: deleteError } = await supabase
      .from('muva_content')
      .delete()
      .in('id', contentIds);

    if (deleteError) {
      console.error(`[content-delete] Delete error:`, deleteError);
      throw deleteError;
    }

    console.log(`[content-delete] ${contentItems.length} item(s) deleted from database`);

    // Try to delete files from filesystem
    let filesDeleted = 0;

    for (const item of contentItems) {
      // source_file contains the full path like "_assets/muva/listings/restaurants/bali-smoothies.md"
      if (item.source_file) {
        try {
          const filePath = path.join(process.cwd(), item.source_file);

          await unlink(filePath);
          filesDeleted++;
          console.log(`[content-delete] File deleted: ${filePath}`);
        } catch (fsError: any) {
          console.warn(`[content-delete] Could not delete file for ${item.title}:`, fsError.message);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: isBatch
        ? `${contentItems.length} items deleted successfully`
        : 'Content deleted successfully',
      deletedCount: contentItems.length,
      filesDeleted,
      deletedItems: contentItems.map(c => ({
        id: c.id,
        title: c.title,
        category: c.category
      }))
    });

  } catch (error: any) {
    console.error(`[content-delete] Error:`, error);

    return NextResponse.json({
      error: 'Failed to delete content',
      details: error.message
    }, { status: 500 });
  }
}
