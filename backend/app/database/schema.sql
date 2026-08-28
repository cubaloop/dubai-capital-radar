-- ============================================================
-- DUBAI CAPITAL INTELLIGENCE ENGINE - Supabase Schema Setup
-- Run this SQL in your Supabase project → SQL Editor → Run
-- ============================================================

-- 1. LEADS TABLE
-- Stores all leads organized by campaign and country
CREATE TABLE IF NOT EXISTS leads (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name        TEXT NOT NULL,
    phone       TEXT UNIQUE NOT NULL,          -- cleaned digits only, no + or spaces
    email       TEXT,
    country     TEXT DEFAULT 'unknown',        -- es, us, mx, ar, ve, uy, co, etc.
    campaign    TEXT DEFAULT 'organic',        -- campaign slug
    score       INT DEFAULT 5 CHECK (score BETWEEN 1 AND 10),
    status      TEXT DEFAULT 'cold' CHECK (status IN ('cold','warm','hot','closed','unresponsive','invalid')),
    language    TEXT DEFAULT 'es' CHECK (language IN ('es','en','pt','ar')),
    notes       TEXT,
    whatsapp_verified  BOOLEAN DEFAULT FALSE,
    last_contacted_at  TIMESTAMPTZ,
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at
BEFORE UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_leads_campaign ON leads(campaign);
CREATE INDEX IF NOT EXISTS idx_leads_country  ON leads(country);
CREATE INDEX IF NOT EXISTS idx_leads_status   ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_score    ON leads(score DESC);

-- 2. CONVERSATIONS TABLE
-- Tracks every WhatsApp message sent/received per lead
CREATE TABLE IF NOT EXISTS conversations (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id     UUID REFERENCES leads(id) ON DELETE CASCADE,
    direction   TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
    message     TEXT NOT NULL,
    channel     TEXT DEFAULT 'whatsapp',
    status      TEXT DEFAULT 'sent' CHECK (status IN ('sent','delivered','read','failed')),
    intent      TEXT,     -- classified by AI: 'interested','objection','ready_to_buy','info_request','unsubscribe'
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_lead_id ON conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_conv_created ON conversations(created_at DESC);

-- 3. CAMPAIGNS TABLE
-- Campaign metadata
CREATE TABLE IF NOT EXISTS campaigns (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug        TEXT UNIQUE NOT NULL,
    name        TEXT NOT NULL,
    country     TEXT,
    platform    TEXT,   -- facebook, instagram, event, referral, organic
    description TEXT,
    active      BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SIGNALS TABLE (Radar)
-- Stores real intent signals found on Reddit, Twitter/X, etc.
CREATE TABLE IF NOT EXISTS signals (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    platform    TEXT NOT NULL,      -- reddit, twitter, linkedin, google_alert
    source_url  TEXT,
    author      TEXT,
    content     TEXT NOT NULL,
    score       INT DEFAULT 0,      -- 0-100 intent score
    country     TEXT,
    language    TEXT DEFAULT 'es',
    status      TEXT DEFAULT 'new' CHECK (status IN ('new','contacted','converted','dismissed')),
    lead_id     UUID REFERENCES leads(id),    -- linked once they become a lead
    detected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signals_status   ON signals(status);
CREATE INDEX IF NOT EXISTS idx_signals_platform ON signals(platform);

-- 5. HELPER FUNCTION: Campaign summary
CREATE OR REPLACE FUNCTION campaign_summary()
RETURNS TABLE(campaign TEXT, total BIGINT, hot BIGINT, warm BIGINT, cold BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.campaign,
        COUNT(*)::BIGINT as total,
        COUNT(*) FILTER (WHERE l.status = 'hot')::BIGINT as hot,
        COUNT(*) FILTER (WHERE l.status = 'warm')::BIGINT as warm,
        COUNT(*) FILTER (WHERE l.status = 'cold')::BIGINT as cold
    FROM leads l
    GROUP BY l.campaign
    ORDER BY total DESC;
END;
$$ LANGUAGE plpgsql;

-- 6. ROW LEVEL SECURITY (optional but recommended)
ALTER TABLE leads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns     ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals       ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (your backend uses service role key)
CREATE POLICY "service_role_all" ON leads         FOR ALL USING (true);
CREATE POLICY "service_role_all" ON conversations FOR ALL USING (true);
CREATE POLICY "service_role_all" ON campaigns     FOR ALL USING (true);
CREATE POLICY "service_role_all" ON signals       FOR ALL USING (true);

-- ============================================================
-- Done! Your schema is ready.
-- ============================================================
