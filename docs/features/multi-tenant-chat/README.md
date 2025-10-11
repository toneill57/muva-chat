# Multi-Tenant Chat System

**Core feature de MUVA Chat platform**

## Overview

Sistema de chat multi-tenant con subdomain routing, tenant isolation, y branding personalizado por cliente.

## Architecture

Cada tenant obtiene:
- **Subdomain único:** `{tenant}.muva.chat`
- **Knowledge base aislada:** Embeddings solo de su negocio
- **Branding personalizado:** Logo, colores, contenido
- **Admin dashboard:** Gestión completa

## Key Features

### 1. Subdomain Routing
- Wildcard DNS: `*.muva.chat`
- Next.js rewrites para tenant detection
- Middleware header injection

**Docs:** [SUBDOMAIN_ROUTING.md](SUBDOMAIN_ROUTING.md)

### 2. Tenant Isolation
- Row-Level Security (RLS) en Supabase
- Embeddings filtrados por tenant_id
- Zero cross-tenant data leaks

**Docs:** [TENANT_ISOLATION.md](TENANT_ISOLATION.md)

### 3. Admin Dashboard
- Branding editor (logo, colors)
- Knowledge base manager
- Analytics dashboard
- Content management

**Docs:** [ADMIN_DASHBOARD.md](ADMIN_DASHBOARD.md)

## Technical Stack

- **Frontend:** Next.js 15.5.3
- **Database:** Supabase PostgreSQL + RLS
- **Embeddings:** OpenAI text-embedding-3-large + Matryoshka
- **Chat AI:** Anthropic Claude
- **Routing:** Nginx + Next.js rewrites

## Getting Started

### For Developers
See main [development guide](../../development/DEVELOPMENT.md)

### For New Tenants
See [onboarding guide](../../tenant-subdomain-chat/NEW_TENANT_GUIDE.md)

## Cross-References

**Related docs:**
- [Tenant Subdomain Chat Plan](../../tenant-subdomain-chat/plan.md)
- [Route Groups Architecture](../../tenant-subdomain-chat/ROUTE_GROUPS_ARCHITECTURE.md)
- [New Tenant Guide](../../tenant-subdomain-chat/NEW_TENANT_GUIDE.md)
- [Deployment Guide](../../tenant-subdomain-chat/DEPLOYMENT.md)

---

**Feature Status:** ✅ Production-ready
**Tenants Active:** 4 (simmerdown, xyz, free-hotel-test, hotel-boutique)
