// ===================================
// 共通処理（Supabase 対応版）
// ===================================
// 前提：HTML側でこの順序でスクリプトを読み込むこと
//   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
//   <script src="js/env.js"></script>
//   <script src="js/supabase-client.js"></script>
//   <script src="js/auth.js"></script>
//   <script src="js/common.js?v=3"></script>
// ===================================

// 未ログインなら index.html にリダイレクト
async function checkLogin() {
  if (!window.supabaseClient) {
    console.error('Supabaseクライアントが未初期化です');
    window.location.href = 'index.html';
    return null;
  }
  const { data: { user } } = await window.supabaseClient.auth.getUser();
  if (!user) {
    window.location.href = 'index.html';
    return null;
  }
  return user;
}

// 進捗バッジ取得（旧API互換）
// bootstrapPage が事前に window.__completedLessons を埋めることを前提
function getProgress() {
  const set = window.__completedLessons || new Set();
  return Array.from(set);
}
function isCompleted(lessonNumber) {
  return (window.__completedLessons || new Set()).has(lessonNumber);
}

// 学習ページIDと研修回番号の対応（v6：研修回別ページのみ）
const LESSON_MAP = {
  'lesson-0': 0,
  'lesson-1': 1,
  'lesson-2': 2,
  'lesson-3': 3,
  'lesson-4': 4,
  'lesson-5': 5,
  'lesson-6': 6,
  'lesson-7': 7,
};

// サイドバー共通HTML生成
// opts = { userName, isAdmin, completedLessons (Set) }
function renderSidebar(activePage, opts) {
  opts = opts || {};
  const userName = opts.userName || '...';
  const isAdminFlag = !!opts.isAdmin;
  const completedLessons = opts.completedLessons || new Set();

  const demoPages = [
    { id: 'dashboard', icon: '📊', label: 'ダッシュボード', href: 'dashboard.html' },
    { id: 'customer', icon: '🏢', label: '得意先一覧', href: 'customer.html' },
    { id: 'sales-input', icon: '✏️', label: '売上入力', href: 'sales-input.html' },
    { id: 'sales-list', icon: '📋', label: '売上一覧', href: 'sales-list.html' },
    { id: 'staff-list', icon: '👥', label: 'スタッフ一覧', href: 'staff-list.html' },
  ];

  // 事例集（case-study）はホーム画面のタブに統合したためサイドバーからは外す
  const referencePages = [
    { id: 'glossary',   icon: '📖', label: '用語集', href: 'glossary.html' },
  ];

  // v6：「研修回別」1セクションに統合（旧概念別ページの本文は各 lesson に正本移植）
  const learnSections = [
    {
      name: '研修回別',
      items: [
        { id: 'lesson-0',     icon: '🚀', label: '第0回 キックオフ',           href: 'lesson-0.html' },
        { id: 'lesson-1',     icon: '⚙️', label: '第1回 環境セットアップ',     href: 'lesson-1.html' },
        { id: 'lesson-2',     icon: '🔤', label: '第2回 変数を完全理解',       href: 'lesson-2.html' },
        { id: 'lesson-3',     icon: '📊', label: '第3回 Excel自動化',          href: 'lesson-3.html' },
        { id: 'lesson-4',     icon: '🌐', label: '第4回 ブラウザ自動化①',     href: 'lesson-4.html' },
        { id: 'lesson-5',     icon: '🕷️', label: '第5回 ブラウザ自動化②',     href: 'lesson-5.html' },
        { id: 'lesson-6',     icon: '🔁', label: '第6回 制御構造',             href: 'lesson-6.html' },
        { id: 'lesson-7',     icon: '🎯', label: '第7回 総合演習',             href: 'lesson-7.html' },
      ]
    },
  ];

  const makeNavItems = pages => pages.map(p => `
    <a href="${p.href}" class="nav-item ${activePage === p.id ? 'active' : ''}">
      <span class="nav-icon">${p.icon}</span>
      ${p.label}
    </a>
  `).join('');

  const makeCollapsibleSection = (section) => {
    const isOpen = section.items.some(item => activePage === item.id);
    return `
      <div class="nav-collapsible">
        <button class="nav-collapse-btn ${isOpen ? 'open' : ''}">
          <span class="collapse-icon">▶</span>
          ${section.name}
        </button>
        <div class="nav-collapse-content ${isOpen ? 'open' : ''}">
          ${section.items.map(p => {
            const lesson = LESSON_MAP[p.id];
            const badge = (lesson !== undefined && completedLessons.has(lesson)) ? '<span class="sidebar-badge">✓</span>' : '';
            return `
            <a href="${p.href}" class="nav-item nav-sub-item ${activePage === p.id ? 'active' : ''}">
              <span class="nav-icon">${p.icon}</span>
              ${p.label}${badge}
            </a>
            `;
          }).join('')}
        </div>
      </div>
    `;
  };

  const adminLink = isAdminFlag ? `
    <div class="nav-section" style="margin-top:8px;">管理</div>
    <a href="admin.html" class="nav-item ${activePage === 'admin' ? 'active' : ''}">
      <span class="nav-icon">🛡️</span>
      管理者ダッシュボード
    </a>
  ` : '';

  return `
    <aside class="sidebar">
      <a href="pad-overview.html" class="sidebar-brand" style="text-decoration:none; color:inherit; display:block;">
        <div class="brand-icon">💻</div>
        <h2>Fellows PAD道場</h2>
        <div class="brand-sub">Power Automate for Desktop</div>
      </a>
      <nav class="sidebar-nav">
        <a href="pad-overview.html" class="nav-item ${activePage === 'pad-overview' ? 'active' : ''}">
          <span class="nav-icon">🏠</span>
          ホーム（ロードマップ／事例投稿）
        </a>
        <div class="nav-section" style="margin-top:8px;">学習</div>
        ${learnSections.map(makeCollapsibleSection).join('')}
        <div class="nav-section" style="margin-top:8px;">業務デモ</div>
        ${makeNavItems(demoPages)}
        <a href="javascript:void(0)" class="nav-item ${activePage === 'staff-search' ? 'active' : ''}" onclick="openStaffSearch()">
          <span class="nav-icon">🔍</span>
          スタッフ検索
        </a>
        <a href="javascript:void(0)" class="nav-item ${activePage === 'staff-add' ? 'active' : ''}" onclick="openStaffAdd()">
          <span class="nav-icon">➕</span>
          スタッフ追加
        </a>
        <div class="nav-section" style="margin-top:8px;">リファレンス</div>
        ${makeNavItems(referencePages)}
        ${adminLink}
      </nav>
      <div class="sidebar-footer">
        ログイン中: <a href="mypage.html" class="mypage-link" title="マイページを開く"><strong>${userName}</strong></a>${isAdminFlag ? ' <span style="color:#ffd700;">👑</span>' : ''}
        <br>
        <a href="javascript:void(0)" style="color: rgba(255,255,255,0.5); font-size:14px;" onclick="window.auth.signOut()">ログアウト</a>
      </div>
    </aside>
  `;
}

// ページ初期化：認証チェック → プロフィール/管理者/進捗を取得 → サイドバー＆トップバー更新
async function bootstrapPage(activePage) {
  const user = await checkLogin();
  if (!user) return null;

  const [profile, adminFlag, progressRes] = await Promise.all([
    window.auth.getCurrentProfile(),
    window.auth.isAdmin(),
    window.supabaseClient.from('lesson_progress').select('lesson_number')
  ]);

  // 承認ゲート：管理者以外で未承認のアカウントはアプリに入れない
  if (!adminFlag && profile && profile.approved === false) {
    await window.supabaseClient.auth.signOut();
    window.location.href = 'index.html?pending=1';
    return null;
  }

  const completedLessons = new Set((progressRes.data || []).map(p => p.lesson_number));
  window.__completedLessons = completedLessons;
  // 旧APIユーザー向け：window.dispatchEvent でロード完了を通知
  window.dispatchEvent(new CustomEvent('progress-loaded', { detail: { completedLessons } }));
  const userName = profile?.display_name || user.email || 'user';

  const sidebarEl = document.getElementById('sidebarContainer');
  if (sidebarEl) sidebarEl.innerHTML = renderSidebar(activePage, { userName, isAdmin: adminFlag, completedLessons });

  const topbarEl = document.getElementById('topbarUser');
  if (topbarEl) topbarEl.textContent = userName + (adminFlag ? ' 👑' : '');

  // トップバーの名前部分をクリックでマイページへ（全ページ共通）
  const topUserEl = document.querySelector('.topbar-user');
  if (topUserEl && activePage !== 'mypage' && !topUserEl.dataset.mypageBound) {
    topUserEl.dataset.mypageBound = '1';
    topUserEl.style.cursor = 'pointer';
    topUserEl.title = 'マイページを開く';
    topUserEl.addEventListener('click', () => { window.location.href = 'mypage.html'; });
  }

  // dashboard.html などで使われる #userName / #userAvatar も上書き
  const userNameEl = document.getElementById('userName');
  if (userNameEl) userNameEl.textContent = userName;
  const userAvatarEl = document.getElementById('userAvatar');
  if (userAvatarEl) userAvatarEl.textContent = (userName.charAt(0) || 'U').toUpperCase();

  return { user, profile, isAdmin: adminFlag, completedLessons };
}

// スタッフ検索ポップアップを開く
function openStaffSearch() {
  let obj = document.getElementById('staffSearchObj');
  if (!obj) {
    obj = document.createElement('object');
    obj.id = 'staffSearchObj';
    obj.type = 'text/html';
    obj.data = 'staff-search-popup.html';
    obj.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:1000;border:none;display:none;';
    document.body.appendChild(obj);
  }
  obj.style.display = 'block';
}

function closeStaffSearch() {
  const obj = document.getElementById('staffSearchObj');
  if (obj) obj.style.display = 'none';
}

// スタッフ追加ポップアップを開く
function openStaffAdd() {
  let obj = document.getElementById('staffAddObj');
  if (!obj) {
    obj = document.createElement('object');
    obj.id = 'staffAddObj';
    obj.type = 'text/html';
    obj.data = 'staff-add-popup.html';
    obj.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:1000;border:none;display:none;';
    document.body.appendChild(obj);
  }
  obj.style.display = 'block';
}

function closeStaffAdd() {
  const obj = document.getElementById('staffAddObj');
  if (obj) obj.style.display = 'none';
}

// スタッフデータ（共通）
const STAFF_DATA = [
  { id: 'ST001', name: '山田 太郎', dept: '営業部', role: '部長',  joined: '2015/04/01', ext: '1001' },
  { id: 'ST002', name: '鈴木 花子', dept: '総務部', role: '課長',  joined: '2017/07/01', ext: '2001' },
  { id: 'ST003', name: '田中 一郎', dept: '開発部', role: '主任',  joined: '2019/04/01', ext: '3001' },
  { id: 'ST004', name: '佐藤 美咲', dept: '営業部', role: '一般',  joined: '2021/04/01', ext: '1002' },
  { id: 'ST005', name: '伊藤 健二', dept: '管理部', role: '部長',  joined: '2013/10/01', ext: '4001' },
  { id: 'ST006', name: '渡辺 さくら', dept: '開発部', role: '課長', joined: '2016/04/01', ext: '3002' },
  { id: 'ST007', name: '中村 拓也', dept: '営業部', role: '主任',  joined: '2018/04/01', ext: '1003' },
  { id: 'ST008', name: '小林 奈々', dept: '総務部', role: '一般',  joined: '2022/04/01', ext: '2002' },
  { id: 'ST009', name: '加藤 誠',   dept: '開発部', role: '一般',  joined: '2023/04/01', ext: '3003' },
  { id: 'ST010', name: '吉田 京子', dept: '管理部', role: '主任',  joined: '2018/07/01', ext: '4002' },
  { id: 'ST011', name: '山本 大輔', dept: '営業部', role: '課長',  joined: '2014/04/01', ext: '1004' },
  { id: 'ST012', name: '松本 理恵', dept: '開発部', role: '主任',  joined: '2019/10/01', ext: '3004' },
  { id: 'ST013', name: '井上 哲也', dept: '総務部', role: '課長',  joined: '2015/07/01', ext: '2003' },
  { id: 'ST014', name: '木村 ゆり', dept: '管理部', role: '一般',  joined: '2022/07/01', ext: '4003' },
  { id: 'ST015', name: '林 雄介',   dept: '営業部', role: '一般',  joined: '2023/10/01', ext: '1005' },
  { id: 'ST016', name: '清水 麻衣', dept: '開発部', role: '一般',  joined: '2024/04/01', ext: '3005' },
  { id: 'ST017', name: '山崎 浩二', dept: '管理部', role: '課長',  joined: '2016/10/01', ext: '4004' },
  { id: 'ST018', name: '池田 千恵', dept: '営業部', role: '主任',  joined: '2017/04/01', ext: '1006' },
  { id: 'ST019', name: '橋本 俊介', dept: '総務部', role: '主任',  joined: '2018/10/01', ext: '2004' },
  { id: 'ST020', name: '阿部 里奈', dept: '開発部', role: '課長',  joined: '2015/10/01', ext: '3006' },
  { id: 'ST021', name: '石川 修',   dept: '管理部', role: '部長',  joined: '2012/04/01', ext: '4005' },
  { id: 'ST022', name: '前田 彩香', dept: '営業部', role: '一般',  joined: '2024/04/01', ext: '1007' },
  { id: 'ST023', name: '藤田 達也', dept: '総務部', role: '一般',  joined: '2023/04/01', ext: '2005' },
  { id: 'ST024', name: '後藤 由美', dept: '開発部', role: '部長',  joined: '2011/04/01', ext: '3007' },
  { id: 'ST025', name: '岡田 翔太', dept: '管理部', role: '一般',  joined: '2024/10/01', ext: '4006' },
  { id: 'ST026', name: '村田 香織', dept: '営業部', role: '課長',  joined: '2016/07/01', ext: '1008' },
  { id: 'ST027', name: '長谷川 亮', dept: '開発部', role: '主任',  joined: '2020/04/01', ext: '3008' },
  { id: 'ST028', name: '近藤 真由', dept: '総務部', role: '部長',  joined: '2010/04/01', ext: '2006' },
  { id: 'ST029', name: '坂本 慎吾', dept: '管理部', role: '主任',  joined: '2019/07/01', ext: '4007' },
  { id: 'ST030', name: '石井 愛',   dept: '営業部', role: '一般',  joined: '2025/04/01', ext: '1009' },
];

// 顧客データ（共通）
const CUSTOMERS = [
  { id: 'C001', name: '株式会社山田商事', industry: '製造業', zip: '100-0001', address: '東京都千代田区千代田1-1-1', tel: '03-1234-5678' },
  { id: 'C002', name: '有限会社鈴木工業', industry: '製造業', zip: '530-0001', address: '大阪府大阪市北区梅田2-2-2', tel: '06-2345-6789' },
  { id: 'C003', name: '株式会社田中食品', industry: '飲食業', zip: '460-0001', address: '愛知県名古屋市中区栄3-3-3', tel: '052-3456-7890' },
  { id: 'C004', name: 'ABC商事株式会社', industry: 'サービス業', zip: '810-0001', address: '福岡県福岡市中央区天神4-4-4', tel: '092-4567-8901' },
  { id: 'C005', name: '株式会社佐藤建設', industry: 'その他', zip: '060-0001', address: '北海道札幌市中央区大通西5-5-5', tel: '011-5678-9012' },
  { id: 'C006', name: '東京物産株式会社', industry: '製造業', zip: '108-0075', address: '東京都港区港南6-6-6', tel: '03-6789-0123' },
  { id: 'C007', name: '大阪サービス株式会社', industry: 'サービス業', zip: '541-0041', address: '大阪府大阪市中央区北浜7-7-7', tel: '06-7890-1234' },
  { id: 'C008', name: '名古屋食品株式会社', industry: '飲食業', zip: '450-0002', address: '愛知県名古屋市中村区名駅8-8-8', tel: '052-8901-2345' },
  { id: 'C009', name: '株式会社北海道産業', industry: '製造業', zip: '064-0915', address: '北海道札幌市中央区南15条西9-9-9', tel: '011-9012-3456' },
  { id: 'C010', name: '九州商事株式会社', industry: 'サービス業', zip: '860-0001', address: '熊本県熊本市中央区手取本町10-10-10', tel: '096-0123-4567' },
];

// 売上データ（共通）
const SALES_DATA = [
  { id: 'S001', date: '2025/04/01', customerId: 'C001', customerName: '株式会社山田商事', amount: 850000, note: '定期発注' },
  { id: 'S002', date: '2025/04/02', customerId: 'C002', customerName: '有限会社鈴木工業', amount: 320000, note: '' },
  { id: 'S003', date: '2025/04/03', customerId: 'C003', customerName: '株式会社田中食品', amount: 1200000, note: '特別注文' },
  { id: 'S004', date: '2025/04/04', customerId: 'C004', customerName: 'ABC商事株式会社', amount: 450000, note: '' },
  { id: 'S005', date: '2025/04/05', customerId: 'C005', customerName: '株式会社佐藤建設', amount: 780000, note: '大型案件' },
  { id: 'S006', date: '2025/04/07', customerId: 'C006', customerName: '東京物産株式会社', amount: 230000, note: '' },
  { id: 'S007', date: '2025/04/08', customerId: 'C007', customerName: '大阪サービス株式会社', amount: 560000, note: '定期発注' },
  { id: 'S008', date: '2025/04/09', customerId: 'C008', customerName: '名古屋食品株式会社', amount: 980000, note: '' },
  { id: 'S009', date: '2025/04/10', customerId: 'C009', customerName: '株式会社北海道産業', amount: 410000, note: '' },
  { id: 'S010', date: '2025/04/11', customerId: 'C010', customerName: '九州商事株式会社', amount: 670000, note: '新規取引' },
  { id: 'S011', date: '2025/04/12', customerId: 'C001', customerName: '株式会社山田商事', amount: 1050000, note: '' },
  { id: 'S012', date: '2025/04/14', customerId: 'C002', customerName: '有限会社鈴木工業', amount: 290000, note: '' },
  { id: 'S013', date: '2025/04/15', customerId: 'C003', customerName: '株式会社田中食品', amount: 740000, note: '定期発注' },
  { id: 'S014', date: '2025/04/16', customerId: 'C004', customerName: 'ABC商事株式会社', amount: 520000, note: '' },
  { id: 'S015', date: '2025/04/17', customerId: 'C005', customerName: '株式会社佐藤建設', amount: 1380000, note: '大型案件' },
  { id: 'S016', date: '2025/04/18', customerId: 'C006', customerName: '東京物産株式会社', amount: 350000, note: '' },
  { id: 'S017', date: '2025/04/19', customerId: 'C007', customerName: '大阪サービス株式会社', amount: 620000, note: '' },
  { id: 'S018', date: '2025/04/21', customerId: 'C008', customerName: '名古屋食品株式会社', amount: 840000, note: '定期発注' },
  { id: 'S019', date: '2025/04/22', customerId: 'C009', customerName: '株式会社北海道産業', amount: 470000, note: '' },
  { id: 'S020', date: '2025/04/23', customerId: 'C010', customerName: '九州商事株式会社', amount: 930000, note: '' },
  { id: 'S021', date: '2025/04/24', customerId: 'C001', customerName: '株式会社山田商事', amount: 760000, note: '' },
  { id: 'S022', date: '2025/04/25', customerId: 'C002', customerName: '有限会社鈴木工業', amount: 380000, note: '特別注文' },
  { id: 'S023', date: '2025/04/26', customerId: 'C003', customerName: '株式会社田中食品', amount: 1100000, note: '' },
  { id: 'S024', date: '2025/04/28', customerId: 'C004', customerName: 'ABC商事株式会社', amount: 440000, note: '' },
  { id: 'S025', date: '2025/04/28', customerId: 'C005', customerName: '株式会社佐藤建設', amount: 590000, note: '' },
  { id: 'S026', date: '2025/04/29', customerId: 'C006', customerName: '東京物産株式会社', amount: 270000, note: '定期発注' },
  { id: 'S027', date: '2025/04/29', customerId: 'C007', customerName: '大阪サービス株式会社', amount: 810000, note: '' },
  { id: 'S028', date: '2025/04/30', customerId: 'C008', customerName: '名古屋食品株式会社', amount: 650000, note: '' },
  { id: 'S029', date: '2025/04/30', customerId: 'C009', customerName: '株式会社北海道産業', amount: 490000, note: '新規取引' },
  { id: 'S030', date: '2025/04/30', customerId: 'C010', customerName: '九州商事株式会社', amount: 1200000, note: '大型案件' },
];

// 金額フォーマット
function formatMoney(n) {
  return '¥' + n.toLocaleString('ja-JP');
}

// 日付フォーマット
function formatDate(d) {
  return d;
}

// コラプシブルメニュー（イベントデリゲーション方式）
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.nav-collapse-btn');
  if (!btn) return;
  e.preventDefault();
  const content = btn.nextElementSibling;
  btn.classList.toggle('open');
  content.classList.toggle('open');
});
