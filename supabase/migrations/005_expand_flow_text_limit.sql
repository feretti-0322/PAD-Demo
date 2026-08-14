-- ============================================================
-- PAD研修サイト Supabaseスキーマ（フローテキストの上限拡大：005）
-- ============================================================
-- 目的：
--   事例投稿のフローテキスト(case_flow_files.flow_text)の文字数上限が
--   20万文字(200,000)で、総合演習のような長いフローを貼ると
--   「case_flow_files_flow_text_check」制約違反で投稿が弾かれていた。
--   上限を200万文字(2,000,000)に引き上げる（下限1文字＝空は不可、は維持）。
--
-- 実行手順：
--   Supabaseダッシュボード → SQL Editor → このファイル全体を貼り付けて実行
-- ============================================================

ALTER TABLE public.case_flow_files
  DROP CONSTRAINT IF EXISTS case_flow_files_flow_text_check;

ALTER TABLE public.case_flow_files
  ADD CONSTRAINT case_flow_files_flow_text_check
  CHECK (char_length(flow_text) BETWEEN 1 AND 2000000);
