-- ============================================================
-- マイグレーション 003：添付ファイル（Excel等）対応
-- ============================================================
-- 実行手順：
--   Supabaseダッシュボード → SQL Editor → このファイル全体を貼り付けて実行
-- ============================================================

-- ------------------------------------------------------------
-- 1. case_attachments：添付ファイルのメタ情報テーブル
--    実体は Supabase Storage の case-attachments バケットに保存
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.case_attachments (
  id BIGSERIAL PRIMARY KEY,
  case_study_id BIGINT NOT NULL REFERENCES public.case_studies(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 200),
  storage_path TEXT NOT NULL UNIQUE,
  file_size BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 26214400),  -- 25MB
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_attachments_case_study_id
  ON public.case_attachments(case_study_id);

ALTER TABLE public.case_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Attachments are viewable by authenticated users"
  ON public.case_attachments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert attachments for their own case studies"
  ON public.case_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.case_studies cs
      WHERE cs.id = case_attachments.case_study_id
        AND cs.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete their own attachments, admins can delete any"
  ON public.case_attachments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.case_studies cs
      WHERE cs.id = case_attachments.case_study_id
        AND (cs.user_id = (select auth.uid()) OR (select public.is_admin()))
    )
  );

-- ------------------------------------------------------------
-- 2. Storage バケット作成（private）
--    パス構成： {user_id}/{case_study_id}/{timestamp}_{file_name}
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('case-attachments', 'case-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- 3. Storage（storage.objects）の RLS ポリシー
-- ------------------------------------------------------------

-- SELECT：認証済みユーザーは事例集の添付ファイルを参照可（事例共有のため）
CREATE POLICY "Authenticated users can read case attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'case-attachments');

-- INSERT：自分の user_id フォルダ配下にのみアップロード可
CREATE POLICY "Users can upload to their own folder in case attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'case-attachments'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- DELETE：自分のファイル or 管理者
CREATE POLICY "Users can delete their own attachments, admins can delete any"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'case-attachments'
    AND (
      (storage.foldername(name))[1] = (select auth.uid())::text
      OR (select public.is_admin())
    )
  );

-- ------------------------------------------------------------
-- 4. 案件削除時に Storage 実体ファイルも連動削除するトリガー
--    case_studies を消す → CASCADE で case_attachments も消える
--    → このトリガーが storage.objects から実体を削除
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_case_attachment_storage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM storage.objects
    WHERE bucket_id = 'case-attachments'
      AND name = OLD.storage_path;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_case_attachment_delete_storage ON public.case_attachments;
CREATE TRIGGER trg_case_attachment_delete_storage
  AFTER DELETE ON public.case_attachments
  FOR EACH ROW EXECUTE FUNCTION public.delete_case_attachment_storage();
