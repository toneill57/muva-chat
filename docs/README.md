# 📚 MUVA Chat Documentation

## Quick Navigation

### 🚀 Getting Started
- [Development Guide](./development/README.md) - Setup and development workflow
- [Claude AI Guidelines](./development/CLAUDE.md) - AI assistant configuration
- [Dual Environment Setup](./development/QUICK_START_DUAL_ENV.md) - Staging/Production setup

### 🏗️ Architecture
- [Multi-Tenant Architecture](./backend/MULTI_TENANT_ARCHITECTURE.md) - Multi-tenant system design
- [Matryoshka Architecture](./backend/MATRYOSHKA_ARCHITECTURE.md) - Embeddings and vector search system
- [Premium Chat Architecture](./backend/PREMIUM_CHAT_ARCHITECTURE.md) - Premium features architecture
- [Database Schema Guide](./backend/DATABASE_SCHEMA_MIGRATION_GUIDE.md) - Database schema and patterns

### 🔌 APIs & Integration
- [API Quick Reference](./api-quick-reference.md) - Quick API endpoint reference
- [Complete API Inventory](./api-inventory-complete.md) - Comprehensive API documentation
- [MotoPress Integration](./integrations/MOTOPRESS_HOTEL_BOOKING_API_ANALYSIS.md) - Hotel booking integration

### 🛠️ Infrastructure & Deployment
- [Three Environments Architecture](./infrastructure/three-environments/README.md) - Dev/Staging/Production setup
- [Deployment Playbook](./infrastructure/three-environments/DEPLOYMENT_PLAYBOOK.md) - Deployment procedures
- [Monitoring Guide](./infrastructure/three-environments/MONITORING_GUIDE.md) - System monitoring
- [Quick Reference](./infrastructure/three-environments/QUICK_REFERENCE.md) - One-page reference guide
- [MCP Usage Policy](./infrastructure/MCP_USAGE_POLICY.md) - MCP tools best practices

### 🎯 Core Features
- [Tenant Subdomain Chat](./tenant-subdomain-chat/) - Multi-tenant chat implementation (28 docs)
- [SIRE Compliance](./features/sire-compliance/) - Colombian tourism regulatory compliance (23 docs)
- [Guest Authentication](./backend/GUEST_AUTH_SYSTEM.md) - Guest portal authentication
- [Accommodation Units](./accommodation-units-redesign/) - Accommodation management

### 📊 Database
- [Schema Migration History](./backend/SCHEMA_MIGRATION_HISTORY.md) - Migration tracking
- [Schema Routing Guidelines](./backend/SCHEMA_ROUTING_GUIDELINES.md) - Database routing patterns
- [Database Maintenance](./backend/DATABASE_MAINTENANCE_OPERATIONS.md) - Maintenance operations
- [Database Agent Instructions](./backend/DATABASE_AGENT_INSTRUCTIONS.md) - Agent instructions

### 🔒 Security
- [Multi-Tenant Security](./backend/MULTI_TENANT_SECURITY_GUIDE.md) - Security best practices
- [MotoPress Security](./security/MOTOPRESS_SECURITY_IMPLEMENTATION.md) - Integration security
- [Health Checks](./security/health-checks/) - System health monitoring (6 docs)

### 📝 Content & Documentation
- [MUVA Listings Guide](./content/MUVA_LISTINGS_GUIDE.md) - Content management
- [Template Guide](./content/MUVA_TEMPLATE_GUIDE.md) - Documentation templates
- [Cross Reference System](./content/CROSS_REFERENCE_SYSTEM.md) - Reference management
- [Data Extraction System](./content/DATA_EXTRACTION_SYSTEM.md) - Data extraction patterns

### 🔧 Development Phases
- [Chat Core Stabilization](./chat-core-stabilization/) - Stabilization phases (12+ docs)
- [Phase Summaries](./fase-summaries/) - Completion summaries (12 docs)
- [Guest Chat Debug](./guest-chat-debug/) - Debugging and prevention (5 docs)

### 📦 Archive
- [Archive README](./archive/README.md) - Historical documentation policy
- Historical references maintained for audit purposes

## Project Structure

```
muva-chat/
├── src/               # Source code
├── scripts/           # Organized operational scripts
│   ├── deploy/       # Deployment scripts
│   ├── monitoring/   # Health checks and monitoring
│   ├── database/     # Database operations
│   ├── migrations/   # Active migrations
│   └── utils/        # Utilities
├── docs/             # Active documentation (you are here)
│   ├── backend/      # Backend architecture (21 docs)
│   ├── infrastructure/
│   │   └── three-environments/ # Deployment architecture (36 docs)
│   ├── features/     # Feature documentation
│   │   └── sire-compliance/ # SIRE regulatory (23 docs)
│   ├── tenant-subdomain-chat/ # Multi-tenant chat (28 docs)
│   ├── content/      # Content management (6 docs)
│   ├── integrations/ # External integrations (3 docs)
│   ├── database/     # Database documentation (7 docs)
│   ├── security/     # Security documentation (6 docs)
│   └── archive/      # Historical documentation
├── archive/          # Historical documentation and scripts
└── snapshots/        # Agent-generated documentation
```

## Key Commands

```bash
# Development
pnpm run dev:staging    # Port 3001 (staging)
pnpm run dev:production # Port 3000 (production - careful!)

# Validation
pnpm run validate:rpc   # Validate RPC functions
pnpm run validate:rpc:fix # Auto-fix RPC functions
pnpm run build         # Build project
pnpm run type-check    # TypeScript validation

# Deployment
./scripts/deploy-staging.sh    # Deploy to staging
./scripts/deploy-dev.sh        # Deploy to development
./scripts/pre-deploy-check.sh staging # Full validation

# Database
pnpm dlx tsx scripts/monitoring-dashboard.ts # Health monitoring
```

## Environment Variables

See [Dual Environment Setup](./development/QUICK_START_DUAL_ENV.md) for complete setup.

## Documentation Statistics

- **Total**: 452 markdown files in 46 directories
- **Recently Updated**: November 15, 2025 (reorganization completed)
- **Key Areas**:
  - Backend Architecture: 21 docs
  - Infrastructure: 36+ docs
  - Features: 50+ docs
  - Multi-tenant: 28 docs

## Quick Links

- 🚨 [CLAUDE.md](/CLAUDE.md) - Critical project rules
- 📊 [Snapshots](/snapshots/general-snapshot.md) - Current project state
- 🔍 [Troubleshooting Guide](./TROUBLESHOOTING.md) - Problem resolution
- 📋 [TODO Security](./TODO_SECURITY.md) - Security tasks

---

Last Updated: November 15, 2025
Post-reorganization cleanup completed