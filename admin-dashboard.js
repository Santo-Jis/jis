// ══════════════════════════════════════════════════════════════
//  NovaTEch BD — Admin Dashboard v2.0
//  Admin login করলে dash page এ সুন্দর dashboard দেখাবে
//  app.js এ কোনো পরিবর্তন নেই
// ══════════════════════════════════════════════════════════════
(function () {
  'use strict';

  // ── app.js ready হওয়ার জন্য wait ──
  function waitForApp(cb, retries = 0) {
    if (window._db && window.CU && window.CR) { cb(); return; }
    if (retries > 80) return;
    setTimeout(() => waitForApp(cb, retries + 1), 300);
  }

  const bn  = n => '৳' + Math.round(n || 0).toLocaleString('bn-BD');
  const bnN = n => Math.round(n || 0).toLocaleString('bn-BD');
  const today = () => new Date().toISOString().split('T')[0];
  const fmtShort = d => new Date(d).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' });

  let _period = '7';
  let _rendered = false;

  // ══════════════════════════════════════════════
  //  CSS
  // ══════════════════════════════════════════════
  function injectCSS() {
    if (document.getElementById('nt-adm2-css')) return;
    const s = document.createElement('style');
    s.id = 'nt-adm2-css';
    s.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap');

.ntd-wrap { padding: 4px 0 16px; display:flex; flex-direction:column; gap:13px; }

/* Header */
.ntd-header {
  background: linear-gradient(135deg,#1e3a5f,#2d1b69);
  border-radius:14px; padding:14px 16px;
  display:flex; align-items:center; justify-content:space-between;
  border:1px solid rgba(99,179,237,0.15);
}
.ntd-title { font-family:'Syne',sans-serif; font-size:17px; font-weight:800;
  background:linear-gradient(135deg,#60a5fa,#a78bfa); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
.ntd-sub { font-size:10px; color:rgba(255,255,255,0.5); margin-top:2px; }
.ntd-live { display:flex; align-items:center; gap:5px; background:rgba(16,185,129,0.12);
  border:1px solid rgba(16,185,129,0.25); color:#10b981; font-size:10px; font-weight:700;
  padding:5px 11px; border-radius:20px; }
.ntd-dot { width:6px; height:6px; background:#10b981; border-radius:50%; animation:ntdPulse 2s infinite; }
@keyframes ntdPulse { 0%,100%{opacity:1} 50%{opacity:.3} }

/* Period tabs */
.ntd-periods {
  display:flex; gap:3px; background:var(--surface,#111827);
  border:1px solid var(--border,rgba(99,179,237,0.1));
  padding:4px; border-radius:12px; overflow-x:auto;
  scrollbar-width:none;
}
.ntd-periods::-webkit-scrollbar { display:none; }
.ntd-pt {
  padding:5px 11px; border-radius:8px; font-size:11px; font-weight:600;
  cursor:pointer; color:var(--muted,#64748b); white-space:nowrap;
  transition:all 0.15s; font-family:'Hind Siliguri',sans-serif;
  border:none; background:none;
}
.ntd-pt.active { background:rgba(59,130,246,0.18); color:#60a5fa; box-shadow:inset 0 0 0 1px rgba(59,130,246,0.25); }

/* Stat grid */
.ntd-stats { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.ntd-stat {
  background:var(--surface,#111827); border-radius:14px; padding:14px;
  border:1px solid var(--border,rgba(99,179,237,0.1));
  position:relative; overflow:hidden;
  animation:ntdUp 0.4s ease both;
}
.ntd-stat::after {
  content:''; position:absolute; top:-15px; right:-15px;
  width:60px; height:60px; border-radius:50%; filter:blur(20px); opacity:0.12;
}
.ntd-stat.blue::after { background:#3b82f6; }
.ntd-stat.green::after { background:#10b981; }
.ntd-stat.red::after { background:#ef4444; }
.ntd-stat.amber::after { background:#f59e0b; }
@keyframes ntdUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
.ntd-stat:nth-child(1){animation-delay:.05s} .ntd-stat:nth-child(2){animation-delay:.1s}
.ntd-stat:nth-child(3){animation-delay:.15s} .ntd-stat:nth-child(4){animation-delay:.2s}

.ntd-sico { width:32px; height:32px; border-radius:9px; display:flex; align-items:center;
  justify-content:center; font-size:15px; margin-bottom:10px; }
.ntd-stat.blue .ntd-sico { background:rgba(59,130,246,0.15); }
.ntd-stat.green .ntd-sico { background:rgba(16,185,129,0.15); }
.ntd-stat.red .ntd-sico { background:rgba(239,68,68,0.15); }
.ntd-stat.amber .ntd-sico { background:rgba(245,158,11,0.15); }
.ntd-slbl { font-size:10px; color:var(--muted,#64748b); font-weight:600; margin-bottom:4px; }
.ntd-sval { font-family:'Syne',sans-serif; font-size:19px; font-weight:800;
  color:var(--text,#f1f5f9); line-height:1; margin-bottom:6px; }
.ntd-schg { font-size:10px; font-weight:600; }
.ntd-schg.up { color:#10b981; } .ntd-schg.dn { color:#ef4444; } .ntd-schg.neu { color:var(--muted,#64748b); }

/* Card */
.ntd-card { background:var(--surface,#111827); border:1px solid var(--border,rgba(99,179,237,0.1));
  border-radius:14px; padding:14px; animation:ntdUp 0.4s ease both; animation-delay:0.25s; }
.ntd-ch { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
.ntd-ct { font-size:13px; font-weight:700; color:var(--text,#f1f5f9); display:flex; align-items:center; gap:6px; }
.ntd-cb { font-size:10px; padding:2px 8px; border-radius:20px;
  background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.2);
  color:#60a5fa; font-weight:600; }

/* Bar Chart */
.ntd-bars { display:flex; align-items:flex-end; gap:3px; height:140px; padding-top:18px; }
.ntd-bcol { flex:1; display:flex; flex-direction:column; align-items:center; gap:3px;
  height:100%; justify-content:flex-end; }
.ntd-bar { width:100%; border-radius:4px 4px 0 0; min-height:3px; position:relative;
  cursor:pointer; transition:opacity 0.15s; }
.ntd-bar:hover { opacity:.75; }
.ntd-bv { position:absolute; top:-15px; left:50%; transform:translateX(-50%);
  font-size:8px; color:var(--muted,#64748b); white-space:nowrap; }
.ntd-bl { font-size:8px; color:var(--muted,#64748b); text-align:center;
  white-space:nowrap; overflow:hidden; max-width:100%; }

/* Mini stats */
.ntd-minis { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; }
.ntd-mini { background:rgba(255,255,255,0.03); border:1px solid var(--border,rgba(99,179,237,0.08));
  border-radius:10px; padding:10px; text-align:center; }
.ntd-ml { font-size:9px; color:var(--muted,#64748b); font-weight:600; margin-bottom:3px; }
.ntd-mv { font-family:'Syne',sans-serif; font-size:15px; font-weight:700; }

/* Month bar */
.ntd-mbar { height:5px; background:var(--border,rgba(99,179,237,0.1)); border-radius:3px;
  overflow:hidden; margin:8px 0 10px; }
.ntd-mfill { height:100%; border-radius:3px;
  background:linear-gradient(90deg,#3b82f6,#8b5cf6); transition:width 0.8s ease; }

/* Donut */
.ntd-donut { display:flex; align-items:center; gap:14px; }
.ntd-dleg { display:flex; flex-direction:column; gap:8px; flex:1; }
.ntd-dli { display:flex; align-items:center; gap:7px; font-size:12px; color:var(--text,#f1f5f9); }
.ntd-dld { width:7px; height:7px; border-radius:2px; flex-shrink:0; }
.ntd-dlv { margin-left:auto; font-weight:700; font-size:12px; }

/* Worker list */
.ntd-witem { display:flex; align-items:center; gap:9px; padding:9px 0;
  border-bottom:1px solid rgba(99,179,237,0.05); }
.ntd-witem:last-child { border-bottom:none; }
.ntd-wrank { font-family:'Syne',sans-serif; font-size:14px; font-weight:800; width:18px; text-align:center; flex-shrink:0; }
.ntd-wav { width:32px; height:32px; border-radius:9px; display:flex; align-items:center;
  justify-content:center; font-size:14px; flex-shrink:0; overflow:hidden; }
.ntd-wav img { width:100%; height:100%; object-fit:cover; border-radius:9px; }
.ntd-wi { flex:1; min-width:0; }
.ntd-wn { font-size:12px; font-weight:700; color:var(--text,#f1f5f9); }
.ntd-ws { font-size:10px; color:var(--muted,#64748b); }
.ntd-prg { height:3px; background:rgba(99,179,237,0.1); border-radius:2px; overflow:hidden; margin-top:3px; }
.ntd-pf { height:100%; border-radius:2px; }
.ntd-wv { font-size:12px; font-weight:700; color:#10b981; flex-shrink:0; }

/* Table */
.ntd-tbl { width:100%; border-collapse:collapse; }
.ntd-tbl th { font-size:10px; color:var(--muted,#64748b); font-weight:600; padding:5px 6px;
  text-align:left; border-bottom:1px solid rgba(99,179,237,0.1); text-transform:uppercase; }
.ntd-tbl td { padding:9px 6px; font-size:11px; color:var(--muted,#94a3b8);
  border-bottom:1px solid rgba(99,179,237,0.04); }
.ntd-tbl tr:last-child td { border-bottom:none; }
.ntd-tag { display:inline-block; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:600; }
.ntd-tag.p { background:rgba(16,185,129,0.1); color:#10b981; border:1px solid rgba(16,185,129,0.2); }
.ntd-tag.d { background:rgba(239,68,68,0.1); color:#ef4444; border:1px solid rgba(239,68,68,0.2); }
.ntd-tag.a { background:rgba(245,158,11,0.1); color:#f59e0b; border:1px solid rgba(245,158,11,0.2); }

/* Products */
.ntd-pitem { display:flex; align-items:center; gap:9px; padding:7px 0;
  border-bottom:1px solid rgba(99,179,237,0.04); }
.ntd-pitem:last-child { border-bottom:none; }
.ntd-prk { font-size:11px; color:var(--muted,#64748b); width:16px; flex-shrink:0; font-weight:700; }
.ntd-pnm { flex:1; font-size:12px; font-weight:600; color:var(--text,#f1f5f9); }
.ntd-pq  { font-size:10px; color:var(--muted,#64748b); }
.ntd-pv  { font-size:12px; font-weight:700; color:#8b5cf6; }

/* Route */
.ntd-ritem { display:flex; align-items:center; gap:9px; padding:8px 0;
  border-bottom:1px solid rgba(99,179,237,0.04); }
.ntd-ritem:last-child { border-bottom:none; }
.ntd-rico { width:28px; height:28px; border-radius:8px; background:rgba(59,130,246,0.1);
  display:flex; align-items:center; justify-content:center; font-size:13px; flex-shrink:0; }
.ntd-ri { flex:1; min-width:0; }
.ntd-rn { font-size:12px; font-weight:600; color:var(--text,#f1f5f9); }
.ntd-rs { font-size:10px; color:var(--muted,#64748b); }
.ntd-rv { font-size:12px; font-weight:700; color:#3b82f6; flex-shrink:0; }

/* Aging */
.ntd-aitem { display:flex; align-items:center; gap:9px; margin-bottom:9px; }
.ntd-albl { font-size:10px; color:var(--muted,#64748b); width:65px; flex-shrink:0; }
.ntd-abar { flex:1; height:7px; background:rgba(99,179,237,0.08); border-radius:4px; overflow:hidden; }
.ntd-afill { height:100%; border-radius:4px; transition:width 0.6s ease; }
.ntd-av { font-size:11px; font-weight:700; width:52px; text-align:right; flex-shrink:0; }

/* Quick actions */
.ntd-acts { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.ntd-act { display:flex; align-items:center; gap:8px; padding:11px;
  background:rgba(255,255,255,0.03); border:1px solid rgba(99,179,237,0.08);
  border-radius:12px; cursor:pointer; transition:all 0.15s;
  font-family:'Hind Siliguri',sans-serif; text-align:left; width:100%; }
.ntd-act:active { transform:scale(0.97); }
.ntd-act:hover { border-color:rgba(59,130,246,0.3); background:rgba(59,130,246,0.05); }
.ntd-ai { font-size:18px; }
.ntd-an { font-size:11px; font-weight:700; color:var(--text,#f1f5f9); }
.ntd-as { font-size:10px; color:var(--muted,#64748b); }

/* Refresh */
.ntd-rbtn { display:flex; align-items:center; gap:5px; padding:5px 10px;
  background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.2);
  border-radius:8px; color:#60a5fa; font-size:11px; font-weight:600; cursor:pointer;
  font-family:'Hind Siliguri',sans-serif; transition:all 0.15s; }
.ntd-rbtn:active { transform:scale(0.95); }

.ntd-empty { text-align:center; padding:24px; color:var(--muted,#64748b); font-size:12px; }
    `;
    document.head.appendChild(s);
  }

  // ══════════════════════════════════════════════
  //  DATA HELPERS
  // ══════════════════════════════════════════════
  const getSales    = () => Object.values(window.allSales     || {});
  const getExpenses = () => Object.values(window.allExpenses  || {});
  const getUsers    = () => Object.values(window.allUsers     || {});

  function getPeriodSales(days) {
    const all = getSales();
    if (days === 'all') return all;
    const cut = new Date();
    cut.setDate(cut.getDate() - parseInt(days));
    cut.setHours(0, 0, 0, 0);
    return all.filter(s => new Date(s.date) >= cut);
  }

  function getPrevSales(days) {
    if (days === 'all') return [];
    const all = getSales(); const d = parseInt(days);
    const end = new Date(); end.setDate(end.getDate() - d); end.setHours(23,59,59,999);
    const st  = new Date(); st.setDate(st.getDate() - d*2); st.setHours(0,0,0,0);
    return all.filter(s => { const dt = new Date(s.date); return dt >= st && dt <= end; });
  }

  function pctChange(cur, prv) {
    if (!prv) return null;
    return ((cur - prv) / prv * 100).toFixed(1);
  }

  function chgBadge(cur, prv) {
    const p = pctChange(cur, prv);
    if (p === null) return `<span class="ntd-schg neu">— তুলনা নেই</span>`;
    if (+p > 0) return `<span class="ntd-schg up">▲ ${p}% বেশি</span>`;
    if (+p < 0) return `<span class="ntd-schg dn">▼ ${Math.abs(p)}% কম</span>`;
    return `<span class="ntd-schg neu">→ একই</span>`;
  }

  // ══════════════════════════════════════════════
  //  SHOW/HIDE ORIGINAL DASH ELEMENTS FOR ADMIN
  // ══════════════════════════════════════════════
  function toggleOriginalDash(hide) {
    const ids = ['dashLineChartWrap','dashWorkerChartWrap','dashWorkerRing'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = hide ? 'none' : '';
    });
    // sec div (সর্বশেষ বিক্রয়)
    const secs = document.querySelectorAll('#page-dash .sec');
    secs.forEach(el => { el.style.display = hide ? 'none' : ''; });
    // dashSales
    const ds = document.getElementById('dashSales');
    if (ds) ds.style.display = hide ? 'none' : '';
    // dashMonthProgress
    const dmp = document.getElementById('dashMonthProgress');
    if (dmp) dmp.style.display = 'none'; // always hide, we have our own
  }

  // ══════════════════════════════════════════════
  //  MAIN RENDER
  // ══════════════════════════════════════════════
  function render() {
    if (window.CR !== 'admin') return;

    const wrap = document.getElementById('adminEnterpriseDash');
    if (!wrap) return;
    wrap.style.display = 'block';
    toggleOriginalDash(true);

    const now    = new Date();
    const sales  = getPeriodSales(_period);
    const prev   = getPrevSales(_period);
    const allS   = getSales();
    const exps   = getExpenses();
    const workers = getUsers().filter(u => u.role === 'worker' || u.role === 'manager');
    const todayAtt = Object.values(window.allAttendance || {}).filter(a => a.date === today()).length;

    const totSale   = sales.reduce((a,s) => a+(s.total||0), 0);
    const totProfit = sales.reduce((a,s) => a+(s.profit||0), 0);
    const totDue    = allS.reduce((a,s) => a+(s.due||0), 0);
    const totExp    = exps.reduce((a,e) => a+(e.amount||0), 0);
    const prvSale   = prev.reduce((a,s) => a+(s.total||0), 0);
    const prvProfit = prev.reduce((a,s) => a+(s.profit||0), 0);

    const lastDay   = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
    const mPct      = Math.round(now.getDate() / lastDay * 100);

    wrap.innerHTML = `
<div class="ntd-wrap">

  <!-- Header -->
  <div class="ntd-header">
    <div>
      <div class="ntd-title">📒 NovaTEch BD</div>
      <div class="ntd-sub">Admin Dashboard · ${now.toLocaleDateString('bn-BD',{day:'numeric',month:'long',year:'numeric'})}</div>
    </div>
    <div style="display:flex;align-items:center;gap:8px;">
      <button class="ntd-rbtn" onclick="window.ntd_render()">🔄</button>
      <div class="ntd-live"><div class="ntd-dot"></div>লাইভ</div>
    </div>
  </div>

  <!-- Period tabs -->
  <div class="ntd-periods">
    ${[['আজ','1'],['৭ দিন','7'],['৩০ দিন','30'],['৩ মাস','90'],['৬ মাস','180'],['১ বছর','365']].map(([l,v])=>
      `<button class="ntd-pt${_period===v?' active':''}" onclick="window.ntd_period('${v}')">${l}</button>`
    ).join('')}
  </div>

  <!-- Stat cards -->
  <div class="ntd-stats">
    <div class="ntd-stat blue">
      <div class="ntd-sico">💰</div>
      <div class="ntd-slbl">মোট বিক্রয়</div>
      <div class="ntd-sval">${bn(totSale)}</div>
      ${chgBadge(totSale, prvSale)}
    </div>
    <div class="ntd-stat green">
      <div class="ntd-sico">📈</div>
      <div class="ntd-slbl">মোট লাভ</div>
      <div class="ntd-sval">${bn(totProfit)}</div>
      ${chgBadge(totProfit, prvProfit)}
    </div>
    <div class="ntd-stat red">
      <div class="ntd-sico">📉</div>
      <div class="ntd-slbl">মোট খরচ</div>
      <div class="ntd-sval">${bn(totExp)}</div>
      <span class="ntd-schg neu">সব সময়ের</span>
    </div>
    <div class="ntd-stat amber">
      <div class="ntd-sico">🏦</div>
      <div class="ntd-slbl">মোট বাকি</div>
      <div class="ntd-sval">${bn(totDue)}</div>
      <span class="ntd-schg ${totDue>0?'dn':'up'}">${totDue>0?'⚠️ বাকি আছে':'✓ পরিষ্কার'}</span>
    </div>
  </div>

  <!-- Mini stats -->
  <div class="ntd-minis">
    <div class="ntd-mini">
      <div class="ntd-ml">মোট বিক্রয়</div>
      <div class="ntd-mv" style="color:#3b82f6">${bnN(allS.length)}</div>
    </div>
    <div class="ntd-mini">
      <div class="ntd-ml">কর্মী</div>
      <div class="ntd-mv" style="color:#8b5cf6">${bnN(workers.length)}</div>
    </div>
    <div class="ntd-mini">
      <div class="ntd-ml">আজ উপস্থিত</div>
      <div class="ntd-mv" style="color:#10b981">${todayAtt}/${workers.length}</div>
    </div>
  </div>

  <!-- Month progress -->
  <div class="ntd-card">
    <div class="ntd-ch">
      <div class="ntd-ct">📅 ${now.toLocaleString('bn-BD',{month:'long',year:'numeric'})}</div>
      <span class="ntd-cb">${lastDay - now.getDate()} দিন বাকি</span>
    </div>
    <div class="ntd-mbar"><div class="ntd-mfill" style="width:${mPct}%"></div></div>
    <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted,#64748b);">
      <span>শুরু</span>
      <span style="color:#60a5fa;font-weight:700;">${mPct}% সম্পন্ন</span>
      <span>শেষ</span>
    </div>
  </div>

  <!-- Bar Chart -->
  <div class="ntd-card">
    <div class="ntd-ch">
      <div class="ntd-ct">📊 বিক্রয় চার্ট</div>
      <span class="ntd-cb" id="ntd-chart-lbl"></span>
    </div>
    <div id="ntd-barchart"></div>
  </div>

  <!-- Donut -->
  <div class="ntd-card">
    <div class="ntd-ch"><div class="ntd-ct">💹 লাভ · খরচ · বাকি</div></div>
    ${renderDonut(totProfit, totExp, totDue)}
  </div>

  <!-- Recent sales -->
  <div class="ntd-card">
    <div class="ntd-ch">
      <div class="ntd-ct">🧾 সর্বশেষ বিক্রয়</div>
      <button class="ntd-rbtn" onclick="window.navTo('sale')" style="font-size:10px;">সব →</button>
    </div>
    ${renderTable(sales)}
  </div>

  <!-- Top workers -->
  <div class="ntd-card">
    <div class="ntd-ch">
      <div class="ntd-ct">🏆 শীর্ষ কর্মী</div>
      <span class="ntd-cb">নির্বাচিত সময়</span>
    </div>
    ${renderWorkers(sales)}
  </div>

  <!-- Top products -->
  <div class="ntd-card">
    <div class="ntd-ch">
      <div class="ntd-ct">📦 শীর্ষ পণ্য</div>
    </div>
    ${renderProducts(sales)}
  </div>

  <!-- Route perf -->
  <div class="ntd-card">
    <div class="ntd-ch">
      <div class="ntd-ct">🗺️ রুট পারফরম্যান্স</div>
    </div>
    ${renderRoutes(sales)}
  </div>

  <!-- Due aging -->
  <div class="ntd-card">
    <div class="ntd-ch">
      <div class="ntd-ct">⏳ বাকি Aging</div>
      <span class="ntd-cb">কতদিন ধরে</span>
    </div>
    ${renderAging()}
  </div>

  <!-- Quick actions -->
  <div class="ntd-card">
    <div class="ntd-ch"><div class="ntd-ct">⚡ দ্রুত কাজ</div></div>
    <div class="ntd-acts">
      <button class="ntd-act" onclick="window.navTo('sale')">
        <span class="ntd-ai">🛍️</span><div><div class="ntd-an">নতুন বিক্রয়</div><div class="ntd-as">এখনই এন্ট্রি</div></div>
      </button>
      <button class="ntd-act" onclick="window.navTo('due')">
        <span class="ntd-ai">💰</span><div><div class="ntd-an">পেমেন্ট</div><div class="ntd-as">বাকি আদায়</div></div>
      </button>
      <button class="ntd-act" onclick="window.navTo('att')">
        <span class="ntd-ai">⏰</span><div><div class="ntd-an">উপস্থিতি</div><div class="ntd-as">আজকের হাজিরা</div></div>
      </button>
      <button class="ntd-act" onclick="window.navTo('report')">
        <span class="ntd-ai">📊</span><div><div class="ntd-an">রিপোর্ট</div><div class="ntd-as">বিক্রয় বিশ্লেষণ</div></div>
      </button>
      <button class="ntd-act" onclick="window.navTo('salary')">
        <span class="ntd-ai">💵</span><div><div class="ntd-an">বেতন হিসাব</div><div class="ntd-as">এই মাসের</div></div>
      </button>
      <button class="ntd-act" onclick="window.navTo('admin')">
        <span class="ntd-ai">⚙️</span><div><div class="ntd-an">সেটিংস</div><div class="ntd-as">কনফিগারেশন</div></div>
      </button>
    </div>
  </div>

</div>`;

    drawBarChart(sales);
  }

  // ══════════════════════════════════════════════
  //  BAR CHART
  // ══════════════════════════════════════════════
  function drawBarChart(sales) {
    const wrap = document.getElementById('ntd-barchart');
    const lbl  = document.getElementById('ntd-chart-lbl');
    if (!wrap) return;

    const allS = getSales();
    let labels = [], values = [];
    const p = parseInt(_period);
    const gradients = ['#3b82f6','#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#3b82f6','#6366f1','#8b5cf6','#06b6d4'];

    if (_period === '1') {
      if(lbl) lbl.textContent = 'আজ';
      for(let h=0;h<24;h+=2){
        labels.push(h+':00');
        const td = today();
        values.push(allS.filter(s=>s.date===td && new Date(s.ts||0).getHours()>=h && new Date(s.ts||0).getHours()<h+2).reduce((a,s)=>a+(s.total||0),0));
      }
    } else if (p <= 30) {
      if(lbl) lbl.textContent = `শেষ ${p} দিন`;
      for(let i=p-1;i>=0;i--){
        const d=new Date(); d.setDate(d.getDate()-i);
        const ds=d.toISOString().split('T')[0];
        labels.push(fmtShort(ds));
        values.push(allS.filter(s=>s.date===ds).reduce((a,s)=>a+(s.total||0),0));
      }
    } else if (p <= 90) {
      const weeks = Math.ceil(p/7);
      if(lbl) lbl.textContent = `শেষ ${weeks} সপ্তাহ`;
      for(let i=weeks-1;i>=0;i--){
        const ws=new Date(); ws.setDate(ws.getDate()-i*7-6); ws.setHours(0,0,0,0);
        const we=new Date(); we.setDate(we.getDate()-i*7); we.setHours(23,59,59,999);
        labels.push(fmtShort(ws));
        values.push(allS.filter(s=>{const d=new Date(s.date);return d>=ws&&d<=we;}).reduce((a,s)=>a+(s.total||0),0));
      }
    } else {
      const months = p === 180 ? 6 : 12;
      if(lbl) lbl.textContent = `শেষ ${months} মাস`;
      const now = new Date();
      for(let i=months-1;i>=0;i--){
        const d=new Date(now.getFullYear(), now.getMonth()-i, 1);
        const mk=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        labels.push(d.toLocaleDateString('bn-BD',{month:'short'}));
        values.push(allS.filter(s=>s.date?.startsWith(mk)).reduce((a,s)=>a+(s.total||0),0));
      }
    }

    const maxV = Math.max(...values, 1);
    const bars = labels.map((l,i)=>{
      const h = Math.max((values[i]/maxV)*120, 3);
      const v = values[i]>=1000 ? Math.round(values[i]/1000)+'K' : Math.round(values[i]).toString();
      return `<div class="ntd-bcol">
        <div class="ntd-bar" style="height:${h}px;background:linear-gradient(180deg,${gradients[i%gradients.length]},${gradients[i%gradients.length]}88);">
          <div class="ntd-bv">${v}</div>
        </div>
        <div class="ntd-bl">${l}</div>
      </div>`;
    }).join('');

    wrap.innerHTML = `<div class="ntd-bars">${bars}</div>`;
  }

  // ══════════════════════════════════════════════
  //  DONUT
  // ══════════════════════════════════════════════
  function renderDonut(profit, exp, due) {
    const total = profit + exp + due || 1;
    const C = 239;
    const pp = profit/total*C, ep = exp/total*C, dp = due/total*C;
    const pct = Math.round(profit/total*100);
    return `<div class="ntd-donut">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="14"/>
        <circle cx="50" cy="50" r="38" fill="none" stroke="#3b82f6" stroke-width="14"
          stroke-dasharray="${pp} ${C-pp}" transform="rotate(-90 50 50)"/>
        <circle cx="50" cy="50" r="38" fill="none" stroke="#ef4444" stroke-width="14"
          stroke-dasharray="${ep} ${C-ep}" stroke-dashoffset="${-pp}" transform="rotate(-90 50 50)"/>
        <circle cx="50" cy="50" r="38" fill="none" stroke="#f59e0b" stroke-width="14"
          stroke-dasharray="${dp} ${C-dp}" stroke-dashoffset="${-(pp+ep)}" transform="rotate(-90 50 50)"/>
        <text x="50" y="46" text-anchor="middle" fill="white" font-size="11" font-family="Syne" font-weight="700">${pct}%</text>
        <text x="50" y="57" text-anchor="middle" fill="#64748b" font-size="7" font-family="Hind Siliguri">লাভ</text>
      </svg>
      <div class="ntd-dleg">
        <div class="ntd-dli"><div class="ntd-dld" style="background:#3b82f6"></div>লাভ<span class="ntd-dlv" style="color:#3b82f6">${bn(profit)}</span></div>
        <div class="ntd-dli"><div class="ntd-dld" style="background:#ef4444"></div>খরচ<span class="ntd-dlv" style="color:#ef4444">${bn(exp)}</span></div>
        <div class="ntd-dli"><div class="ntd-dld" style="background:#f59e0b"></div>বাকি<span class="ntd-dlv" style="color:#f59e0b">${bn(due)}</span></div>
      </div>
    </div>`;
  }

  // ══════════════════════════════════════════════
  //  RECENT SALES TABLE
  // ══════════════════════════════════════════════
  function renderTable(sales) {
    const recent = [...sales].sort((a,b)=>(b.ts||0)-(a.ts||0)).slice(0,8);
    if (!recent.length) return `<div class="ntd-empty">📭 কোনো বিক্রয় নেই</div>`;
    return `<table class="ntd-tbl">
      <thead><tr><th>দোকান</th><th>পণ্য</th><th>কর্মী</th><th>টাকা</th><th></th></tr></thead>
      <tbody>${recent.map(s=>{
        const t = s.payStatus==='নগদ'?'p':s.payStatus==='বাকি'?'d':'a';
        const l = s.payStatus==='নগদ'?'নগদ':s.payStatus==='বাকি'?'বাকি':'আংশিক';
        return `<tr>
          <td style="color:var(--text,#f1f5f9);font-weight:600;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.shop||'—'}</td>
          <td style="max-width:70px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.product||'—'}</td>
          <td>${s.workerName||'—'}</td>
          <td style="color:#3b82f6;font-weight:700">${bn(s.total)}</td>
          <td><span class="ntd-tag ${t}">${l}</span></td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  }

  // ══════════════════════════════════════════════
  //  TOP WORKERS
  // ══════════════════════════════════════════════
  function renderWorkers(sales) {
    const map = {};
    sales.forEach(s => {
      if (!s.uid) return;
      if (!map[s.uid]) map[s.uid] = {name:s.workerName||'—',total:0,count:0,uid:s.uid};
      map[s.uid].total += (s.total||0);
      map[s.uid].count++;
    });
    const sorted = Object.values(map).sort((a,b)=>b.total-a.total).slice(0,5);
    if (!sorted.length) return `<div class="ntd-empty">📭 কোনো তথ্য নেই</div>`;
    const maxT = sorted[0].total || 1;
    const clrs = ['#3b82f6','#8b5cf6','#06b6d4','#10b981','#f59e0b'];
    const medals = ['🥇','🥈','🥉','4','5'];
    return sorted.map((w,i)=>{
      const user = (window.allUsers||{})[w.uid];
      const photo = user?.photoURL;
      const av = photo ? `<img src="${photo}" alt="">` : `<span style="font-size:14px">👤</span>`;
      const pw = Math.round(w.total/maxT*100);
      return `<div class="ntd-witem">
        <div class="ntd-wrank" style="color:${clrs[i]}">${medals[i]}</div>
        <div class="ntd-wav" style="background:${clrs[i]}22">${av}</div>
        <div class="ntd-wi">
          <div class="ntd-wn">${w.name}</div>
          <div class="ntd-ws">${bnN(w.count)}টি বিক্রয়</div>
          <div class="ntd-prg"><div class="ntd-pf" style="width:${pw}%;background:linear-gradient(90deg,${clrs[i]},${clrs[(i+1)%clrs.length]})"></div></div>
        </div>
        <div class="ntd-wv">${bn(w.total)}</div>
      </div>`;
    }).join('');
  }

  // ══════════════════════════════════════════════
  //  TOP PRODUCTS
  // ══════════════════════════════════════════════
  function renderProducts(sales) {
    const map = {};
    sales.forEach(s=>{
      const k=s.product||'অজানা';
      if(!map[k])map[k]={name:k,total:0,qty:0};
      map[k].total+=(s.total||0); map[k].qty+=(s.qty||0);
    });
    const sorted=Object.values(map).sort((a,b)=>b.total-a.total).slice(0,6);
    if(!sorted.length) return `<div class="ntd-empty">📭 কোনো তথ্য নেই</div>`;
    return sorted.map((p,i)=>`
      <div class="ntd-pitem">
        <div class="ntd-prk">${i+1}</div>
        <div class="ntd-pnm">${p.name}</div>
        <div class="ntd-pq">${bnN(p.qty)} পিস</div>
        <div class="ntd-pv">${bn(p.total)}</div>
      </div>`).join('');
  }

  // ══════════════════════════════════════════════
  //  ROUTE PERFORMANCE
  // ══════════════════════════════════════════════
  function renderRoutes(sales) {
    const routes = window.allRoutes || {};
    const map = {};
    sales.forEach(s=>{
      const rid=s.routeId;
      if(!rid) return;
      if(!map[rid])map[rid]={name:routes[rid]?.name||'অজানা রুট',total:0,count:0};
      map[rid].total+=(s.total||0); map[rid].count++;
    });
    const noR=sales.filter(s=>!s.routeId).reduce((a,s)=>a+(s.total||0),0);
    if(noR>0) map['__none']={name:'রুট ছাড়া',total:noR,count:0};
    const sorted=Object.values(map).sort((a,b)=>b.total-a.total).slice(0,5);
    if(!sorted.length) return `<div class="ntd-empty">📭 কোনো রুট তথ্য নেই</div>`;
    return sorted.map(r=>`
      <div class="ntd-ritem">
        <div class="ntd-rico">🗺️</div>
        <div class="ntd-ri">
          <div class="ntd-rn">${r.name}</div>
          <div class="ntd-rs">${bnN(r.count)} বিক্রয়</div>
        </div>
        <div class="ntd-rv">${bn(r.total)}</div>
      </div>`).join('');
  }

  // ══════════════════════════════════════════════
  //  DUE AGING
  // ══════════════════════════════════════════════
  function renderAging() {
    const now=new Date();
    const bkts=[
      {label:'০–৭ দিন', min:0, max:7,   color:'#10b981',total:0},
      {label:'৮–৩০ দিন',min:8, max:30,  color:'#f59e0b',total:0},
      {label:'৩১–৯০',  min:31,max:90,  color:'#ef4444',total:0},
      {label:'৯০+ দিন', min:91,max:9999,color:'#7f1d1d',total:0},
    ];
    getSales().filter(s=>(s.due||0)>0&&s.date).forEach(s=>{
      const days=Math.floor((now-new Date(s.date))/86400000);
      const b=bkts.find(b=>days>=b.min&&days<=b.max);
      if(b) b.total+=(s.due||0);
    });
    const maxT=Math.max(...bkts.map(b=>b.total),1);
    if(bkts.every(b=>b.total===0)) return `<div class="ntd-empty">✅ কোনো বাকি নেই!</div>`;
    return bkts.map(b=>`
      <div class="ntd-aitem">
        <div class="ntd-albl">${b.label}</div>
        <div class="ntd-abar"><div class="ntd-afill" style="width:${b.total/maxT*100}%;background:${b.color}"></div></div>
        <div class="ntd-av" style="color:${b.color}">${bn(b.total)}</div>
      </div>`).join('');
  }

  // ══════════════════════════════════════════════
  //  GLOBAL HOOKS
  // ══════════════════════════════════════════════
  window.ntd_period = function(p) { _period = p; render(); };
  window.ntd_render = function() { render(); };

  // showPage hook — dash page খুললেই render
  const _origSP = window.showPage;
  window.showPage = function(id, isBack) {
    if (typeof _origSP === 'function') _origSP(id, isBack);
    if (id === 'dash' && window.CR === 'admin') {
      setTimeout(render, 200);
    }
  };

  // data update হলে auto refresh
  const _origSync = window.syncGlobals;
  window.syncGlobals = function() {
    if (typeof _origSync === 'function') _origSync();
    const pg = document.getElementById('page-dash');
    if (pg && pg.classList.contains('active') && window.CR === 'admin') {
      clearTimeout(window._ntdTimer);
      window._ntdTimer = setTimeout(render, 400);
    }
  };

  // ══════════════════════════════════════════════
  //  INIT
  // ══════════════════════════════════════════════
  waitForApp(() => {
    injectCSS();
    // dash page যদি এখনই active থাকে
    const pg = document.getElementById('page-dash');
    if (pg && pg.classList.contains('active') && window.CR === 'admin') {
      setTimeout(render, 300);
    }
  });

})();
