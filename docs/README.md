# 📚 MUVA Chat Documentation

## Quick Navigation

### 🚀 Getting Started
- [Development Guide](./development/README.md) - Setup and development workflow
- [Claude AI Guidelines](./development/CLAUDE.md) - AI assistant configuration
- [Dual Environment Setup](./development/QUICK_START_DUAL_ENV.md) - Staging/Production setup

### 🏗️ Architecture
- [System Overview](./architecture/SYSTEM_OVERVIEW.md) - Complete system architecture
- [Backend Architecture](./architecture/BACKEND_ARCHITECTURE.md) - Backend design patterns
- [Database Architecture](./architecture/DATABASE_ARCHITECTURE.md) - Database schema and patterns

### 🔌 APIs & Integration
- [API Endpoints](./api/API_ENDPOINTS.md) - Complete API documentation

### 🛠️ Operations
- [Deployment Guide](./operations/DEPLOYMENT_GUIDE.md) - Deployment procedures
- [Monitoring Guide](./operations/MONITORING_GUIDE.md) - System monitoring

### 🔍 Troubleshooting
- Coming soon - Problem resolution guides

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
pnpm run build         # Build project

# Deployment
./scripts/deploy/deploy-staging.sh
./scripts/deploy/deploy-vps.sh
```

## Environment Variables

See [Dual Environment Setup](./development/QUICK_START_DUAL_ENV.md) for complete setup.

---

Last Updated: November 15, 2025