import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.dirname(__dirname)

/**
 * Convert MUVA JSON listing to structured MD with YAML frontmatter
 * Usage: node scripts/convert-json-to-muva-md.js <json-file-path>
 */

function generateMarkdownFromJSON(jsonData, originalFilename) {
  const id = jsonData.id || originalFilename.replace(/\.json$/, '')
  const nombre = jsonData.nombre || 'NOMBRE DEL NEGOCIO'
  const categoria = jsonData.categoria || 'Actividad'
  const descripcion = jsonData.descripcion || 'Descripción no disponible'

  // Determine subcategory based on categoria and description
  let subcategory = 'general'
  if (categoria === 'Actividad') {
    if (descripcion.toLowerCase().includes('buceo') || descripcion.toLowerCase().includes('dive')) {
      subcategory = 'deportes_acuaticos'
    } else if (descripcion.toLowerCase().includes('parasail') || descripcion.toLowerCase().includes('parachute')) {
      subcategory = 'deportes_aereos'
    } else if (descripcion.toLowerCase().includes('surf') || descripcion.toLowerCase().includes('paddle')) {
      subcategory = 'deportes_acuaticos'
    } else {
      subcategory = 'deportes_acuaticos'
    }
  } else if (categoria === 'Restaurante') {
    if (descripcion.toLowerCase().includes('saludable') || descripcion.toLowerCase().includes('smoothie') || descripcion.toLowerCase().includes('bowl')) {
      subcategory = 'gastronomia_saludable'
    } else if (descripcion.toLowerCase().includes('local') || descripcion.toLowerCase().includes('típico')) {
      subcategory = 'gastronomia_local'
    } else {
      subcategory = 'gastronomia_internacional'
    }
  }

  // Generate tags from keywords and other fields
  const tags = []
  if (jsonData.palabras_clave) {
    tags.push(...jsonData.palabras_clave.filter(k => k && k.length > 2 && !k.includes('000')))
  }
  if (categoria === 'Actividad') tags.push('actividades', 'turismo')
  if (categoria === 'Restaurante') tags.push('restaurantes', 'gastronomia')

  const keywords = [...new Set([
    id,
    nombre.toLowerCase(),
    categoria.toLowerCase(),
    ...(jsonData.zona ? [jsonData.zona.toLowerCase()] : []),
    ...tags.slice(0, 5)
  ])].slice(0, 10)

  // Build YAML frontmatter
  const yaml = `---
version: "1.0"
type: tourism
destination:
  schema: public
  table: muva_content
document:
  title: "${nombre}"
  description: "${descripcion.replace(/"/g, '\\"')}"
  category: ${categoria === 'Actividad' ? 'activities' : categoria === 'Restaurante' ? 'restaurants' : 'hotels'}
  subcategory: ${subcategory}
  language: es
  version: "1.0"
  status: active
  tags: [${tags.slice(0, 8).map(t => `${t}`).join(', ')}]
  keywords: [${keywords.map(k => `${k}`).join(', ')}]
business:
  id: ${id}
  nombre: ${nombre}
  categoria: ${categoria}
  horario: "${jsonData.horario || 'Consultar disponibilidad'}"
  precio: "${jsonData.precio || 'Consultar precios'}"${jsonData.contacto ? `
  contacto: "${jsonData.contacto.replace('Whatsapp:', '').replace('Correo:', '').trim()}"` : ''}${jsonData.periodicidad_menu ? `
  telefono: "${jsonData.periodicidad_menu.replace('Whatsapp:', '').replace('Correo:', '').trim()}"` : ''}${jsonData.zona ? `
  zona: "${jsonData.zona}"` : ''}${jsonData.subzona ? `
  subzona: "${jsonData.subzona}"` : ''}${jsonData.proximidad_aeropuerto ? `
  proximidad_aeropuerto: "${jsonData.proximidad_aeropuerto}"` : ''}${jsonData.zona_tipo ? `
  zona_tipo: "${jsonData.zona_tipo}"` : ''}${jsonData.caracteristicas_zona ? `
  caracteristicas_zona: [${jsonData.caracteristicas_zona.map(c => `"${c}"`).join(', ')}]` : ''}${jsonData.landmarks_cercanos ? `
  landmarks_cercanos: [${jsonData.landmarks_cercanos.map(l => `"${l}"`).join(', ')}]` : ''}${jsonData.tipos_negocio_zona ? `
  tipos_negocio_zona: [${jsonData.tipos_negocio_zona.map(t => `"${t}"`).join(', ')}]` : ''}
---`

  // Build markdown content
  let markdown = `\n# ${nombre}\n\n`
  markdown += `## Descripción General\n\n${descripcion}\n\n`

  if (jsonData.historia) {
    markdown += `### Historia\n\n${jsonData.historia}\n\n`
  }

  if (jsonData.personaje) {
    markdown += `### Personaje Clave\n\n${jsonData.personaje}\n\n`
  }

  // Services section
  markdown += `## Servicios Ofrecidos\n\n`
  if (categoria === 'Actividad') {
    markdown += `### 🎯 Servicio Principal\n`
    markdown += `- **Descripción**: ${descripcion.substring(0, 200)}...\n`
    markdown += `- **Precio**: ${jsonData.precio || 'Consultar'}\n`
    markdown += `- **Horario**: ${jsonData.horario || 'Según disponibilidad'}\n\n`
  } else if (categoria === 'Restaurante') {
    markdown += `### 🍽️ Especialidad\n`
    markdown += `- **Cocina**: ${descripcion.includes('saludable') ? 'Saludable' : 'Variada'}\n`
    markdown += `- **Precio promedio**: ${jsonData.precio || 'Consultar'}\n`
    markdown += `- **Horario**: ${jsonData.horario || 'Consultar'}\n\n`
  }

  // Contact info
  markdown += `## Información de Contacto\n\n`
  if (jsonData.contacto) {
    const contacto = jsonData.contacto.replace('Whatsapp:', '').replace('Correo:', '').trim()
    markdown += `- **Contacto**: ${contacto}\n`
  }
  if (jsonData.periodicidad_menu) {
    const tel = jsonData.periodicidad_menu.replace('Whatsapp:', '').replace('Correo:', '').trim()
    markdown += `- **Teléfono/WhatsApp**: ${tel}\n`
  }
  markdown += `- **Modalidad**: Atención bajo reserva\n\n`

  // Location
  if (jsonData.zona) {
    markdown += `## Ubicación y Zona\n\n`
    markdown += `### Características de la Zona (${jsonData.zona})\n`
    if (jsonData.caracteristicas_zona) {
      jsonData.caracteristicas_zona.forEach(c => {
        markdown += `- ${c}\n`
      })
    }
    markdown += `\n`
    if (jsonData.landmarks_cercanos && jsonData.landmarks_cercanos.length > 0) {
      markdown += `### Landmarks Cercanos\n`
      jsonData.landmarks_cercanos.forEach(l => {
        markdown += `- ${l}\n`
      })
      markdown += `\n`
    }
  }

  // Interesting data
  if (jsonData.datos_color) {
    markdown += `## Datos de Interés\n\n${jsonData.datos_color}\n\n`
  }

  // Recommendations
  if (jsonData.recomendaciones) {
    markdown += `## Recomendaciones\n\n${jsonData.recomendaciones}\n\n`
  }

  return yaml + markdown
}

// Main execution
const args = process.argv.slice(2)
if (args.length === 0) {
  console.log('❌ Usage: node scripts/convert-json-to-muva-md.js <json-file-path>')
  console.log('📝 Example: node scripts/convert-json-to-muva-md.js _assets/muva/listings-enriched/bali-smoothies.json')
  process.exit(1)
}

const jsonPath = path.resolve(projectRoot, args[0])
if (!fs.existsSync(jsonPath)) {
  console.error(`❌ File not found: ${jsonPath}`)
  process.exit(1)
}

console.log(`📄 Reading JSON: ${jsonPath}`)
const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))

const markdown = generateMarkdownFromJSON(jsonData, path.basename(jsonPath))

// Determine category folder based on categoria field
const categoria = jsonData.categoria || 'Actividad'
let categoryFolder = 'actividades'
if (categoria === 'Restaurante') categoryFolder = 'restaurantes'
else if (categoria === 'Spot') categoryFolder = 'spots'
else if (categoria === 'Alquiler') categoryFolder = 'alquileres'
else if (categoria === 'Nightlife') categoryFolder = 'nightlife'

// Write to listings-by-category folder
const filename = path.basename(jsonPath).replace(/\.json$/, '.md')
const mdPath = path.join(projectRoot, '_assets', 'muva', 'listings-by-category', categoryFolder, filename)

// Ensure directory exists
const categoryDir = path.dirname(mdPath)
if (!fs.existsSync(categoryDir)) {
  fs.mkdirSync(categoryDir, { recursive: true })
}

fs.writeFileSync(mdPath, markdown, 'utf-8')

console.log(`✅ Markdown created: ${mdPath}`)
console.log(`\n📊 Summary:`)
console.log(`   Nombre: ${jsonData.nombre || 'N/A'}`)
console.log(`   Categoría: ${jsonData.categoria || 'N/A'}`)
console.log(`   Zona: ${jsonData.zona || 'N/A'}`)
console.log(`   Precio: ${jsonData.precio || 'N/A'}`)
console.log(`\n🚀 Next step: node scripts/populate-embeddings.js ${mdPath}`)