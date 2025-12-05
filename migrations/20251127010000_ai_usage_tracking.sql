-- ================================================
-- AI USAGE TRACKING - Database Infrastructure
-- ================================================
-- Migration: 20251127010000_ai_usage_tracking
-- Purpose: Create AI usage logs and monitoring tables for FASE 11
-- ================================================

-- Tabla: ai_usage_logs
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  usage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenant_registry(tenant_id) ON DELETE CASCADE,
  conversation_id UUID,
  model TEXT NOT NULL,
  input_tokens INT NOT NULL CHECK (input_tokens >= 0),
  output_tokens INT NOT NULL CHECK (output_tokens >= 0),
  total_tokens INT GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  estimated_cost NUMERIC(10,6) CHECK (estimated_cost >= 0),
  latency_ms INT CHECK (latency_ms >= 0),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_ai_usage_tenant ON public.ai_usage_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON public.ai_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_conversation ON public.ai_usage_logs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_model ON public.ai_usage_logs(model);

-- Vista agregada: AI Usage Stats
DROP VIEW IF EXISTS public.v_ai_usage_stats CASCADE;
CREATE VIEW public.v_ai_usage_stats AS
SELECT
  tenant_id,
  DATE(created_at) as usage_date,
  model,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(total_tokens) as total_tokens,
  SUM(estimated_cost) as total_cost,
  AVG(latency_ms) as avg_latency,
  COUNT(*) as request_count
FROM public.ai_usage_logs
GROUP BY tenant_id, DATE(created_at), model;

-- RLS Policies
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Super admins can view all AI usage
DROP POLICY IF EXISTS "Super admins can view all AI usage" ON public.ai_usage_logs;
CREATE POLICY "Super admins can view all AI usage"
  ON public.ai_usage_logs FOR SELECT
  USING (true);

-- Policy: System can insert AI usage logs
DROP POLICY IF EXISTS "System can insert AI usage logs" ON public.ai_usage_logs;
CREATE POLICY "System can insert AI usage logs"
  ON public.ai_usage_logs FOR INSERT
  WITH CHECK (true);

-- ================================================
-- COMENTARIOS
-- ================================================

COMMENT ON TABLE public.ai_usage_logs IS 'AI model usage tracking for cost and performance monitoring - FASE 11';
COMMENT ON COLUMN public.ai_usage_logs.usage_id IS 'Unique identifier for each AI request';
COMMENT ON COLUMN public.ai_usage_logs.tenant_id IS 'Tenant who made the request';
COMMENT ON COLUMN public.ai_usage_logs.conversation_id IS 'Associated conversation (if applicable)';
COMMENT ON COLUMN public.ai_usage_logs.model IS 'AI model used (e.g., claude-3-5-sonnet-20241022)';
COMMENT ON COLUMN public.ai_usage_logs.input_tokens IS 'Input tokens consumed';
COMMENT ON COLUMN public.ai_usage_logs.output_tokens IS 'Output tokens generated';
COMMENT ON COLUMN public.ai_usage_logs.total_tokens IS 'Total tokens (input + output) - computed column';
COMMENT ON COLUMN public.ai_usage_logs.estimated_cost IS 'Estimated cost in USD';
COMMENT ON COLUMN public.ai_usage_logs.latency_ms IS 'Response latency in milliseconds';

COMMENT ON VIEW public.v_ai_usage_stats IS 'Aggregated AI usage statistics by tenant, date, and model';
