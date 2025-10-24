# Architecture Diagrams

## Guest Chat Flow

**File**: `guest-chat-flow.mmd`

### How to View

**Option 1: GitHub** (automatic rendering)
- Open file in GitHub web interface
- GitHub automatically renders Mermaid diagrams

**Option 2: Mermaid Live Editor**
```bash
cat guest-chat-flow.mmd | pbcopy
# Open https://mermaid.live/
# Paste content
```

**Option 3: VS Code**
- Install "Markdown Preview Mermaid Support" extension
- Open `guest-chat-flow.mmd`
- Click "Open Preview"

### Key Components

1. **Authentication** (A→H): JWT-based guest session
2. **Query Processing** (J→L): Embedding generation + strategy
3. **Vector Search** (M→U): Parallel RPC calls with domain weights
4. **Response Generation** (V→X): Claude Sonnet 4 streaming

### Critical Paths

- **WiFi Query**: J → K → N → R → U → W (highlights unit manual search)
- **Tourism Query**: J → K → O → T → U → W (highlights MUVA content)

### Related Documents

- **Implementation**: `src/lib/conversational-chat-engine.ts`
- **Strategy**: `src/lib/chat-engine/search-strategy.ts`
- **Parallel Search**: `src/lib/chat-engine/parallel-search.ts`
