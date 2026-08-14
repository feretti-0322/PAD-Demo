-- ============================================================
-- マイグレーション 006：拠点（location）追加 ＋ 管理者によるユーザー削除
-- ============================================================
-- 目的：
--   1) profiles に「拠点(location)」カラムを追加（6拠点：本社/札幌/仙台/名古屋/大阪/福岡）
--   2) 新規登録時に選んだ拠点を profiles に自動保存（handle_new_user を更新）
--   3) 管理者ダッシュボードのユーザー一覧に拠点を返す（admin_user_directory を更新）
--   4) 管理者が任意ユーザーを完全削除できる RPC を追加（auth.users から削除＝全データ連動削除）
--
-- 実行手順：
--   Supabaseダッシュボード → SQL Editor → このファイル全体を貼り付けて実行
--   ※ 001〜005 を実行済みの本番プロジェクトに対して追加実行する差分です
-- ============================================================

-- ------------------------------------------------------------
-- 1. profiles に拠点カラムを追加
--    6拠点のいずれか、または NULL（既存ユーザーは未設定）を許可
-- ------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location TEXT
  CHECK (location IS NULL OR location IN ('本社','札幌','仙台','名古屋','大阪','福岡'));

-- 拠点での絞り込みを速くするインデックス
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles(location);

-- ------------------------------------------------------------
-- 2. プロフィール自動作成トリガーを更新
--    登録フォームで選んだ拠点(location)も profiles に入れる。
--    不正値や未指定は NULL にフォールバック（CHECK制約違反を防ぐ）。
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  loc TEXT;
BEGIN
  loc := NEW.raw_user_meta_data ->> 'location';
  IF loc IS NOT NULL AND loc NOT IN ('本社','札幌','仙台','名古屋','大阪','福岡') THEN
    loc := NULL;
  END IF;

  INSERT INTO public.profiles (id, display_name, location)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
    loc
  );
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 3. 管理者専用ディレクトリRPCを更新（拠点カラムを追加）
--    戻り値の型が変わるため一度 DROP してから作り直す。
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_user_directory();
CREATE OR REPLACE FUNCTION public.admin_user_directory()
RETURNS TABLE (
  id           UUID,
  display_name TEXT,
  email        TEXT,
  location     TEXT,
  created_at   TIMESTAMPTZ,
  approved     BOOLEAN,
  approved_at  TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'この操作は管理者専用です';
  END IF;
  RETURN QUERY
    SELECT p.id,
           p.display_name,
           u.email::TEXT,
           p.location,
           p.created_at,
           p.approved,
           p.approved_at
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_user_directory() TO authenticated;

-- ------------------------------------------------------------
-- 4. 管理者専用：ユーザーを完全削除するRPC
--    auth.users から消すと ON DELETE CASCADE で
--    profiles / case_studies / case_flow_files / case_attachments /
--    case_likes / case_comments / lesson_progress まで連動削除される。
--    （添付ファイル実体も case_attachments 削除トリガーで Storage から消える）
--    ・管理者以外が呼ぶと例外
--    ・自分自身は誤操作防止のため削除不可
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'この操作は管理者専用です';
  END IF;
  IF target_id = auth.uid() THEN
    RAISE EXCEPTION '自分自身のアカウントは削除できません';
  END IF;
  DELETE FROM auth.users WHERE id = target_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;
