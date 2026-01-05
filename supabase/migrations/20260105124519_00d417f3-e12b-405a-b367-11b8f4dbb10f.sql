-- Fix activity_logs RLS policy to prevent log forgery
-- Only allow inserts via triggers (SECURITY DEFINER functions) and service role

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can create activity logs" ON public.activity_logs;

-- Revoke direct INSERT from authenticated users
REVOKE INSERT ON public.activity_logs FROM authenticated;

-- Grant INSERT only to service_role (used by SECURITY DEFINER triggers)
GRANT INSERT ON public.activity_logs TO service_role;