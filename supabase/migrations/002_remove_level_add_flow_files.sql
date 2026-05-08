-- ============================================================
-- マイグレーション 002：難易度カラム削除＋フローファイル子テーブル新設
-- ============================================================
-- 実行手順：
--   Supabaseダッシュボード → SQL Editor → このファイル全体を貼り付けて実行
-- ============================================================

-- ------------------------------------------------------------
-- 1. case_studies.level カラムを削除
--   既存データなしの前提。CHECK制約も同時に消える。
-- ------------------------------------------------------------
ALTER TABLE public.case_studies DROP COLUMN IF EXISTS level;

-- ------------------------------------------------------------
-- 2. case_flow_files：1事例:Nファイル の子テーブル
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.case_flow_files (
  id BIGSERIAL PRIMARY KEY,
  case_study_id BIGINT NOT NULL REFERENCES public.case_studies(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 100),
  flow_text TEXT NOT NULL CHECK (char_length(flow_text) BETWEEN 1 AND 200000),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (case_study_id, file_name)
);

CREATE INDEX IF NOT EXISTS idx_case_flow_files_case_study_id
  ON public.case_flow_files(case_study_id);

ALTER TABLE public.case_flow_files ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- RLSポリシー（既存 case_studies の設計に合わせる）
--   - SELECT：認証済みユーザーは全件閲覧可
--   - INSERT：自分の事例にのみ追加可
--   - DELETE：自分の事例 or 管理者
--   ※ case_studies 削除時は ON DELETE CASCADE で自動連動
-- ------------------------------------------------------------
CREATE POLICY "Flow files are viewable by authenticated users"
  ON public.case_flow_files FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert flow files for their own case studies"
  ON public.case_flow_files FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.case_studies cs
      WHERE cs.id = case_flow_files.case_study_id
        AND cs.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete their own flow files, admins can delete any"
  ON public.case_flow_files FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.case_studies cs
      WHERE cs.id = case_flow_files.case_study_id
        AND (cs.user_id = (select auth.uid()) OR (select public.is_admin()))
    )
  );
