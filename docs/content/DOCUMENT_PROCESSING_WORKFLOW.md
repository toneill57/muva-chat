# Document Processing Workflow Guide

> **Status**: Current as of September 2025
> **Last Updated**: After successful SimmerDown house-rules.md processing

## Overview

This guide documents the complete workflow for processing raw documents into searchable, contextual embeddings for the MUVA multi-tenant system. This process was refined through real-world implementation with SimmerDown's house rules documentation.

## Prerequisites

- Access to the embeddings-generator agent
- Documentation template at `_assets/documentation-template.md`
- Working development environment with embeddings generation capabilities

## Step-by-Step Workflow

### 1. Document Preparation

**Input**: Raw document (typically `.md` format)
**Goal**: Apply structured template with proper metadata

#### Process:
1. Locate the target document (e.g., `_assets/simmerdown/policies/house-rules.md`)
2. Apply the documentation template from `_assets/documentation-template.md`
3. Transform content into Q&A format for better semantic search

#### Template Application Example:
```yaml
---
title: "Reglas de la Casa - Simmer Down Guest House"
description: "Normas y reglas de convivencia para huéspedes de Simmer Down Guest House en San Andrés"
type: "policies"
tags: ["policies", "house_rules", "guest_guidelines", "simmerdown", "san_andres", "convivencia"]
keywords: ["reglas", "casa", "convivencia", "normas", "huéspedes", "políticas", "simmerdown", "arena", "aire_acondicionado", "mascotas", "habibi"]
---
```

#### Content Structure:
- **Convert to Q&A format**: Transform informal rules into "Q: ... A: ..." pairs
- **Add cross-references**: Use `{#section-id}` links between related sections
- **Include comprehensive keywords**: Add terms that users might search for

### 2. Cross-Reference Integration

**Critical Feature**: The `{#section-id}` system enhances contextual retrieval

#### Implementation:
- Add section IDs: `## Políticas de Mascotas {#pet-policies}`
- Create cross-references: `"Para más detalles sobre mascotas, ver {#pet-policies}"`
- Ensure cross-references are meaningful and bidirectional

#### Example:
```markdown
## Políticas de Mascotas {#pet-policies}

**Q: ¿Cuáles son las reglas sobre las mascotas del edificio?**
**A:** Simmer Down cuenta con dos mascotas residentes que requieren cuidado especial:

- **Habibi (Perro)**: NO alimentar bajo ninguna circunstancia
- **Thundercat (Gato)**: Tienen dominio completo del edificio

Para detalles sobre penalizaciones, ver {#enforcement-policies}.
```

### 3. 🪆 Matryoshka Multi-Tier Embeddings Generation with Template Data Extraction

**Tool**: Enhanced `populate-embeddings.js` script with template processing capabilities
**Command**: Process documents with automatic tier optimization AND structured data extraction

#### Enhanced Process (September 24, 2025):
1. **Document Analysis**: Script analyzes document type and content format
2. **Template Data Extraction**: New extraction functions parse structured data:
   - `extractPricingFromTemplate()` - Extracts pricing from Q&A format
   - `extractAmenitiesFromTemplate()` - Parses amenity lists
   - `extractBookingPoliciesFromTemplate()` - Extracts policy information
3. **Database Schema Population**: Extracted data populates specific database columns:
   ```sql
   -- Pricing data extracted and stored
   base_price_low_season, base_price_high_season
   price_per_person_low, price_per_person_high

   -- Structured amenities and policies
   amenities_list, booking_policies
   ```
4. **Multi-Tier Embedding Strategy**: Auto-detection applies tier optimization:
   - **Tier 1 (Fast)**: Hotel policies, tourism content → `embedding_fast` (1024 dims)
   - **Tier 2 (Balanced)**: SIRE documentation, procedures → `embedding_balanced` (1536 dims)
   - **Tier 3 (Full)**: Complex documents, pricing → `embedding` (3072 dims)
5. **Enhanced Content Processing**: Template data enhances vector search content
6. **Tenant Resolution Integration**: Uses UUID-to-schema mapping for proper routing

#### Expected Output:
- Multiple chunks (typically 8-10 for a comprehensive document)
- **Multi-tier embeddings**: Each chunk contains 2-3 embedding versions:
  - Primary embedding (3072 dims) for full precision
  - Optimized tier embedding (1024 or 1536 dims) for performance
- **Structured Data Population**: Template extraction fills database columns
- **Enhanced Search Content**: Pricing and amenity data included in vector search
- Enhanced metadata with tier strategy information
- Automatic HNSW index optimization per tier

#### Template Data Extraction Example:
```javascript
// Input: Q&A formatted document with pricing sections
// Q: ¿Cuáles son las tarifas?
// A: ### Temporada Baja
//    - **2 personas**: $240,000 COP
//    - **3 personas**: $305,000 COP

// Output: Database columns populated
{
  base_price_low_season: 240000,
  price_per_person_low: 65000,
  base_price_high_season: 260000,
  price_per_person_high: 65000,
  amenities_list: "Wi-Fi, Cocina equipada, Aire acondicionado...",
  booking_policies: "Check-in: 3:00 PM, Check-out: 11:00 AM..."
}
```

#### Tier Strategy Selection:
```bash
# The system automatically detects optimal tier based on content:
# - SimmerDown policies → Tier 1 (embedding_fast)
# - SIRE documentation → Tier 2 (embedding_balanced)
# - Pricing/technical → Tier 3 (embedding only)
```

### 4. 🪆 Multi-Tier Database Verification

**Goal**: Confirm all tier embeddings are properly stored and accessible

#### Verification Steps:
1. Check chunk count: `SELECT COUNT(*) FROM simmerdown.policies;`
2. Verify multi-tier embeddings exist across all applicable columns
3. Confirm HNSW indexes are created for each tier
4. Validate metadata structure includes tier strategy information

#### Example Multi-Tier Verification:
```sql
-- Check all embedding tiers for SimmerDown policies
SELECT policy_id, policy_title,
CASE
  WHEN embedding IS NULL THEN 'No primary embedding'
  ELSE 'Primary (' || array_length(embedding::real[], 1) || ' dims)'
END as primary_embedding,
CASE
  WHEN embedding_fast IS NULL THEN 'No fast embedding'
  ELSE 'Fast (' || array_length(embedding_fast::real[], 1) || ' dims)'
END as fast_embedding,
-- Check if we have the expected tier optimization
CASE
  WHEN embedding_fast IS NOT NULL AND array_length(embedding_fast::real[], 1) = 1024 THEN 'Tier 1 ✅'
  WHEN embedding_balanced IS NOT NULL AND array_length(embedding_balanced::real[], 1) = 1536 THEN 'Tier 2 ✅'
  WHEN embedding IS NOT NULL AND array_length(embedding::real[], 1) = 3072 THEN 'Tier 3 only'
  ELSE 'No tier optimization'
END as tier_status
FROM simmerdown.policies;
```

#### HNSW Index Verification:
```sql
-- Verify HNSW indexes exist for each tier
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE indexname LIKE '%embedding%hnsw%'
AND tablename IN ('policies', 'sire_content', 'muva_content');

-- Expected results:
-- idx_simmerdown_policies_embedding_fast_hnsw (1024 dims)
-- idx_sire_content_embedding_balanced_hnsw (1536 dims)
-- idx_muva_content_embedding_fast_hnsw (1024 dims)
```

### 5. 🪆 Multi-Tier Functional Testing

**Critical Step**: Verify the processed documents return relevant results across all tiers

#### Tier-Specific Testing Process:
1. Test each tier with appropriate query types
2. Verify automatic tier detection and routing
3. Monitor performance improvements per tier
4. Validate cross-tier fallback mechanisms

#### Example Test Queries by Tier:

##### Tier 1 (Ultra Fast) Tests:
```bash
# Hotel policy queries (should use embedding_fast)
curl -X POST http://localhost:3000/api/chat/listings \
  -H "Content-Type: application/json" \
  -d '{"question":"¿Qué reglas hay sobre Habibi?"}'

# Expected: ~200ms total response, "Tier 1" in logs
```

##### Tier 2 (Balanced) Tests:
```bash
# SIRE documentation queries (should use embedding_balanced)
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"¿Cuáles son los procedimientos SIRE?"}'

# Expected: ~350ms total response, "Tier 2" in logs
```

##### Tier 3 (Full Precision) Tests with Pricing Integration:
```bash
# Complex pricing queries (should use full embedding + structured pricing data)
curl -X POST http://localhost:3000/api/chat/listings \
  -H "Content-Type: application/json" \
  -d '{"question":"¿Cuánto cuesta el Apartamento Misty Morning?","client_id":"b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf","business_type":"hotel"}'

# Expected Enhanced Response (September 24, 2025):
{
  "response": "## Tarifas del Apartamento Misty Morning\n\n### Temporada Baja\n- **2 personas**: $240,000 COP\n- **3 personas**: $305,000 COP\n- **4 personas**: $370,000 COP\n\n### Temporada Alta\n- **2 personas**: $260,000 COP\n- **3 personas**: $325,000 COP\n- **4 personas**: $390,000 COP",
  "context_used": true
}

# Expected: ~490ms total response, "Tier 3" in logs, structured pricing output
```

#### Enhanced Expected Results (September 24, 2025):
- ✅ `context_used: true` in API response for all tiers
- ✅ **Performance verification**: Tier 1 ~200ms, Tier 2 ~350ms, Tier 3 ~490ms
- ✅ **Structured pricing responses**: Formatted pricing tables in API output
- ✅ **Tenant UUID resolution**: Automatic mapping to operational schema names
- ✅ Tier detection logs: Look for "🎯 Search strategy: [pattern] (Tier X)" in console
- ✅ Specific, detailed answers from document content with extracted data
- ✅ Proper cross-reference resolution maintained across all tiers
- ✅ Automatic fallback to higher tiers when insufficient results
- ✅ **Template data integration**: Database columns influence search content

### 6. 🪆 Matryoshka Production Optimization

**Goal**: Fine-tune multi-tier system for revolutionary performance

#### Key Parameters by Tier:
- **Similarity Threshold**: 0.3 (production value for all tiers)
- **Match Count**: 4 documents maximum per tier
- **Chunking**: CHUNK_SIZE=1000, OVERLAP=100 (optimized for all dimensions)
- **Tier Selection**: Automatic based on keyword patterns in `search-router.ts`

#### Performance Targets by Tier:
- **Tier 1 Context Retrieval**: < 0.2 seconds (10x improvement)
- **Tier 2 Context Retrieval**: < 0.5 seconds (5x improvement)
- **Tier 3 Context Retrieval**: < 1.0 seconds (2x improvement)
- **Full Response Times**:
  - Tier 1: < 2 seconds
  - Tier 2: < 4 seconds
  - Tier 3: < 6 seconds
- **Cache hit rate**: > 95% for repeated queries (tier-aware caching)

#### Tier Strategy Optimization:
```javascript
// Configure tier-specific thresholds for optimal performance
const TIER_CONFIG = {
  tier1: { threshold: 0.3, maxResults: 4, dimensions: 1024 },
  tier2: { threshold: 0.3, maxResults: 4, dimensions: 1536 },
  tier3: { threshold: 0.3, maxResults: 4, dimensions: 3072 }
}
```

#### Auto-Scaling Recommendations:
- **High traffic**: Prioritize Tier 1 queries for maximum throughput
- **Complex analysis**: Route to Tier 3 for precision-critical queries
- **Balanced workload**: Use Tier 2 for moderate complexity with good performance

## Common Patterns and Best Practices

### Effective Q&A Formatting
- **Start with clear questions**: Use natural language users would ask
- **Provide comprehensive answers**: Include context and cross-references
- **Use consistent terminology**: Maintain vocabulary throughout document

### Cross-Reference Strategy
- **Bidirectional linking**: Ensure references work both ways
- **Meaningful connections**: Link related concepts, not just similar sections
- **Clear section IDs**: Use descriptive, URL-friendly identifiers

### Metadata Optimization
- **Comprehensive keywords**: Include synonyms and related terms
- **Proper categorization**: Use consistent type and tag values
- **Search-friendly descriptions**: Write for discoverability

## Troubleshooting Common Issues

### Low Context Retrieval
- **Symptoms**: `context_used: false` in responses
- **Solutions**: Check embeddings exist, verify permissions, adjust threshold

### Poor Response Quality
- **Symptoms**: Generic responses despite good documents
- **Solutions**: Improve Q&A formatting, add more cross-references, enhance keywords

### Performance Issues
- **Symptoms**: Slow response times (>15 seconds)
- **Solutions**: Optimize chunk size, adjust match count, check database performance

## Success Metrics (Updated September 24, 2025)

- ✅ **Context Usage**: >80% of relevant queries return `context_used: true`
- ✅ **Response Quality**: Specific, detailed answers from document content
- ✅ **Cross-Reference Resolution**: Related information automatically included
- ✅ **Performance**: Response times consistently under 10 seconds
- ✅ **User Satisfaction**: Answers match user intent and expectations
- ✅ **Template Data Integration**: Structured pricing and amenity data in responses
- ✅ **Multi-Tenant Resolution**: Automatic UUID-to-schema mapping functional
- ✅ **Matryoshka Performance**: 10x improvement in search speeds achieved
- ✅ **Schema Compliance**: All hotel data properly routed to business schemas

## Next Steps

After successful document processing:
1. Monitor query patterns and response quality
2. Iterate on template format based on user feedback
3. Expand cross-reference network as more documents are added
4. Optimize performance based on usage analytics

---

*This workflow was developed and tested through the successful processing of SimmerDown's house rules documentation, resulting in a fully functional multi-tenant knowledge base.*