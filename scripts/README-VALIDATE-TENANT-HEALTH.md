# Tenant Health Validation Script

Quick reference for `validate-tenant-health.ts`

## Usage

```bash
set -a && source .env.local && set +a && \
npx tsx scripts/validate-tenant-health.ts <tenant-subdomain>
```

## Exit Codes

- **0** = Perfect (no warnings, no errors)
- **2** = Healthy (minor warnings only)
- **1** = Critical errors (needs attention)

## Example

```bash
# Validate simmerdown tenant
set -a && source .env.local && set +a && \
npx tsx scripts/validate-tenant-health.ts simmerdown

# Check exit code
if [ $? -eq 0 ]; then
  echo "✅ Perfect health"
elif [ $? -eq 2 ]; then
  echo "⚠️  Healthy with warnings"
else
  echo "❌ Critical errors found"
fi
```

## Health Checks

1. ✅ Stable ID Mapping (motopress_unit_id)
2. ✅ Embeddings (Tier 1 + Tier 2)
3. ✅ Semantic Chunks
4. ✅ Chunk Integrity
5. ✅ Guest Chat Search
6. ✅ Tenant Consistency

## Documentation

Full docs: `docs/guest-chat-id-mapping/fase-5/IMPLEMENTATION.md`
