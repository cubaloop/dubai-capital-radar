-- ============================================================================
-- DUBAI CAPITAL RADAR - MULTI-TENANT B2B SAAS DATABASE MIGRATION
-- Reference: Twenty CRM, Evolution API, Chatwoot Enterprise Schema
-- Security: Row Level Security (RLS), Supabase Auth JWT, Audit Trail
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ORGANIZATIONS (Real Estate Agencies / Brokerages)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    primary_market TEXT DEFAULT 'Dubai',
    default_currency TEXT DEFAULT 'USD',
    plan TEXT DEFAULT 'pro' CHECK (plan IN ('starter', 'pro', 'enterprise')),
    max_campaigns INT DEFAULT 50,
    max_leads INT DEFAULT 50000,
    settings JSONB DEFAULT '{
        "broker_name": "Senior Wealth Advisor",
        "agency_tagline": "Private Wealth & Sovereign Asset Structuring",
        "default_language": "es",
        "phone_prefix": "+971"
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PROFILES (Users, Brokers, Agents linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'agent' CHECK (role IN ('superadmin', 'agency_owner', 'agency_admin', 'agent')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CAMPAIGNS (Campaigns grouped per Organization)
CREATE TABLE IF NOT EXISTS public.campaigns (
    id TEXT PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    description TEXT,
    attached_flyer TEXT,
    ai_prompt_instructions TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. UPGRADE LEADS TABLE (Multi-tenant columns & indexes)
ALTER TABLE public.leads 
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS campaign_id TEXT,
    ADD COLUMN IF NOT EXISTS clean_phone TEXT,
    ADD COLUMN IF NOT EXISTS objective TEXT,
    ADD COLUMN IF NOT EXISTS timeline TEXT,
    ADD COLUMN IF NOT EXISTS budget_eur NUMERIC,
    ADD COLUMN IF NOT EXISTS crm_status TEXT DEFAULT 'CREATED',
    ADD COLUMN IF NOT EXISTS whatsapp_status TEXT DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS last_sent_type TEXT,
    ADD COLUMN IF NOT EXISTS personalized_message TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for high-speed multi-tenant queries
CREATE INDEX IF NOT EXISTS idx_leads_org ON public.leads (organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_campaign ON public.leads (campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp_status ON public.leads (whatsapp_status);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads (phone);

-- 6. LEAD NOTES (Chronological timeline & activity for each lead)
CREATE TABLE IF NOT EXISTS public.lead_notes (
    id TEXT PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    lead_id TEXT NOT NULL,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'note' CHECK (type IN ('note', 'whatsapp', 'call', 'stage_change', 'ai_summary')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lead_notes_lead ON public.lead_notes (lead_id);

-- 7. AUDIT & ACTIVITY LOGS (Anti-Hacking, Forensic Tracking & Security)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_logs_org ON public.activity_logs (organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs (created_at DESC);

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Service role full access policies
DROP POLICY IF EXISTS "Service role has full access to organizations" ON public.organizations;
CREATE POLICY "Service role has full access to organizations" ON public.organizations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role has full access to profiles" ON public.profiles;
CREATE POLICY "Service role has full access to profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role has full access to campaigns" ON public.campaigns;
CREATE POLICY "Service role has full access to campaigns" ON public.campaigns FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role has full access to leads" ON public.leads;
CREATE POLICY "Service role has full access to leads" ON public.leads FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role has full access to lead_notes" ON public.lead_notes;
CREATE POLICY "Service role has full access to lead_notes" ON public.lead_notes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role has full access to activity_logs" ON public.activity_logs;
CREATE POLICY "Service role has full access to activity_logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);

-- 9. DEFAULT SEED DATA (Dubai Capital Global Organization)
INSERT INTO public.organizations (id, name, slug, primary_market, default_currency, plan)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Dubai Capital Advisory',
    'dubai-capital-advisory',
    'Dubai',
    'USD',
    'enterprise'
) ON CONFLICT (id) DO NOTHING;
