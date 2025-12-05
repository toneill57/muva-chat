#!/bin/bash
# ================================================
# SETUP GIT HOOKS - Run this after git clone
# ================================================

echo "🔧 Instalando Git Hooks..."

# Pre-commit hook
cp .git/hooks/pre-commit.sample .git/hooks/pre-commit 2>/dev/null || true

cat > .git/hooks/pre-commit << 'HOOK'
#!/bin/bash
set -e

# Validar migraciones si hay cambios
if git diff --cached --name-only | grep -q "^migrations/.*\.sql$"; then
  echo ""
  echo "🔍 VALIDANDO MIGRACIONES IDEMPOTENTES..."
  
  if ! ./scripts/validate-migrations-idempotent.sh; then
    echo ""
    echo "❌ COMMIT BLOQUEADO - Migraciones NO idempotentes"
    echo ""
    exit 1
  fi
  
  echo "✅ VALIDACIÓN EXITOSA"
fi

# Sync migraciones
./.claude/sync-migrations.sh

exit 0
HOOK

chmod +x .git/hooks/pre-commit

echo "✅ Git hooks instalados"
echo ""
echo "PROTECCIONES ACTIVAS:"
echo "  ✅ Pre-commit: Valida migraciones idempotentes"
echo "  ✅ GitHub Actions: Valida antes de TST/PRD"
echo "  ✅ Auto-sync: Sincroniza migrations/ ↔ supabase/migrations/"
