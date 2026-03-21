// ══════════════════════════════════════════════════════════════
//  NovaTEch BD — Admin Enterprise Dashboard v2.0
//  Real Firebase data · Beautiful Charts · Full Analytics
//  app.js এর পরে load হয় — window.* থেকে data নেয়
// ══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── app.js ready হওয়ার জন্য wait ──
  function waitForApp(cb, retries = 0) {
    if (window._db && window.CU && window.CR === 'admin') { cb(); return; }
    if (window.CU && window.CR && window.CR !== 'admin') return; // admin না হলে বাদ
    if (retries > 60) return;
    setTimeout(() => waitForApp(cb, retries + 1), 400);
  }

  // ── Helpers ──
  const bn  = n  => '৳' + Math.round(n || 0).toLocaleString('bn-BD');
  const bnN = n  => Math.round(n || 0).toLocaleString('bn-BD');
  const today = () => new Date().toISOString().split('T')[0];
  const toDate = s => new Date(s);
  const fmtShort = d => new Date(d).toLocaleDateString('bn-BD', { day:'numeric', month:'short' });

  // ── Chart period state ──
  let _chartPeriod = '7';

  // ══════════════════════════════════════════════
  //  INJECT CSS
  // ══════════════════════════════════════════════
  function injectCSS() {
    if (document.getElementById('nt-adm-css')) return;
    const style = document.createElement('style');
    style.id = 'nt-adm-css';
    style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap');

    /* ── Page override ── */
    #page-enterprise {
      background: var(--bg);
      padding: 0 !important;
      min-height: 100vh;
    }

    /* ── Dashboard wrapper ── */
    .nt-dash {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 100%;
    }

    /* ── Header ── */
    .nt-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      background: var(--surface, #111827);
      border: 1px solid var(--border, rgba(99,179,237,0.12));
      border-radius: 16px;
    }
    .nt-header-left { display: flex; flex-direction: column; gap: 2px; }
    .nt-header-title {
      font-family: 'Syne', sans-serif;
      font-size: 18px;
      font-weight: 800;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      line-height: 1;
    }
    .nt-header-sub { font-size: 11px; color: var(--muted, #64748b); }
    .nt-live-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(16,185,129,0.1);
      border: 1px solid rgba(16,185,129,0.25);
      color: #10b981;
      font-size: 11px;
      font-weight: 600;
      padding: 5px 12px;
      border-radius: 20px;
    }
    .nt-live-dot {
      width: 7px; height: 7px;
      background: #10b981;
      border-radius: 50%;
      animation: nt-pulse 2s infinite;
    }
    @keyframes nt-pulse { 0%,100%{opacity:1} 50%{opacity:.3} }

    /* ── Filter tabs ── */
    .nt-filter-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .nt-filter-label { font-size: 12px; font-weight: 600; color: var(--muted, #64748b); }
    .nt-tabs {
      display: flex;
      gap: 3px;
      background: var(--surface, #111827);
      border: 1px solid var(--border, rgba(99,179,237,0.12));
      padding: 4px;
      border-radius: 12px;
    }
    .nt-tab {
      padding: 5px 12px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      color: var(--muted, #64748b);
      transition: all 0.2s;
      font-family: 'Hind Siliguri', sans-serif;
      border: none;
      background: none;
    }
    .nt-tab.active {
      background: linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.1));
      color: #3b82f6;
      box-shadow: inset 0 0 0 1px rgba(59,130,246,0.25);
    }

    /* ── Stat cards ── */
    .nt-stat-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .nt-stat {
      background: var(--surface, #111827);
      border: 1px solid var(--border, rgba(99,179,237,0.12));
      border-radius: 16px;
      padding: 16px;
      position: relative;
      overflow: hidden;
      transition: transform 0.2s, border-color 0.2s;
    }
    .nt-stat:active { transform: scale(0.98); }
    .nt-stat::before {
      content: '';
      position: absolute;
      top: -20px; right: -20px;
      width: 80px; height: 80px;
      border-radius: 50%;
      filter: blur(25px);
      opacity: 0.15;
    }
    .nt-stat.blue::before { background: #3b82f6; }
    .nt-stat.green::before { background: #10b981; }
    .nt-stat.purple::before { background: #8b5cf6; }
    .nt-stat.amber::before { background: #f59e0b; }

    .nt-stat-icon {
      width: 36px; height: 36px;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px;
      margin-bottom: 12px;
    }
    .nt-stat.blue .nt-stat-icon  { background: rgba(59,130,246,0.15); }
    .nt-stat.green .nt-stat-icon { background: rgba(16,185,129,0.15); }
    .nt-stat.purple .nt-stat-icon{ background: rgba(139,92,246,0.15); }
    .nt-stat.amber .nt-stat-icon  { background: rgba(245,158,11,0.15); }

    .nt-stat-label { font-size: 10px; color: var(--muted, #64748b); font-weight: 600; margin-bottom: 4px; letter-spacing: 0.3px; }
    .nt-stat-value {
      font-family: 'Syne', sans-serif;
      font-size: 20px;
      font-weight: 700;
      color: var(--text, #f1f5f9);
      line-height: 1;
      margin-bottom: 8px;
    }
    .nt-stat-change {
      font-size: 10px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .nt-stat-change.up   { color: #10b981; }
    .nt-stat-change.down { color: #ef4444; }
    .nt-stat-change.neu  { color: var(--muted, #64748b); }

    /* ── Card ── */
    .nt-card {
      background: var(--surface, #111827);
      border: 1px solid var(--border, rgba(99,179,237,0.12));
      border-radius: 16px;
      padding: 16px;
      animation: ntFadeUp 0.4s ease both;
    }
    @keyframes ntFadeUp {
      from { opacity:0; transform:translateY(10px); }
      to   { opacity:1; transform:translateY(0); }
    }
    .nt-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }
    .nt-card-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--text, #f1f5f9);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .nt-card-badge {
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 20px;
      background: rgba(59,130,246,0.1);
      border: 1px solid rgba(59,130,246,0.2);
      color: #3b82f6;
      font-weight: 600;
    }

    /* ── Chart ── */
    .nt-chart-wrap {
      position: relative;
      height: 180px;
    }
    .nt-chart-period {
      display: flex;
      gap: 3px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    .nt-cperiod {
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
      color: var(--muted, #64748b);
      background: var(--card, rgba(255,255,255,0.03));
      border: 1px solid var(--border, rgba(99,179,237,0.12));
      transition: all 0.15s;
      font-family: 'Hind Siliguri', sans-serif;
    }
    .nt-cperiod.active {
      background: rgba(59,130,246,0.15);
      color: #3b82f6;
      border-color: rgba(59,130,246,0.3);
    }
    .nt-chart-svg { width: 100%; height: 100%; }

    /* ── Bar chart ── */
    .nt-bars {
      display: flex;
      align-items: flex-end;
      gap: 4px;
      height: 150px;
      padding-top: 20px;
    }
    .nt-bar-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      height: 100%;
      justify-content: flex-end;
    }
    .nt-bar {
      width: 100%;
      border-radius: 4px 4px 0 0;
      min-height: 4px;
      position: relative;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .nt-bar:hover { opacity: 0.8; }
    .nt-bar-val {
      position: absolute;
      top: -16px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 8px;
      color: var(--muted, #64748b);
      white-space: nowrap;
    }
    .nt-bar-lbl {
      font-size: 8px;
      color: var(--muted, #64748b);
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }

    /* ── Donut ── */
    .nt-donut-row {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .nt-donut-legend {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
    }
    .nt-legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--text, #f1f5f9);
    }
    .nt-legend-dot {
      width: 8px; height: 8px;
      border-radius: 2px;
      flex-shrink: 0;
    }
    .nt-legend-val {
      margin-left: auto;
      font-weight: 700;
      font-size: 12px;
    }

    /* ── Worker list ── */
    .nt-worker-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 0;
      border-bottom: 1px solid var(--border, rgba(99,179,237,0.06));
    }
    .nt-worker-item:last-child { border-bottom: none; }
    .nt-worker-rank {
      font-family: 'Syne', sans-serif;
      font-size: 14px;
      font-weight: 800;
      width: 20px;
      text-align: center;
      flex-shrink: 0;
    }
    .nt-worker-avatar {
      width: 34px; height: 34px;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px;
      flex-shrink: 0;
      overflow: hidden;
    }
    .nt-worker-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 10px; }
    .nt-worker-info { flex: 1; min-width: 0; }
    .nt-worker-name { font-size: 12px; font-weight: 700; color: var(--text, #f1f5f9); }
    .nt-worker-sub  { font-size: 10px; color: var(--muted, #64748b); }
    .nt-progress {
      height: 3px;
      background: var(--border, rgba(99,179,237,0.12));
      border-radius: 2px;
      overflow: hidden;
      margin-top: 3px;
    }
    .nt-progress-fill {
      height: 100%;
      border-radius: 2px;
      background: linear-gradient(90deg, #3b82f6, #8b5cf6);
    }
    .nt-worker-val { font-size: 12px; font-weight: 700; color: #10b981; flex-shrink: 0; }

    /* ── Sale table ── */
    .nt-table { width: 100%; border-collapse: collapse; }
    .nt-table th {
      font-size: 10px;
      color: var(--muted, #64748b);
      font-weight: 600;
      padding: 6px 8px;
      text-align: left;
      border-bottom: 1px solid var(--border, rgba(99,179,237,0.1));
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .nt-table td {
      padding: 10px 8px;
      font-size: 12px;
      color: var(--muted, #94a3b8);
      border-bottom: 1px solid rgba(99,179,237,0.04);
    }
    .nt-table tr:last-child td { border-bottom: none; }
    .nt-tag {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 5px;
      font-size: 10px;
      font-weight: 600;
    }
    .nt-tag.paid    { background: rgba(16,185,129,0.1); color: #10b981; border: 1px solid rgba(16,185,129,0.2); }
    .nt-tag.due     { background: rgba(239,68,68,0.1);  color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }
    .nt-tag.partial { background: rgba(245,158,11,0.1); color: #f59e0b; border: 1px solid rgba(245,158,11,0.2); }

    /* ── Mini stat row ── */
    .nt-mini-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
    }
    .nt-mini-stat {
      background: var(--card, rgba(255,255,255,0.03));
      border: 1px solid var(--border, rgba(99,179,237,0.08));
      border-radius: 10px;
      padding: 10px;
      text-align: center;
    }
    .nt-mini-label { font-size: 9px; color: var(--muted, #64748b); margin-bottom: 4px; font-weight: 600; }
    .nt-mini-val   { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; }

    /* ── Aging bar ── */
    .nt-aging-item {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    .nt-aging-label { font-size: 11px; color: var(--muted, #64748b); width: 70px; flex-shrink: 0; }
    .nt-aging-bar-wrap { flex: 1; height: 8px; background: var(--border, rgba(99,179,237,0.1)); border-radius: 4px; overflow: hidden; }
    .nt-aging-fill { height: 100%; border-radius: 4px; transition: width 0.6s ease; }
    .nt-aging-val { font-size: 11px; font-weight: 700; width: 55px; text-align: right; flex-shrink: 0; }

    /* ── Route performance ── */
    .nt-route-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 0;
      border-bottom: 1px solid var(--border, rgba(99,179,237,0.05));
    }
    .nt-route-item:last-child { border-bottom: none; }
    .nt-route-ico {
      width: 30px; height: 30px;
      border-radius: 8px;
      background: rgba(59,130,246,0.1);
      display: flex; align-items: center; justify-content: center;
      font-size: 14px;
      flex-shrink: 0;
    }
    .nt-route-info { flex: 1; min-width: 0; }
    .nt-route-name { font-size: 12px; font-weight: 600; color: var(--text, #f1f5f9); }
    .nt-route-sub  { font-size: 10px; color: var(--muted, #64748b); }
    .nt-route-val  { font-size: 12px; font-weight: 700; color: #3b82f6; flex-shrink: 0; }

    /* ── Quick actions ── */
    .nt-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .nt-action-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: var(--card, rgba(255,255,255,0.03));
      border: 1px solid var(--border, rgba(99,179,237,0.1));
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
      font-family: 'Hind Siliguri', sans-serif;
      text-align: left;
    }
    .nt-action-btn:active { transform: scale(0.97); }
    .nt-action-btn:hover { border-color: rgba(59,130,246,0.3); background: rgba(59,130,246,0.05); }
    .nt-action-ico { font-size: 20px; }
    .nt-action-lbl { font-size: 11px; font-weight: 600; color: var(--text, #f1f5f9); }
    .nt-action-sub { font-size: 10px; color: var(--muted, #64748b); }

    /* ── Month progress ── */
    .nt-month-bar {
      height: 6px;
      background: var(--border, rgba(99,179,237,0.1));
      border-radius: 3px;
      overflow: hidden;
      margin: 8px 0 12px;
    }
    .nt-month-fill {
      height: 100%;
      border-radius: 3px;
      background: linear-gradient(90deg, #3b82f6, #8b5cf6);
      transition: width 0.8s ease;
    }

    /* ── Top products ── */
    .nt-prod-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 7px 0;
      border-bottom: 1px solid var(--border, rgba(99,179,237,0.05));
    }
    .nt-prod-item:last-child { border-bottom: none; }
    .nt-prod-rank {
      font-size: 11px;
      font-weight: 700;
      color: var(--muted, #64748b);
      width: 18px;
      flex-shrink: 0;
    }
    .nt-prod-name { flex: 1; font-size: 12px; font-weight: 600; color: var(--text, #f1f5f9); }
    .nt-prod-qty  { font-size: 10px; color: var(--muted, #64748b); }
    .nt-prod-val  { font-size: 12px; font-weight: 700; color: #8b5cf6; }

    /* ── Empty state ── */
    .nt-empty {
      text-align: center;
      padding: 30px 16px;
      color: var(--muted, #64748b);
      font-size: 13px;
    }

    /* ── Refresh btn ── */
    .nt-refresh-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(59,130,246,0.1);
      border: 1px solid rgba(59,130,246,0.2);
      border-radius: 8px;
      color: #3b82f6;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      font-family: 'Hind Siliguri', sans-serif;
      transition: all 0.2s;
    }
    .nt-refresh-btn:active { transform: scale(0.95); }
    `;
    document.head.appendChild(style);
  }

  // ══════════════════════════════════════════════
  //  DATA HELPERS
  // ══════════════════════════════════════════════
  function getSales()    { return Object.values(window.allSales    || {}); }
  function getExpenses() { return Object.values(window.allExpenses || {}); }
  function getUsers()    { return Object.values(window.allUsers    || {}); }
  function getCustomers(){ return Object.values(window.allCustomers|| {}); }
  function getRoutes()   { return Object.values(window.allRoutes   || {}); }

  function getPeriodSales(days) {
    const sales = getSales();
    if (days === 'all') return sales;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(days));
    cutoff.setHours(0,0,0,0);
    return sales.filter(s => new Date(s.date) >= cutoff);
  }

  function getPrevPeriodSales(days) {
    if (days === 'all') return [];
    const sales = getSales();
    const d = parseInt(days);
    const end   = new Date(); end.setDate(end.getDate() - d); end.setHours(23,59,59,999);
    const start = new Date(); start.setDate(start.getDate() - d*2); start.setHours(0,0,0,0);
    return sales.filter(s => { const dt = new Date(s.date); return dt >= start && dt <= end; });
  }

  function getDaysArray(days) {
    const arr = [];
    const d = parseInt(days);
    for (let i = d-1; i >= 0; i--) {
      const dt = new Date();
      dt.setDate(dt.getDate() - i);
      arr.push(dt.toISOString().split('T')[0]);
    }
    return arr;
  }

  function getMonthsArray(months) {
    const arr = [];
    const now = new Date();
    for (let i = months-1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      arr.push({ key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, label: d.toLocaleDateString('bn-BD',{month:'short'}) });
    }
    return arr;
  }

  function pct(a, b) {
    if (!b || b === 0) return null;
    return ((a - b) / b * 100).toFixed(1);
  }

  function changeBadge(curr, prev) {
    const p = pct(curr, prev);
    if (p === null) return `<span class="nt-stat-change neu">— তুলনা নেই</span>`;
    if (p > 0) return `<span class="nt-stat-change up">▲ ${p}% বেশি</span>`;
    if (p < 0) return `<span class="nt-stat-change down">▼ ${Math.abs(p)}% কম</span>`;
    return `<span class="nt-stat-change neu">→ একই</span>`;
  }

  // ══════════════════════════════════════════════
  //  RENDER MAIN DASHBOARD
  // ══════════════════════════════════════════════
  function renderDashboard() {
    const page = document.getElementById('page-enterprise');
    if (!page) return;
    if (window.CR !== 'admin') return;

    const now   = new Date();
    const sales = getPeriodSales(_chartPeriod);
    const prevS = getPrevPeriodSales(_chartPeriod);
    const exps  = getExpenses();
    const allS  = getSales();

    const totalSale   = sales.reduce((a,s) => a+(s.total||0), 0);
    const totalProfit = sales.reduce((a,s) => a+(s.profit||0), 0);
    const totalDue    = allS.reduce((a,s) => a+(s.due||0), 0);
    const totalExp    = exps.reduce((a,e) => a+(e.amount||0), 0);

    const prevSale   = prevS.reduce((a,s) => a+(s.total||0), 0);
    const prevProfit = prevS.reduce((a,s) => a+(s.profit||0), 0);

    // Month info
    const lastDay    = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
    const daysPassed = now.getDate();
    const monthPct   = Math.round(daysPassed / lastDay * 100);

    const workers   = getUsers().filter(u => u.role === 'worker' || u.role === 'manager');
    const todayAtt  = Object.values(window.allAttendance || {}).filter(a => a.date === today()).length;

    page.innerHTML = `
    <div class="nt-dash">

      <!-- HEADER -->
      <div class="nt-header">
        <div class="nt-header-left">
          <div class="nt-header-title">📒 NovaTEch BD</div>
          <div class="nt-header-sub">Admin Enterprise Dashboard</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <button class="nt-refresh-btn" onclick="window.ntDashRender()">🔄 রিফ্রেশ</button>
          <div class="nt-live-pill"><div class="nt-live-dot"></div>লাইভ</div>
        </div>
      </div>

      <!-- FILTER PERIOD -->
      <div class="nt-filter-row">
        <span class="nt-filter-label">📅 সময়কাল</span>
        <div class="nt-tabs">
          ${[['আজ','1'],['৭ দিন','7'],['মাস','30'],['৩ মাস','90'],['৬ মাস','180'],['১ বছর','365']].map(([l,v]) =>
            `<button class="nt-tab${_chartPeriod===v?' active':''}" onclick="window.ntSetPeriod('${v}')">${l}</button>`
          ).join('')}
        </div>
      </div>

      <!-- STAT CARDS -->
      <div class="nt-stat-grid">
        <div class="nt-stat blue">
          <div class="nt-stat-icon">💰</div>
          <div class="nt-stat-label">মোট বিক্রয়</div>
          <div class="nt-stat-value">${bn(totalSale)}</div>
          ${changeBadge(totalSale, prevSale)}
        </div>
        <div class="nt-stat green">
          <div class="nt-stat-icon">📈</div>
          <div class="nt-stat-label">মোট লাভ</div>
          <div class="nt-stat-value">${bn(totalProfit)}</div>
          ${changeBadge(totalProfit, prevProfit)}
        </div>
        <div class="nt-stat purple">
          <div class="nt-stat-icon">📉</div>
          <div class="nt-stat-label">মোট খরচ</div>
          <div class="nt-stat-value">${bn(totalExp)}</div>
          <span class="nt-stat-change neu">সব সময়ের</span>
        </div>
        <div class="nt-stat amber">
          <div class="nt-stat-icon">🏦</div>
          <div class="nt-stat-label">মোট বাকি</div>
          <div class="nt-stat-value">${bn(totalDue)}</div>
          <span class="nt-stat-change ${totalDue>0?'down':'up'}">${totalDue>0?'⚠️ পরিশোধ বাকি':'✓ সব পরিষ্কার'}</span>
        </div>
      </div>

      <!-- MINI STATS ROW -->
      <div class="nt-mini-grid">
        <div class="nt-mini-stat">
          <div class="nt-mini-label">মোট বিক্রয়</div>
          <div class="nt-mini-val" style="color:#3b82f6">${bnN(allS.length)}</div>
        </div>
        <div class="nt-mini-stat">
          <div class="nt-mini-label">কর্মী</div>
          <div class="nt-mini-val" style="color:#8b5cf6">${bnN(workers.length)}</div>
        </div>
        <div class="nt-mini-stat">
          <div class="nt-mini-label">আজ উপস্থিত</div>
          <div class="nt-mini-val" style="color:#10b981">${bnN(todayAtt)}/${bnN(workers.length)}</div>
        </div>
      </div>

      <!-- MONTH PROGRESS -->
      <div class="nt-card">
        <div class="nt-card-header">
          <div class="nt-card-title">📅 ${now.toLocaleString('bn-BD',{month:'long',year:'numeric'})} — মাসিক অগ্রগতি</div>
          <span class="nt-card-badge">${lastDay - daysPassed} দিন বাকি</span>
        </div>
        <div class="nt-month-bar">
          <div class="nt-month-fill" style="width:${monthPct}%"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted,#64748b);">
          <span>১ তারিখ</span>
          <span style="color:#3b82f6;font-weight:700;">${monthPct}% সম্পন্ন</span>
          <span>${lastDay} তারিখ</span>
        </div>
      </div>

      <!-- SALES CHART -->
      <div class="nt-card">
        <div class="nt-card-header">
          <div class="nt-card-title">📊 বিক্রয় চার্ট</div>
        </div>
        <div class="nt-chart-period">
          ${[['৭ দিন','7'],['৩০ দিন','30'],['৩ মাস','90'],['৬ মাস','180'],['১২ মাস','365']].map(([l,v]) =>
            `<button class="nt-cperiod${_chartPeriod===v?' active':''}" onclick="window.ntSetPeriod('${v}')">${l}</button>`
          ).join('')}
        </div>
        <div id="nt-bar-chart"></div>
      </div>

      <!-- PROFIT-EXPENSE DONUT -->
      <div class="nt-card">
        <div class="nt-card-header">
          <div class="nt-card-title">💹 লাভ-খরচ-বাকি বিশ্লেষণ</div>
        </div>
        ${renderDonut(totalProfit, totalExp, totalDue)}
      </div>

      <!-- RECENT SALES TABLE -->
      <div class="nt-card">
        <div class="nt-card-header">
          <div class="nt-card-title">🧾 সর্বশেষ বিক্রয়</div>
          <button class="nt-refresh-btn" onclick="window.navTo('sale')" style="font-size:10px;">সব দেখুন →</button>
        </div>
        ${renderSaleTable(sales)}
      </div>

      <!-- TOP WORKERS -->
      <div class="nt-card">
        <div class="nt-card-header">
          <div class="nt-card-title">🏆 শীর্ষ কর্মী</div>
          <span class="nt-card-badge">নির্বাচিত সময়</span>
        </div>
        ${renderTopWorkers(sales)}
      </div>

      <!-- TOP PRODUCTS -->
      <div class="nt-card">
        <div class="nt-card-header">
          <div class="nt-card-title">📦 শীর্ষ পণ্য</div>
          <span class="nt-card-badge">বিক্রয় অনুযায়ী</span>
        </div>
        ${renderTopProducts(sales)}
      </div>

      <!-- ROUTE PERFORMANCE -->
      <div class="nt-card">
        <div class="nt-card-header">
          <div class="nt-card-title">🗺️ রুট পারফরম্যান্স</div>
        </div>
        ${renderRoutePerf(sales)}
      </div>

      <!-- DUE AGING -->
      <div class="nt-card">
        <div class="nt-card-header">
          <div class="nt-card-title">⏳ বাকি Aging বিশ্লেষণ</div>
          <span class="nt-card-badge">কতদিন ধরে বাকি</span>
        </div>
        ${renderDueAging()}
      </div>

      <!-- QUICK ACTIONS -->
      <div class="nt-card">
        <div class="nt-card-header">
          <div class="nt-card-title">⚡ দ্রুত কাজ</div>
        </div>
        <div class="nt-actions">
          <button class="nt-action-btn" onclick="window.navTo('sale')">
            <span class="nt-action-ico">🛍️</span>
            <div><div class="nt-action-lbl">নতুন বিক্রয়</div><div class="nt-action-sub">এখনই এন্ট্রি দিন</div></div>
          </button>
          <button class="nt-action-btn" onclick="window.navTo('due')">
            <span class="nt-action-ico">💰</span>
            <div><div class="nt-action-lbl">পেমেন্ট নিন</div><div class="nt-action-sub">বাকি আদায়</div></div>
          </button>
          <button class="nt-action-btn" onclick="window.navTo('att')">
            <span class="nt-action-ico">⏰</span>
            <div><div class="nt-action-lbl">উপস্থিতি</div><div class="nt-action-sub">আজকের হাজিরা</div></div>
          </button>
          <button class="nt-action-btn" onclick="window.navTo('report')">
            <span class="nt-action-ico">📊</span>
            <div><div class="nt-action-lbl">রিপোর্ট</div><div class="nt-action-sub">বিক্রয় বিশ্লেষণ</div></div>
          </button>
          <button class="nt-action-btn" onclick="window.navTo('salary')">
            <span class="nt-action-ico">💵</span>
            <div><div class="nt-action-lbl">বেতন হিসাব</div><div class="nt-action-sub">এই মাসের</div></div>
          </button>
          <button class="nt-action-btn" onclick="window.navTo('admin')">
            <span class="nt-action-ico">⚙️</span>
            <div><div class="nt-action-lbl">সেটিংস</div><div class="nt-action-sub">কনফিগারেশন</div></div>
          </button>
        </div>
      </div>

    </div>
    `;

    // Draw bar chart
    drawBarChart();
  }

  // ══════════════════════════════════════════════
  //  BAR CHART
  // ══════════════════════════════════════════════
  function drawBarChart() {
    const wrap = document.getElementById('nt-bar-chart');
    if (!wrap) return;

    const sales = getSales();
    let labels = [], values = [], colors = [];

    const p = _chartPeriod;

    if (p === '1') {
      // Today by hour
      const hrs = Array.from({length:12}, (_,i) => ({ h: i*2, label: `${i*2}:00` }));
      labels = hrs.map(h => h.label);
      values = hrs.map(h => {
        const td = today();
        return sales.filter(s => s.date === td && new Date(s.ts||0).getHours() >= h.h && new Date(s.ts||0).getHours() < h.h+2)
                    .reduce((a,s) => a+(s.total||0), 0);
      });
    } else if (parseInt(p) <= 30) {
      // Day by day
      const days = getDaysArray(parseInt(p));
      labels = days.map(d => fmtShort(d));
      values = days.map(d => sales.filter(s => s.date === d).reduce((a,s) => a+(s.total||0), 0));
    } else if (parseInt(p) <= 90) {
      // Weekly buckets
      const weeks = Math.ceil(parseInt(p) / 7);
      for (let i = weeks-1; i >= 0; i--) {
        const wStart = new Date(); wStart.setDate(wStart.getDate() - i*7 - 6);
        const wEnd   = new Date(); wEnd.setDate(wEnd.getDate() - i*7);
        labels.push(fmtShort(wStart));
        values.push(sales.filter(s => {
          const d = new Date(s.date);
          return d >= wStart && d <= wEnd;
        }).reduce((a,s) => a+(s.total||0), 0));
      }
    } else {
      // Monthly
      const months = parseInt(p) === 180 ? 6 : 12;
      const mArr = getMonthsArray(months);
      labels = mArr.map(m => m.label);
      values = mArr.map(m => sales.filter(s => s.date?.startsWith(m.key)).reduce((a,s) => a+(s.total||0), 0));
    }

    const maxVal = Math.max(...values, 1);

    // Color gradient per bar
    const gradients = ['#3b82f6','#6366f1','#8b5cf6','#06b6d4','#10b981','#3b82f6'];

    const bars = labels.map((lbl, i) => {
      const h = Math.max((values[i] / maxVal) * 130, 4);
      const vStr = values[i] >= 1000 ? Math.round(values[i]/1000)+'K' : Math.round(values[i]).toString();
      const color = gradients[i % gradients.length];
      return `
      <div class="nt-bar-col">
        <div class="nt-bar" style="height:${h}px;background:linear-gradient(180deg,${color},${color}88);">
          <div class="nt-bar-val">${vStr}</div>
        </div>
        <div class="nt-bar-lbl">${lbl}</div>
      </div>`;
    }).join('');

    wrap.innerHTML = `<div class="nt-bars">${bars}</div>`;
  }

  // ══════════════════════════════════════════════
  //  DONUT CHART
  // ══════════════════════════════════════════════
  function renderDonut(profit, exp, due) {
    const total = profit + exp + due || 1;
    const pPct = profit/total * 239;
    const ePct = exp/total * 239;
    const dPct = due/total * 239;
    const profitPct = Math.round(profit/total*100);

    return `
    <div class="nt-donut-row">
      <svg width="110" height="110" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="14"/>
        <circle cx="50" cy="50" r="38" fill="none" stroke="#3b82f6" stroke-width="14"
          stroke-dasharray="${pPct} ${239-pPct}" stroke-dashoffset="0" stroke-linecap="butt"
          transform="rotate(-90 50 50)"/>
        <circle cx="50" cy="50" r="38" fill="none" stroke="#ef4444" stroke-width="14"
          stroke-dasharray="${ePct} ${239-ePct}" stroke-dashoffset="${-pPct}" stroke-linecap="butt"
          transform="rotate(-90 50 50)"/>
        <circle cx="50" cy="50" r="38" fill="none" stroke="#f59e0b" stroke-width="14"
          stroke-dasharray="${dPct} ${239-dPct}" stroke-dashoffset="${-(pPct+ePct)}" stroke-linecap="butt"
          transform="rotate(-90 50 50)"/>
        <text x="50" y="46" text-anchor="middle" fill="white" font-size="11" font-family="Syne" font-weight="700">${profitPct}%</text>
        <text x="50" y="57" text-anchor="middle" fill="#64748b" font-size="7" font-family="Hind Siliguri">লাভ</text>
      </svg>
      <div class="nt-donut-legend">
        <div class="nt-legend-item">
          <div class="nt-legend-dot" style="background:#3b82f6"></div>
          <span>লাভ</span>
          <span class="nt-legend-val" style="color:#3b82f6">${bn(profit)}</span>
        </div>
        <div class="nt-legend-item">
          <div class="nt-legend-dot" style="background:#ef4444"></div>
          <span>খরচ</span>
          <span class="nt-legend-val" style="color:#ef4444">${bn(exp)}</span>
        </div>
        <div class="nt-legend-item">
          <div class="nt-legend-dot" style="background:#f59e0b"></div>
          <span>বাকি</span>
          <span class="nt-legend-val" style="color:#f59e0b">${bn(due)}</span>
        </div>
      </div>
    </div>`;
  }

  // ══════════════════════════════════════════════
  //  SALE TABLE
  // ══════════════════════════════════════════════
  function renderSaleTable(sales) {
    const recent = [...sales].sort((a,b) => (b.ts||0)-(a.ts||0)).slice(0,8);
    if (!recent.length) return `<div class="nt-empty">📭 কোনো বিক্রয় নেই</div>`;

    const rows = recent.map(s => {
      const tag = s.payStatus === 'নগদ' ? 'paid' : s.payStatus === 'বাকি' ? 'due' : 'partial';
      const tagLabel = s.payStatus === 'নগদ' ? 'নগদ' : s.payStatus === 'বাকি' ? 'বাকি' : 'আংশিক';
      return `<tr>
        <td style="color:var(--text,#f1f5f9);font-weight:600;">${s.shop||'—'}</td>
        <td>${s.product||'—'}</td>
        <td>${s.workerName||'—'}</td>
        <td style="color:#3b82f6;font-weight:700;">${bn(s.total)}</td>
        <td><span class="nt-tag ${tag}">${tagLabel}</span></td>
      </tr>`;
    }).join('');

    return `<table class="nt-table">
      <thead><tr><th>দোকান</th><th>পণ্য</th><th>কর্মী</th><th>পরিমাণ</th><th>স্ট্যাটাস</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  // ══════════════════════════════════════════════
  //  TOP WORKERS
  // ══════════════════════════════════════════════
  function renderTopWorkers(sales) {
    const map = {};
    sales.forEach(s => {
      if (!s.uid) return;
      if (!map[s.uid]) map[s.uid] = { name: s.workerName||'—', total:0, count:0, uid:s.uid };
      map[s.uid].total += (s.total||0);
      map[s.uid].count++;
    });

    const sorted = Object.values(map).sort((a,b) => b.total-a.total).slice(0,5);
    if (!sorted.length) return `<div class="nt-empty">📭 কোনো তথ্য নেই</div>`;

    const maxT = sorted[0].total || 1;
    const colors = ['#3b82f6','#8b5cf6','#06b6d4','#10b981','#f59e0b'];
    const medals = ['🥇','🥈','🥉','4','5'];

    return sorted.map((w, i) => {
      const user = (window.allUsers||{})[w.uid];
      const photo = user?.photoURL;
      const avatar = photo
        ? `<img src="${photo}" alt="">`
        : `<span style="font-size:16px;">👤</span>`;
      const pctW = Math.round(w.total/maxT*100);

      return `
      <div class="nt-worker-item">
        <div class="nt-worker-rank" style="color:${colors[i]}">${medals[i]}</div>
        <div class="nt-worker-avatar" style="background:${colors[i]}22">${avatar}</div>
        <div class="nt-worker-info">
          <div class="nt-worker-name">${w.name}</div>
          <div class="nt-worker-sub">${bnN(w.count)}টি বিক্রয়</div>
          <div class="nt-progress"><div class="nt-progress-fill" style="width:${pctW}%;background:linear-gradient(90deg,${colors[i]},${colors[(i+1)%colors.length]})"></div></div>
        </div>
        <div class="nt-worker-val">${bn(w.total)}</div>
      </div>`;
    }).join('');
  }

  // ══════════════════════════════════════════════
  //  TOP PRODUCTS
  // ══════════════════════════════════════════════
  function renderTopProducts(sales) {
    const map = {};
    sales.forEach(s => {
      const k = s.product || 'অজানা';
      if (!map[k]) map[k] = { name:k, total:0, qty:0 };
      map[k].total += (s.total||0);
      map[k].qty   += (s.qty||0);
    });

    const sorted = Object.values(map).sort((a,b) => b.total-a.total).slice(0,6);
    if (!sorted.length) return `<div class="nt-empty">📭 কোনো তথ্য নেই</div>`;

    return sorted.map((p,i) => `
      <div class="nt-prod-item">
        <div class="nt-prod-rank">${i+1}</div>
        <div class="nt-prod-name">${p.name}</div>
        <div class="nt-prod-qty" style="color:var(--muted)">${bnN(p.qty)} পিস</div>
        <div class="nt-prod-val">${bn(p.total)}</div>
      </div>`).join('');
  }

  // ══════════════════════════════════════════════
  //  ROUTE PERFORMANCE
  // ══════════════════════════════════════════════
  function renderRoutePerf(sales) {
    const routes = window.allRoutes || {};
    const map = {};

    sales.forEach(s => {
      const rId = s.routeId;
      if (!rId) return;
      if (!map[rId]) map[rId] = { name: routes[rId]?.name || 'অজানা রুট', total:0, count:0 };
      map[rId].total += (s.total||0);
      map[rId].count++;
    });

    // No route sales
    const noRoute = sales.filter(s => !s.routeId).reduce((a,s) => a+(s.total||0), 0);
    if (noRoute > 0) map['__none'] = { name:'রুট ছাড়া', total:noRoute, count:0 };

    const sorted = Object.values(map).sort((a,b) => b.total-a.total).slice(0,5);
    if (!sorted.length) return `<div class="nt-empty">📭 কোনো রুট তথ্য নেই</div>`;

    return sorted.map(r => `
      <div class="nt-route-item">
        <div class="nt-route-ico">🗺️</div>
        <div class="nt-route-info">
          <div class="nt-route-name">${r.name}</div>
          <div class="nt-route-sub">${bnN(r.count)} বিক্রয়</div>
        </div>
        <div class="nt-route-val">${bn(r.total)}</div>
      </div>`).join('');
  }

  // ══════════════════════════════════════════════
  //  DUE AGING
  // ══════════════════════════════════════════════
  function renderDueAging() {
    const sales  = getSales().filter(s => (s.due||0) > 0 && s.date);
    const now    = new Date();
    const buckets = [
      { label:'০–৭ দিন',   min:0,  max:7,   color:'#10b981', total:0 },
      { label:'৮–৩০ দিন',  min:8,  max:30,  color:'#f59e0b', total:0 },
      { label:'৩১–৯০ দিন', min:31, max:90,  color:'#ef4444', total:0 },
      { label:'৯০+ দিন',   min:91, max:9999,color:'#7f1d1d', total:0 },
    ];

    sales.forEach(s => {
      const days = Math.floor((now - new Date(s.date)) / 86400000);
      const b    = buckets.find(b => days >= b.min && days <= b.max);
      if (b) b.total += (s.due||0);
    });

    const maxT = Math.max(...buckets.map(b => b.total), 1);

    if (buckets.every(b => b.total === 0)) {
      return `<div class="nt-empty">✅ কোনো বাকি নেই!</div>`;
    }

    return buckets.map(b => `
      <div class="nt-aging-item">
        <div class="nt-aging-label">${b.label}</div>
        <div class="nt-aging-bar-wrap">
          <div class="nt-aging-fill" style="width:${b.total/maxT*100}%;background:${b.color}"></div>
        </div>
        <div class="nt-aging-val" style="color:${b.color}">${bn(b.total)}</div>
      </div>`).join('');
  }

  // ══════════════════════════════════════════════
  //  GLOBAL FUNCTIONS
  // ══════════════════════════════════════════════
  window.ntSetPeriod = function(period) {
    _chartPeriod = period;
    renderDashboard();
  };

  window.ntDashRender = function() {
    renderDashboard();
  };

  // ── showPage hook — enterprise page খুললেই render ──
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            