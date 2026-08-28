-- Create Supabase Storage bucket for WhatsApp auth files
-- Run this in Supabase → SQL Editor

-- Create the storage bucket for WhatsApp session persistence
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-auth', 'whatsapp-auth', false)
ON CONFLICT (id) DO NOTHING;

-- Allow service role full access to the bucket
CREATE POLICY "service_role_storage" ON storage.objects
FOR ALL USING (bucket_id = 'whatsapp-auth');
