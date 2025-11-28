# 📦 Aplicar Migración: sire_submissions

## 🎯 Opción 1: Dashboard de Supabase (MÁS RÁPIDO)

1. Ve a: **https://supabase.com/dashboard/project/zpyxgkvonrxbhvmkuzlt/sql/new**
2. Copia y pega el siguiente SQL:

```sql
-- Migration: Create sire_submissions table for SIRE compliance tracking
-- Date: 2025-11-26
-- Phase: Super Admin Dashboard - FASE 9

-- Create sire_submissions table
CREATE TABLE IF NOT EXISTS public.sire_submissions (
  submission_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant_registry(tenant_id) ON DELETE CASCADE,
  submission_date timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  reservations_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_sire_submissions_tenant_id ON public.sire_submissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sire_submissions_submission_date ON public.sire_submissions(submission_date DESC);
CREATE INDEX IF NOT EXISTS idx_sire_submissions_status ON public.sire_submissions(status);

-- Add RLS policies
ALTER TABLE public.sire_submissions ENABLE ROW LEVEL SECURITY;

-- Super admin can view all submissions
CREATE POLICY IF NOT EXISTS "super_admin_view_all_submissions"
  ON public.sire_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admin_users
      WHERE super_admin_users.user_id = auth.uid()
    )
  );

-- Add comment
COMMENT ON TABLE public.sire_submissions IS 'SIRE compliance submission tracking for all tenants';
```

3. Click "RUN"
4. Verifica que aparezca: ✅ "Success. No rows returned"

---

## 🎯 Opción 2: Desde tu terminal

```bash
# 1. Copia el SQL a un archivo temporal
cat migrations/20251126180000_create_sire_submissions.sql

# 2. Ejecuta manualmente en el SQL Editor de Supabase Dashboard
```

---

## ✅ Verificación

Después de aplicar la migración, verifica que la tabla se creó:

```bash
# Ejecutar este comando en tu terminal:
pnpm dlx tsx -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const {data, error} = await supabase.from('sire_submissions').select('*').limit(0);
console.log(error ? '❌ Error:' + error.message : '✅ Table exists!');
"
```

---

## 🔄 Siguiente Paso

Una vez aplicada la migración, **avísame** y yo:
1. Actualizo el código del API de compliance para usar la nueva tabla
2. Verifico que todo funciona correctamente
3. La página `/super-admin/compliance` mostrará datos reales

