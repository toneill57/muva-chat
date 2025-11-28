import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { unlink } from 'fs/promises';
import path from 'path';

/**
 * DELETE /api/super-admin/content/delete?id={content_id}
 *
 * Delete content from database and filesystem
 *
 * Query params:
 * - id: string (content UUID)
 *
 * Returns:
 * - success: boolean
 * - message: string
 * - fileDeleted: boolean (indica si el archivo también fue eliminado)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get('id');

    if (!contentId) {
      return NextResponse.json(
        { error: 'Missing content ID parameter' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    console.log(`[content-delete] Deleting content: ${contentId}`);

    // Primero obtener info del contenido para saber el path del archivo
    const { data: content, error: fetchError } = await supabase
      .from('muva_content')
      .select('*')
      .eq('id', contentId)
      .single();

    if (fetchError) {
      console.error(`[content-delete] Fetch error:`, fetchError);
      throw fetchError;
    }

    if (!content) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    console.log(`[content-delete] Found content: ${content.title} (category: ${content.category})`);

    // Eliminar de la base de datos
    const { error: deleteError } = await supabase
      .from('muva_content')
      .delete()
      .eq('id', contentId);

    if (deleteError) {
      console.error(`[content-delete] Delete error:`, deleteError);
      throw deleteError;
    }

    console.log(`[content-delete] Content deleted from database`);

    // Intentar eliminar archivo del filesystem (si existe metadata con filename)
    let fileDeleted = false;

    if (content.metadata?.filename && content.category) {
      try {
        const filePath = path.join(
          process.cwd(),
          '_assets',
          'muva',
          'listings',
          content.category,
          content.metadata.filename
        );

        await unlink(filePath);
        fileDeleted = true;
        console.log(`[content-delete] File deleted from filesystem: ${filePath}`);

      } catch (fsError: any) {
        // No fallar si el archivo no existe en filesystem
        console.warn(`[content-delete] Could not delete file from filesystem:`, fsError.message);
        fileDeleted = false;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Content deleted successfully',
      fileDeleted,
      deletedContent: {
        id: content.id,
        title: content.title,
        category: content.category
      }
    });

  } catch (error: any) {
    console.error(`[content-delete] Error:`, error);

    return NextResponse.json({
      error: 'Failed to delete content',
      details: error.message
    }, { status: 500 });
  }
}
