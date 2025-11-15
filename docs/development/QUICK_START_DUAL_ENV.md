# Quick Start - Dual Environment Setup

Run production and staging environments **simultaneously** in different terminals.

## 🚀 Start Both Environments

### Terminal 1: Production (Port 3000)
```bash
./scripts/dev-production.sh
```
- Database: `ooaumjzaztmutltifhoq` (production)
- URL: http://localhost:3000

### Terminal 2: Staging (Port 3001)
```bash
./scripts/dev-staging.sh
```
- Database: `hoaiwcueleiemeplrurv` (staging)
- URL: http://localhost:3001

## 📋 Prerequisites

1. **Make scripts executable** (first time only):
   ```bash
   chmod +x scripts/dev-production.sh scripts/dev-staging.sh
   ```

2. **`.env.local` must exist** with:
   ```
   OPENAI_API_KEY=sk-...
   # Other non-Supabase vars
   ```

3. **Supabase credentials** are hardcoded in the scripts (for safety)

## ✅ Verify Setup

**Production (3000):**
```bash
curl http://localhost:3000/api/health
```

**Staging (3001):**
```bash
curl http://localhost:3001/api/health
```

## 🔄 Workflow

1. **Develop on staging** (port 3001)
2. **Test changes** without affecting production
3. **Compare** both environments side-by-side
4. **Deploy** to production when ready

## ⚠️ Important

- Scripts override Supabase vars from `.env.local`
- Each terminal uses different database
- Changes in staging **do not** affect production
- Hot reload works independently in both

## 🔗 Full Documentation

See `docs/development/DUAL_ENVIRONMENT_SETUP.md` for detailed guide.
