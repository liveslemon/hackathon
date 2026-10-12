-- Integration fixes found while merging the agent branches.

-- 1. company_assets: only employers may upload, and only files named after their own user id.
--    SettingsClient uploads as `${user.id}-logo-<ts>.<ext>` / `${user.id}-banner-<ts>.<ext>`.
DROP POLICY IF EXISTS "Authenticated users can upload to company_assets" ON storage.objects;
CREATE POLICY "Authenticated users can upload to company_assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company_assets'
  AND name LIKE auth.uid()::text || '-%'
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'employer')
);

-- 2. messages: participants may mark messages read, but not rewrite them.
--    The UPDATE policies on messages allow either participant to update any row,
--    so lock every column except is_read.
CREATE OR REPLACE FUNCTION public.protect_message_content()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF coalesce(auth.role(), '') = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.content IS DISTINCT FROM OLD.content
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only is_read can be changed on a message';
  END IF;
  IF NEW.is_read IS DISTINCT FROM OLD.is_read AND OLD.sender_id = auth.uid() THEN
    RAISE EXCEPTION 'Senders cannot change the read state of their own messages';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_message_content ON public.messages;
CREATE TRIGGER trg_protect_message_content
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.protect_message_content();
