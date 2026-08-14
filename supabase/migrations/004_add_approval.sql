-- ============================================================
-- PAD研修サイト Supabaseスキーマ（承認フロー追加：004）
-- ============================================================
-- 目的：
--   1) 管理者ダッシュボードで全ユーザーのメールアドレスを表示する
--      （auth.users を参照する管理者専用RPCで取得。一般ユーザーには漏らさない）
--   2) 新規登録は「管理者が承認するまで」アプリに入れない仕組みにする
--
-- 実行手順：
--   Supabaseダッシュボード → SQL Editor → このファイル全体を貼り付けて実行
--   ※ 001〜003 を実行済みの本番プロジェクトに対して追加実行する差分です
-- ============================================================

-- ------------------------------------------------------------
-- 1. profiles に承認カラムを追加
-- ------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approved     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by  UUID REFERENCES auth.users(id);

-- 既存ユーザーは全員「承認済み」にする（今いる人をロックアウトしないため）
-- これ以降に新規登録した人だけが approved = FALSE（＝承認待ち）になる
UPDATE public.profiles SET approved = TRUE WHERE approved = FALSE;

-- 承認待ちの絞り込みを速くするインデックス
CREATE INDEX IF NOT EXISTS idx_profiles_approved ON public.profiles(approved);

-- ------------------------------------------------------------
-- 2. 承認カラムを保護するトリガー
--    ・承認状態(approved / approved_at / approved_by)を変更できるのは管理者のみ
--    ・一般ユーザーが自分のプロフィール(display_name等)を更新する分には影響しない
--    ・管理者が approved を切り替えたら approved_at / approved_by を自動で記録
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_profile_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (NEW.approved IS DISTINCT FROM OLD.approved) THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION '承認ステータスは管理者のみ変更できます';
    END IF;
    IF NEW.approved THEN
      NEW.approved_at := NOW();
      NEW.approved_by := auth.uid();
    ELSE
      NEW.approved_at := NULL;
      NEW.approved_by := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_approval ON public.profiles;
CREATE TRIGGER on_profile_approval
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_profile_approval();

-- ------------------------------------------------------------
-- 3. 管理者は任意ユーザーのプロフィールを更新できるRLSポリシー
--    （既存の「自分のプロフィールのみ更新可」ポリシーはそのまま残る＝OR結合）
--    承認列そのものは上のトリガーで守られているので、管理者だけが承認を切替可能
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((select public.is_admin()))
  WITH CHECK ((select public.is_admin()));

-- ------------------------------------------------------------
-- 4. 管理者専用：全ユーザー一覧（メール付き）を返すRPC
--    auth.users は通常クライアントから読めないため、SECURITY DEFINER 関数で
--    「管理者のときだけ」メールを含めて返す。非管理者が呼ぶと例外。
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_user_directory()
RETURNS TABLE (
  id           UUID,
  display_name TEXT,
  email        TEXT,
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
           p.created_at,
           p.approved,
           p.approved_at
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_user_directory() TO authenticated;
