# Compliance Components

Componentes para SIRE compliance y captura de datos de huéspedes.

## Components

### DocumentUpload

Componente de drag & drop para subir documentos de identidad (pasaporte, visa, cédula).

**Features:**
- Drag & drop con visual feedback
- File type validation: JPG, PNG, PDF
- File size validation: max 10MB (configurable)
- Multi-file support: hasta 2 archivos
- Thumbnail preview para imágenes
- Progress bar animado durante upload
- Error handling con mensajes en español

**Usage:**
```tsx
import { DocumentUpload } from '@/components/Compliance/DocumentUpload';

function MyComponent() {
  const handleUploadComplete = (result) => {
    console.log('Extracted fields:', result.extractedFields);
    console.log('Confidence:', result.confidence);
  };

  return (
    <DocumentUpload
      onUploadComplete={handleUploadComplete}
      onCancel={() => console.log('Cancelled')}
      maxSizeMB={10}
    />
  );
}
```

**Props:**
- `onUploadComplete`: Callback cuando la extracción de datos completa
- `onCancel?`: Callback opcional para cancelar el upload
- `maxSizeMB?`: Tamaño máximo de archivo en MB (default: 10)

**API Integration:**
Requiere endpoint: `POST /api/sire/extract-document`
- Input: `multipart/form-data` con archivos
- Output: `DocumentExtractionResult` (ver `types.ts`)

### DocumentUploadDemo

Componente de demostración para testing del DocumentUpload.

**Usage:**
```tsx
import { DocumentUploadDemo } from '@/components/Compliance/DocumentUploadDemo';

// En una página de testing
export default function TestPage() {
  return <DocumentUploadDemo />;
}
```

## Types

Ver `types.ts` para definiciones de tipos compartidos:
- `DocumentExtractionResult`: Resultado de extracción OCR
- `SireField`: Definición de campo SIRE
- `SireProgressState`: Estado de progreso SIRE
- `DocumentType`: Tipo de documento (passport, visa, national_id)

## Dependencies

- `react-dropzone` (^14.3.8): Drag & drop functionality
- `lucide-react` (^0.548.0): Iconos UI
- Tailwind CSS: Estilos

## FASE 2 Progress

**Tarea 2.1 - Create document upload component:** ✅ COMPLETADA

**Próximos pasos:**
- Tarea 2.2: Implement Claude Vision OCR integration
- Tarea 2.3: Build field extraction and mapping
- Tarea 2.4: Create document preview modal
