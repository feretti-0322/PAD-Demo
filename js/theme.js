// ============================================================
// テーマ（着せ替え）システム
// - <head> で style.css / corporate.css の直後に読み込む（描画前にテーマ適用＝チラつき防止）
// - 選んだテーマは localStorage に保存（端末ローカル）
// - アンロック条件は「完了レッスン数 / 投稿した事例数 / もらったいいね数」に対応
// ============================================================
(function () {
  var KEY = 'padTheme';
  var DEFAULT = 'corporate';

  // テーマ一覧（追加はここに1行足すだけ）
  // require: null＝常に解放 / { any:[ {type,n} ... ] }＝いずれか達成で解放
  //   type: 'lessons'（完了レッスン数） | 'posts'（投稿した事例数） | 'likes'（もらったいいね数）
  // swatch: マイページのプレビュー色（左から アクセント / 差し色 / 背景）
  var THEMES = [
    {
      id: 'corporate', name: 'コーポレート', emoji: '💜',
      desc: '洗練された紫のライトUI（デフォルト）',
      swatch: ['#890c84', '#ffcf4d', '#f6f5f9'],
      require: null,
    },
    {
      id: 'game', name: 'レトロゲーム', emoji: '🎮',
      desc: 'ダークなドット絵風テーマ',
      swatch: ['#41a6f6', '#ffcd75', '#0c0e18'],
      require: { any: [
        { type: 'lessons', n: 8 },
        { type: 'posts',   n: 1 },
      ] },
    },
  ];

  function safeGet() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function safeSet(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  // レトロ用フォントは game のときだけ読み込む（既定テーマを重くしない）
  function ensureRetroFonts() {
    if (document.getElementById('retro-fonts')) return;
    var l = document.createElement('link');
    l.id = 'retro-fonts';
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=DotGothic16&family=Press+Start+2P&display=swap';
    (document.head || document.documentElement).appendChild(l);
  }

  // 認証・ポップアップ画面は常にデフォルト（白い面が多く、暗色テーマだと読めなくなるため）
  var NO_THEME = ['', 'index.html', 'signup.html', 'staff-search-popup.html', 'staff-add-popup.html'];
  var pageName = (location.pathname.split('/').pop() || '').toLowerCase();
  var forced = (NO_THEME.indexOf(pageName) !== -1);

  // 描画前に即適用
  var current = safeGet() || DEFAULT;
  if (!THEMES.some(function (t) { return t.id === current; })) current = DEFAULT;
  if (forced) current = DEFAULT;
  document.documentElement.setAttribute('data-theme', current);
  if (current === 'game') ensureRetroFonts();

  // 条件1件の判定
  function condMet(cond, stats) {
    var have = (cond.type === 'lessons') ? (stats.lessons || 0)
             : (cond.type === 'posts')   ? (stats.posts   || 0)
             : (cond.type === 'likes')   ? (stats.likes   || 0) : 0;
    return have >= cond.n;
  }

  window.PADTheme = {
    THEMES: THEMES,
    get: function () { return document.documentElement.getAttribute('data-theme') || DEFAULT; },
    set: function (id) {
      if (!THEMES.some(function (t) { return t.id === id; })) return;
      safeSet(id);
      document.documentElement.setAttribute('data-theme', id);
      if (id === 'game') ensureRetroFonts();
    },
    // stats = { lessons, posts, likes }
    isUnlocked: function (theme, stats) {
      if (!theme.require) return true;
      stats = stats || {};
      if (theme.require.any) return theme.require.any.some(function (c) { return condMet(c, stats); });
      return true;
    },
    // ロック中テーマの「あと何が必要か」テキスト
    requirementText: function (theme) {
      if (!theme.require || !theme.require.any) return '';
      var label = { lessons: 'レッスン', posts: '事例投稿', likes: 'いいね' };
      var unit  = { lessons: '回クリア', posts: '件', likes: '個' };
      var parts = theme.require.any.map(function (c) { return label[c.type] + c.n + unit[c.type]; });
      return '🔒 ' + parts.join(' / ') + ' のいずれかで解放';
    },
  };
})();
