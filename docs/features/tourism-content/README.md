# Tourism Content Feature

Documentation for the San Andrés tourism content and knowledge base system.

## Overview

Tourism Content is a specialized feature that provides rich, AI-powered responses about San Andrés island tourism, attractions, and local information.

## Key Components

- **Knowledge Base**: Embeddings-based tourism content retrieval
- **Matryoshka Embeddings**: 3-tier embedding system (1024d, 1536d, 3072d)
- **Vector Search**: pgvector-powered semantic search
- **Content Curation**: Tourism guides, attractions, and local information

## Documents to Migrate

The following documents will be migrated to this feature folder:

- Tourism content documentation (if exists)
- Knowledge base architecture docs
- Embeddings generation guides
- Content curation guidelines

## Related Code

- `/src/lib/embeddings/` - Embeddings utilities
- `/src/app/api/guest/chat/route.ts` - Chat endpoint with RAG
- `/scripts/generate-embeddings.ts` - Embeddings generation
- `/scripts/semantic-search-pgvector.ts` - Search testing

## Status

✅ **Production Ready** - Active in guest chat
