-- ============================================================
-- Push Notifications: Required Tables
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Store one push token per user (upserted on each login)
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id  uuid NOT NULL,
    token       text NOT NULL,
    platform    text DEFAULT 'unknown', -- 'ios', 'android', 'web'
    updated_at  timestamptz DEFAULT now(),
    CONSTRAINT user_push_tokens_user_id_key UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own token
CREATE POLICY "Users manage own token"
    ON public.user_push_tokens
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Company members can read all tokens in their company (needed to send notifications)
CREATE POLICY "Company members can read company tokens"
    ON public.user_push_tokens
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Index for fast company lookups
CREATE INDEX IF NOT EXISTS user_push_tokens_company_idx ON public.user_push_tokens(company_id);


-- 2. In-app notification inbox log
CREATE TABLE IF NOT EXISTS public.notifications (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id  uuid NOT NULL,
    type        text NOT NULL, -- 'low_stock', 'out_of_stock', 'new_sale', 'new_purchase', 'daily_summary', 'overdue_debt'
    title       text NOT NULL,
    body        text NOT NULL,
    read        boolean DEFAULT false,
    created_at  timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Company members can see their company notifications
CREATE POLICY "Company members see notifications"
    ON public.notifications
    FOR ALL
    USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Expire old notifications after 30 days (optional cleanup cron)
-- SELECT cron.schedule('cleanup-old-notifications', '0 2 * * *',
--   $$DELETE FROM notifications WHERE created_at < now() - interval '30 days'$$);

CREATE INDEX IF NOT EXISTS notifications_company_idx ON public.notifications(company_id, created_at DESC);
