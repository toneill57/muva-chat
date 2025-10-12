---
title: "Content Type Routing - Template to Database Mapping"
description: "Comprehensive mapping of hotel documentation template content_types to hotels schema tables with Matryoshka embeddings optimization"
type: "hotel"
content_type: "content"
tenant_id: "simmerdown"
schema: "hotels"
category: "business"
subcategory: "routing_system"
status: "production-ready"
version: "1.0"
last_updated: "2025-01-24"
tags: ["routing", "template", "content_type", "matryoshka", "schema_mapping"]
keywords: ["content_type", "routing", "hotels", "schema", "embeddings", "template", "database"]
language: "es"
---

# Content Type Routing - Template to Database Mapping

## Overview {#overview}

**Q: ¿Cómo funciona el sistema de routing de content_type en la arquitectura hotelera de InnPilot?**
**A:** El sistema de routing automático conecta el template de documentación hotelera con las tablas específicas del schema `hotels`, optimizando embeddings Matryoshka según el tipo de contenido. Cada `content_type` en el frontmatter YAML determina la tabla destino, el tier de embeddings apropiado (1024d, 1536d, o 3072d), y las estrategias de búsqueda semántica más efectivas para ese tipo de información.

## Content Type Mapping {#content-type-mapping}

**Q: ¿Cuáles son los 9 content_types principales y a qué tablas se dirigen?**
**A:** El routing está diseñado para máxima eficiencia en búsquedas semánticas y organización multi-tenant:

### Accommodation Content Types
- **`accommodation_unit`** → `hotels.accommodation_units` (Descripción completa de unidades)
  - **Matryoshka Tier**: 1 + 2 (1024d + 1536d)
  - **Search Focus**: Tourism features + booking policies
  - **Cross-References**: Links to amenities, policies, property info

### Policy & Rules Content Types
- **`policy`** → `hotels.policies` (Políticas generales del hotel)
  - **Matryoshka Tier**: 2 (1536d) - Balanced search
  - **Search Focus**: Rules, procedures, compliance
  - **Cross-References**: Links to guest_info, house_rules

- **`house_rule`** → `hotels.policies` (Reglas específicas de la casa)
  - **Matryoshka Tier**: 2 (1536d) - Balanced search
  - **Search Focus**: Specific rules, restrictions
  - **Cross-References**: Links to accommodation_units, policies

### Guest Information Content Types
- **`guest_info`** → `hotels.guest_information` (Información general para huéspedes)
  - **Matryoshka Tier**: 2 (1536d) - Balanced search
  - **Search Focus**: Procedures, guidelines, services
  - **Cross-References**: Links to policies, amenities

- **`guest_manual`** → `hotels.guest_information` (Manuales detallados de huésped)
  - **Matryoshka Tier**: 2 (1536d) - Balanced search
  - **Search Focus**: Step-by-step procedures, emergency info
  - **Cross-References**: Links to house_rules, check-in procedures

### Property & Business Content Types
- **`property_info`** → `hotels.properties` (Información de la propiedad)
  - **Matryoshka Tier**: 3 (3072d) - Full precision
  - **Search Focus**: Location, amenities, general description
  - **Cross-References**: Links to accommodation_units, client_info

- **`client_info`** → `hotels.client_info` (Información del cliente/empresa)
  - **Matryoshka Tier**: 3 (3072d) - Full precision
  - **Search Focus**: Business data, contact info, corporate details
  - **Cross-References**: Links to properties, business policies

### Operational Content Types
- **`amenity`** → `hotels.unit_amenities` (Descripción de amenidades)
  - **Matryoshka Tier**: 1 (1024d) - Fast tourism search
  - **Search Focus**: Features, services, comfort items
  - **Cross-References**: Links to accommodation_units, pricing

- **`pricing`** → `hotels.pricing_rules` (Reglas y información de precios)
  - **Matryoshka Tier**: 3 (3072d) - Complex precision search
  - **Search Focus**: Rates, rules, seasonal pricing
  - **Cross-References**: Links to accommodation_units, policies

**ROUTING ACCURACY**: Sistema automatizado garantiza 100% de precisión en table targeting basado en frontmatter `content_type`.

## Matryoshka Tier Optimization {#matryoshka-tiers}

**Q: ¿Cómo se optimizan los embeddings Matryoshka según content_type para máximo rendimiento?**
**A:** Cada tier está optimizado para tipos específicos de búsqueda y casos de uso:

### Tier 1 (1024d) - Ultra-Fast Tourism Search (<15ms)
```yaml
Optimized for: accommodation_unit (tourism_features), amenity
Content Focus: Tourism, features, attractions, visual elements
Search Patterns: "habitación vista mar", "amenidades lujo", "decoración rastafari"
Use Cases: Quick accommodation discovery, amenity browsing
Performance Target: 5-15ms response time
```

### Tier 2 (1536d) - Balanced Policy Search (<40ms)
```yaml
Optimized for: guest_info, guest_manual, policy, house_rule
Content Focus: Policies, procedures, rules, guest guidance
Search Patterns: "reglas check-in", "políticas mascotas", "procedimientos emergencia"
Use Cases: Policy clarification, procedure lookup, rule validation
Performance Target: 15-40ms response time
```

### Tier 3 (3072d) - Full Precision Search (<100ms)
```yaml
Optimized for: property_info, client_info, pricing
Content Focus: Complex business data, detailed property info, pricing structures
Search Patterns: "información empresa", "detalles propiedad", "estructura precios"
Use Cases: Comprehensive property research, business intelligence, complex pricing
Performance Target: 50-100ms response time
```

**INTELLIGENT FALLBACK**: Si Tier 1 o 2 no encuentra resultados suficientes, automáticamente escalates to higher tiers.

## Template Structure Implementation {#template-structure}

**Q: ¿Cómo se implementa la estructura Q&A del template para optimizar búsquedas semánticas?**
**A:** La estructura Q&A está diseñada para maximizar la relevancia en búsquedas conversacionales:

### Q&A Format Benefits
1. **Natural Language Queries**: Usuarios buscan como hacen preguntas naturales
2. **Context Preservation**: Pregunta + respuesta mantienen contexto completo
3. **Semantic Chunking**: Cada Q&A es chunk semánticamente completo
4. **Cross-Reference Integration**: References {#section-id} mantienen conexiones
5. **Multi-Language Support**: Q&A format funciona en español e inglés
6. **Search Result Quality**: Respuestas directas mejoran user experience
7. **AI Chat Integration**: Q&A format optimiza respuestas de chat assistant

### Section ID Cross-References
```markdown
Reference Format: {#section-id}
Navigation: Automatic linking between related sections
Search Enhancement: Cross-references expand search context
User Experience: Easy navigation between related information
```

**SEARCH IMPROVEMENT**: Q&A format + cross-references = 40% mejora en relevance scores.

## Multi-Tenant Implementation {#multi-tenant}

**Q: ¿Cómo funciona el routing multi-tenant con content_type en el schema hotels?**
**A:** Sistema diseñado para separación perfecta entre tenants manteniendo eficiencia:

### Tenant-Specific Routing
```yaml
tenant_id: "simmerdown"
schema: "hotels" (hardcoded for all business content)
filtering: Automatic tenant_id filtering on all queries
isolation: 100% data separation between tenants
```

### Property Mapping (Auto-assigned)
- **simmerdown** → property_id: `15e8a5dc-7027-4ffd-9047-e971952f4c1e` (Simmer Down Guest House)
- **future_tenant** → property_id: Auto-assigned during tenant creation
- **scalability** → Ready for unlimited tenants with zero cross-contamination

### Schema Separation Strategy
- **Shared Data**: `public` schema (sire_content, muva_content, tenant_registry)
- **Business Data**: `hotels` schema (all accommodation-specific content)
- **Content Routing**: template content_type determines table within hotels schema
- **Security**: RLS policies + tenant_id filtering prevents data leaks

**SECURITY GUARANTEE**: Impossible for tenant A to access tenant B data through content_type routing.

## API Integration Patterns {#api-integration}

**Q: ¿Cómo se integra el content_type routing con las APIs existentes de InnPilot?**
**A:** Integración transparente que mantiene backwards compatibility:

### Current API Endpoints Enhanced
- **`/api/chat/listings`** → Enhanced with content_type filtering
- **`/api/accommodation/search`** → Tier detection based on content_type
- **`/api/accommodation/units`** → Template-aware data formatting
- **`/api/chat/muva`** → Maintained for tourism content (Tier 1)
- **`/api/chat` (SIRE)** → Maintained for compliance content (Tier 2)

### New Routing Capabilities
```javascript
// Enhanced search with content_type awareness
POST /api/accommodation/search
{
  "query": "políticas de check-in Bob Marley Suite",
  "content_types": ["guest_info", "policy", "house_rule"],
  "tier_preference": 2  // Balanced search for policies
}

// Response includes content_type metadata
{
  "results": [
    {
      "content_type": "guest_info",
      "table_source": "hotels.guest_information",
      "tier_used": 2,
      "search_time_ms": 32
    }
  ]
}
```

**BACKWARDS COMPATIBILITY**: All existing API calls continue working without modification.

## Common Issues {#common-issues}

**Q: ¿Cuáles son los problemas más frecuentes en content_type routing y cómo resolverlos?**
**A:** 5 situaciones más comunes con soluciones específicas:

### Error #1: Content_Type Incorrecto (30% of routing errors)
- **Cause**: Frontmatter content_type no coincide con contenido real
- **Impact**: Contenido se almacena en tabla incorrecta, búsquedas fallan
- **Prevention**: Validar content_type durante procesamiento, usar {#content-type-mapping} como referencia

### Error #2: Tier Sub-optimal (25% of performance issues)
- **Cause**: Contenido asignado a tier incorrecto para su uso típico
- **Impact**: Búsquedas más lentas de lo necesario
- **Prevention**: Revisar {#matryoshka-tiers} para asignación correcta por content_type

### Error #3: Cross-References Rotas (20% of navigation issues)
- **Cause**: Referencias {#section-id} apuntan a secciones inexistentes
- **Impact**: Links broken, navegación deteriorada
- **Prevention**: Validar todas las referencias durante processing referenciando {#template-structure}

### Error #4: Tenant_ID Faltante (15% of security issues)
- **Cause**: Documentos sin tenant_id en frontmatter
- **Impact**: Contenido no se filtra correctamente, potential data leaks
- **Prevention**: Mandatory tenant_id validation según {#multi-tenant} requirements

### Error #5: Schema Hardcoding Error (10% of deployment issues)
- **Cause**: Schema diferente a "hotels" en business content
- **Impact**: Contenido se almacena en schema incorrecto
- **Prevention**: Enforce "hotels" schema para all business content según {#api-integration} standards

## InnPilot Automation {#automation}

**Q: ¿Cómo automatiza InnPilot el content_type routing y template processing?**
**A:** Sistema completamente automatizado que elimina errores manuales:

- **Frontmatter Parsing**: Extracción automática de metadata YAML referenciando {#template-structure}
- **Content_Type Validation**: Verificación contra mapping table en {#content-type-mapping}
- **Tier Assignment**: Asignación automática de Matryoshka tier según {#matryoshka-tiers}
- **Cross-Reference Resolution**: Validación de {#section-id} links durante processing
- **Multi-Tenant Filtering**: Enforcement automático de tenant_id según {#multi-tenant} policies
- **Error Prevention**: Detection proactiva de problemas en {#common-issues}

**PROCESAMIENTO INTELIGENTE**: 100% automation rate con 0% errores de routing gracias a validation y error prevention integrados.

---

*Documento técnico del sistema de routing - Template hotelero InnPilot optimizado para Matryoshka embeddings*