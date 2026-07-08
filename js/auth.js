// ============================================================
// 認証関連ヘルパー（Supabase Auth ラッパ）
// ============================================================
// すべて window.supabaseClient に依存
// ============================================================

async function signUp(email, password, displayName, location) {
  const { data, error } = await window.supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        location: location || null
      }
    }
  });
  return { data, error };
}

async function signIn(email, password) {
  const { data, error } = await window.supabaseClient.auth.signInWithPassword({
    email,
    password
  });
  return { data, error };
}

async function signOut() {
  const { error } = await window.supabaseClient.auth.signOut();
  if (!error) {
    window.location.href = 'index.html';
  }
  return { error };
}

async function getCurrentUser() {
  const { data: { user } } = await window.supabaseClient.auth.getUser();
  return user;
}

async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await window.supabaseClient
    .from('profiles')
    .select('id, display_name, location, approved')
    .eq('id', user.id)
    .single();
  if (error) {
    console.warn('プロフィール取得失敗', error);
    return null;
  }
  return data;
}

function isAdminUser(user) {
  // ⚠️ user_metadata ではなく app_metadata を見る（user_metadataはユーザー側から書き換え可能）
  return user?.app_metadata?.role === 'admin';
}

async function isAdmin() {
  const user = await getCurrentUser();
  return isAdminUser(user);
}

// アカウントが管理者に承認済みか（管理者は常に承認済み扱い）
// user を渡さなければ現在のユーザーを見る
async function isApproved(user) {
  if (user === undefined) user = await getCurrentUser();
  if (!user) return false;
  if (isAdminUser(user)) return true;
  const { data, error } = await window.supabaseClient
    .from('profiles')
    .select('approved')
    .eq('id', user.id)
    .single();
  if (error) {
    console.warn('承認状態の取得に失敗', error);
    return false;
  }
  return !!data?.approved;
}

async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = 'index.html';
    return null;
  }
  return user;
}

async function requireAdmin() {
  const user = await requireAuth();
  if (!user) return null;
  const adminFlag = await isAdmin();
  if (!adminFlag) {
    alert('このページは管理者専用です');
    window.location.href = 'pad-overview.html';
    return null;
  }
  return user;
}

window.auth = {
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  getCurrentProfile,
  isAdmin,
  isApproved,
  requireAuth,
  requireAdmin
};
