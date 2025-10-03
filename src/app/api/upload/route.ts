import { NextRequest, NextResponse } from 'next/server'
import { validateSireFormat } from '@/lib/utils'

export const runtime = 'edge'

// Domain configuration for table segregation (same as in populate-embeddings.js)
const DOMAIN_CONFIG = {
  'sire': {
    table: 'sire_content',
    description: 'SIRE regulatory and compliance content',
    searchFunction: 'match_sire_documents',
    documentTypes: ['sire_regulatory', 'sire_template', 'compliance_guide']
  },
  'hotel': {
    table: 'simmerdown.content',
    description: 'Hotel operations and guest services',
    searchFunction: 'match_listings_documents',
    documentTypes: ['hotel_process', 'amenities', 'policies', 'guest_manual', 'services', 'facilities', 'procedures', 'rates', 'packages']
  },
  'tourism': {
    table: 'muva_content',
    description: 'Tourism and local attractions',
    searchFunction: 'match_muva_documents',
    documentTypes: ['tourism', 'restaurants', 'beaches', 'activities', 'transport', 'hotels', 'culture', 'events']
  },
  'system': {
    table: null, // NO DEFAULT - Must be specified via metadata
    description: 'System documentation and technical content',
    searchFunction: null, // NO DEFAULT - Must be specified via metadata
    documentTypes: ['system_docs', 'general_docs', 'technical']
  }
}

// Document type schemas with domain mapping
const DOCUMENT_TYPE_SCHEMAS = {
  'sire_regulatory': {
    description: 'Official SIRE regulatory documents and procedures',
    domain: 'sire',
    requiredFields: ['title', 'type'],
    suggestedFields: ['description', 'category', 'priority', 'version'],
    autoEmbed: true,
    keywords: []
  },
  'sire_template': {
    description: 'SIRE file templates and format examples',
    domain: 'sire',
    requiredFields: ['title', 'type'],
    suggestedFields: ['description', 'version', 'format'],
    autoEmbed: true,
    keywords: []
  },
  'compliance_guide': {
    description: 'Compliance guides and best practices',
    domain: 'sire',
    requiredFields: ['title', 'type'],
    suggestedFields: ['description', 'regulatory_level', 'audience'],
    autoEmbed: true,
    keywords: []
  },
  'hotel_process': {
    description: 'Internal hotel procedures and guides',
    domain: 'hotel',
    requiredFields: ['title', 'type'],
    suggestedFields: ['description', 'audience', 'priority'],
    autoEmbed: true,
    keywords: []
  },
  'tourism': {
    description: 'Tourism attractions and activities',
    domain: 'tourism',
    requiredFields: ['title', 'type'],
    suggestedFields: ['description', 'location', 'category'],
    autoEmbed: true,
    keywords: []
  },
  'restaurants': {
    description: 'Restaurant and dining information',
    domain: 'tourism',
    requiredFields: ['title', 'type'],
    suggestedFields: ['description', 'cuisine', 'location', 'price_range'],
    autoEmbed: true,
    keywords: []
  },
  'beaches': {
    description: 'Beach and coastal information',
    domain: 'tourism',
    requiredFields: ['title', 'type'],
    suggestedFields: ['description', 'location', 'amenities'],
    autoEmbed: true,
    keywords: []
  },
  'activities': {
    description: 'Tourist activities and experiences',
    domain: 'tourism',
    requiredFields: ['title', 'type'],
    suggestedFields: ['description', 'duration', 'difficulty', 'location'],
    autoEmbed: true,
    keywords: []
  },
  'culture': {
    description: 'Cultural sites and heritage information',
    domain: 'tourism',
    requiredFields: ['title', 'type'],
    suggestedFields: ['description', 'historical_period', 'significance'],
    autoEmbed: true,
    keywords: []
  },
  'events': {
    description: 'Local events and festivals',
    domain: 'tourism',
    requiredFields: ['title', 'type'],
    suggestedFields: ['description', 'date', 'location', 'frequency'],
    autoEmbed: true,
    keywords: []
  },
  'system_docs': {
    description: 'Technical system documentation',
    domain: 'system',
    requiredFields: ['title', 'type'],
    suggestedFields: ['description', 'technical_level', 'language'],
    autoEmbed: true,
    keywords: []
  },
  'general_docs': {
    description: 'General documentation not fitting other categories',
    domain: 'system',
    requiredFields: ['title'],
    suggestedFields: ['description', 'type'],
    autoEmbed: false,
    keywords: []
  }
}

function extractFrontmatter(content: string) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---/
  const match = content.match(frontmatterRegex)

  if (!match) {
    return { frontmatter: null, content }
  }

  const frontmatterText = match[1]
  const contentWithoutFrontmatter = content.replace(match[0], '').trim()

  // Parse YAML-like frontmatter
  const frontmatter: Record<string, any> = {}
  frontmatterText.split('\n').forEach(line => {
    const colonIndex = line.indexOf(':')
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim()
      let value: any = line.substring(colonIndex + 1).trim()

      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }

      // Parse arrays
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map((v: string) => v.trim())
      }

      // Parse booleans
      if (value === 'true') value = true
      if (value === 'false') value = false

      frontmatter[key] = value
    }
  })

  return { frontmatter, content: contentWithoutFrontmatter }
}

function determineDocumentType(fileName: string, content: string, frontmatter: any = null): string {
  // Check frontmatter first for explicit type declaration
  if (frontmatter?.type && DOCUMENT_TYPE_SCHEMAS[frontmatter.type as keyof typeof DOCUMENT_TYPE_SCHEMAS]) {
    return frontmatter.type
  }

  // METADATA-DRIVEN: No automatic content analysis
  // All document types must be explicitly specified via metadata
  // This function is now deprecated - only metadata routing is supported

  throw new Error('METADATA REQUIRED: Document type must be explicitly specified in frontmatter or .meta.json file. Automatic detection disabled in metadata-driven system.')
}

// Helper functions for domain management
function getTargetTable(documentType: string): string | null {
  const schema = DOCUMENT_TYPE_SCHEMAS[documentType as keyof typeof DOCUMENT_TYPE_SCHEMAS]
  if (!schema) {
    return null // NO DEFAULT - Metadata required
  }

  const domain = schema.domain
  const targetTable = DOMAIN_CONFIG[domain as keyof typeof DOMAIN_CONFIG]?.table

  if (!targetTable) {
    throw new Error(`No table configured for domain '${domain}'. Metadata must specify explicit destination.`)
  }

  return targetTable
}

function getDomainInfo(documentType: string) {
  const schema = DOCUMENT_TYPE_SCHEMAS[documentType as keyof typeof DOCUMENT_TYPE_SCHEMAS]
  if (!schema) return null

  const domain = schema.domain
  return DOMAIN_CONFIG[domain as keyof typeof DOMAIN_CONFIG] || null
}

function shouldAutoEmbed(frontmatter: any, documentType: string, fileSize: number): boolean {
  // Explicit frontmatter control takes precedence
  if (frontmatter?.auto_embed === false) {
    return false
  }
  if (frontmatter?.auto_embed === true) {
    return true
  }

  // Document type defaults
  const schema = DOCUMENT_TYPE_SCHEMAS[documentType as keyof typeof DOCUMENT_TYPE_SCHEMAS]
  if (schema?.autoEmbed === true) {
    return true
  }

  // File characteristics validation
  if (fileSize > 100000) { // >100KB
    return false
  }

  // Default to manual review for undefined types
  return false
}

function validateDocumentMetadata(frontmatter: any, documentType: string) {
  const schema = DOCUMENT_TYPE_SCHEMAS[documentType as keyof typeof DOCUMENT_TYPE_SCHEMAS]
  if (!schema) {
    return {
      isValid: false,
      errors: [`Unknown document type: ${documentType}`],
      suggestions: []
    }
  }

  const errors: string[] = []
  const suggestions: string[] = []

  // Check required fields
  for (const requiredField of schema.requiredFields) {
    if (!frontmatter || !frontmatter[requiredField]) {
      errors.push(`Missing required field: ${requiredField}`)
    }
  }

  // Suggest missing optional but recommended fields
  for (const suggestedField of schema.suggestedFields) {
    if (!frontmatter || !frontmatter[suggestedField]) {
      suggestions.push(`Consider adding: ${suggestedField}`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    suggestions,
    schema
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        {
          error: 'File too large',
          message: 'Maximum file size is 10MB'
        },
        { status: 400 }
      )
    }

    const fileName = file.name.toLowerCase()
    const content = await file.text()

    // Determine file type and processing strategy
    if (fileName.endsWith('.txt') || fileName.endsWith('.csv')) {
      // SIRE file validation
      const validation = validateSireFormat(content)

      return NextResponse.json({
        fileType: 'sire_data',
        fileName: file.name,
        fileSize: file.size,
        isValid: validation.isValid,
        lineCount: validation.lineCount,
        format: validation.format,
        errors: validation.errors,
        detailedErrors: validation.detailedErrors,
        preview: validation.preview,
        fieldValidation: validation.fieldValidation,
        autoEmbedEligible: false, // SIRE data files are not embedded
        timestamp: new Date().toISOString()
      })

    } else if (fileName.endsWith('.md')) {
      // METADATA-DRIVEN: Markdown document processing
      const { frontmatter, content: cleanContent } = extractFrontmatter(content)
      const documentType = determineDocumentType(file.name, cleanContent, frontmatter)
      const autoEmbedEligible = shouldAutoEmbed(frontmatter, documentType, file.size)
      const metadataValidation = validateDocumentMetadata(frontmatter, documentType)

      // Get domain and table information
      const targetTable = getTargetTable(documentType)
      const domainInfo = getDomainInfo(documentType)

      return NextResponse.json({
        fileType: 'markdown_document',
        fileName: file.name,
        fileSize: file.size,
        documentType,
        frontmatter,
        autoEmbedEligible,
        domain: {
          name: domainInfo?.description || 'System documentation',
          table: targetTable,
          searchFunction: domainInfo?.searchFunction || 'match_documents'
        },
        metadata: {
          isValid: metadataValidation.isValid,
          errors: metadataValidation.errors,
          suggestions: metadataValidation.suggestions,
          schema: metadataValidation.schema
        },
        contentPreview: cleanContent.substring(0, 500) + (cleanContent.length > 500 ? '...' : ''),
        wordCount: cleanContent.split(/\s+/).length,
        estimatedChunks: Math.ceil(cleanContent.length / 1000),
        timestamp: new Date().toISOString()
      })

    } else {
      return NextResponse.json(
        {
          error: 'Invalid file type',
          message: 'Only .txt, .csv (SIRE data) and .md (documentation) files are allowed'
        },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error in upload API:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to process file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Unified file upload API endpoint - Use POST method',
    description: 'Upload SIRE data files (.txt/.csv) or documentation files (.md)',
    supportedTypes: {
      sire_data: {
        extensions: ['.txt', '.csv'],
        description: 'SIRE guest data files for validation',
        validation: 'Format and field validation',
        autoEmbed: false
      },
      markdown_document: {
        extensions: ['.md'],
        description: 'Documentation files for embedding',
        validation: 'Metadata-driven validation only',
        autoEmbed: 'Based on document type and frontmatter'
      }
    },
    requirements: {
      method: 'POST',
      contentType: 'multipart/form-data',
      field: 'file',
      maxSize: '10MB'
    },
    documentTypes: Object.keys(DOCUMENT_TYPE_SCHEMAS).map(type => ({
      type,
      description: DOCUMENT_TYPE_SCHEMAS[type as keyof typeof DOCUMENT_TYPE_SCHEMAS].description,
      autoEmbed: DOCUMENT_TYPE_SCHEMAS[type as keyof typeof DOCUMENT_TYPE_SCHEMAS].autoEmbed
    }))
  })
}