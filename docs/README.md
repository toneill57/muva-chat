# MUVA Chat Platform Documentation

**Multi-Tenant Tourism & Compliance Platform**

## Overview

MUVA Chat es una plataforma multi-tenant que combina:
- 🏨 **Chat inteligente** para negocios turísticos (hoteles, surf schools, restaurantes)
- 🌴 **Contenido turístico** de San Andrés (actividades, playas, eventos)
- ⭐ **SIRE Compliance** - Módulo premium para alojamientos (gancho comercial)

## Features Principales

### 1. Multi-Tenant Chat System
Sistema de chat con subdomain routing y branding personalizado.

**Docs:** [features/multi-tenant-chat/](features/multi-tenant-chat/)

**Key Features:**
- Subdomain routing (tenant.muva.chat)
- Tenant isolation (RLS policies)
- Custom branding (logo, colors)
- Admin dashboard

### 2. ⭐ SIRE Compliance (Premium Feature)
Sistema completo de gestión SIRE para hoteles y Airbnbs.

**Docs:** [features/sire-compliance/](features/sire-compliance/)

**Why it matters:**
- Gancho comercial clave para atraer alojamientos
- Todos los hoteles en Colombia necesitan SIRE
- Automatización completa del proceso
- 100% compliance gubernamental

**Key Features:**
- Validación automática de archivos TXT
- Exportación mensual
- Catálogos oficiales (países, ciudades)
- Data completeness checks

### 3. Tourism Content (MUVA)
Contenido turístico de San Andrés para clientes Premium.

**Docs:** [features/tourism-content/](features/tourism-content/)

**Key Features:**
- 250+ actividades, restaurantes, playas
- Embeddings optimizados (Matryoshka)
- Access control por subscription tier

## Getting Started

### Quick Links
- [Development Setup](development/DEVELOPMENT.md)
- [API Reference](development/API_REFERENCE.md)
- [Deployment Guide](deployment/VPS_SETUP.md)
- [Architecture](ARCHITECTURE.md)

### For Developers
1. Clone repository
2. Configure .env.local
3. Run `npm install`
4. Run `npm run dev`

See [development/DEVELOPMENT.md](development/DEVELOPMENT.md) for complete setup.

### For Stakeholders
- [Project Overview](../README.md)
- [Feature Roadmap](projects/)
- [Performance Metrics](optimization/)

## Documentation Structure

```
docs/
├── features/              # Feature documentation
│   ├── sire-compliance/   # SIRE module
│   ├── multi-tenant-chat/ # Multi-tenant system
│   └── tourism-content/   # Tourism content
├── development/           # Developer guides
├── deployment/            # VPS deployment
├── projects/              # Project-specific docs
└── archive/               # Legacy documentation
```

## Contributing

See [DEVELOPMENT.md](development/DEVELOPMENT.md) for contribution guidelines.

---

**Platform:** MUVA Chat
**Version:** 2.0 (Post-rebrand)
**Last Updated:** 2025-10-11
