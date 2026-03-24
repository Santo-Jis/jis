// ══════════════════════════════════════════════════════════════
//  NovaTEch BD — Worker Dashboard v1.0
//  Design: worker-dashboard-demo.html থেকে
//  Data:   Firebase realtime (window.allSales, window.allUsers...)
//  Worker/Manager login করলে dash page এ automatically দেখাবে
// ══════════════════════════════════════════════════════════════
(function () {
  'use strict';

  // ── app.js ready হওয়ার জন্য wait
  function waitForApp(cb, t = 0) {
    if (window._db && window.CU && window.CR) { cb(); return; }
    if (t > 120) return;
    setTimeout(() => waitForApp(cb, t + 1), 500);
  }

  // ✅ Firebase থেকে সরাসরি data নেওয়ার helper
  async function fbGet(path) {
    try {
      const { get, ref } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js');
      const snap = await get(ref(window._db, path));
      return snap.exists() ? snap.val() : null;
    } catch(e) { console.warn('fbGet error:', path, e.message); return null; }
  }

  // ✅ Firebase realtime listener
  function fbListen(path, cb) {
    import('https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js').then(({ onValue, ref }) => {
      onValue(ref(window._db, path), snap => cb(snap.exists() ? snap.val() : null));
    });
  }

  // ── helpers
  const bn    = n => '৳' + Math.round(n||0).toLocaleString('bn-BD');
  const bnN   = n => Math.round(n||0).toLocaleString('bn-BD');
  const today = () => new Date().toISOString().split('T')[0];

  // ─────────────────────────────────────────
  //  CSS INJECT
  // ─────────────────────────────────────────
  function injectCSS() {
    if (document.getElementById('ntw-css')) return;
    const s = document.createElement('style');
    s.id = 'ntw-css';
    s.textContent = `
#workerDash { padding: 0 0 20px; }
.wd-header {
  background: linear-gradient(160deg, #0f2246 0%, #1a3a6e 45%, #0e4d6e 100%);
  padding: 18px 16px 50px; position: relative; overflow: hidden;
}
.wd-header::before {
  content:''; position:absolute; top:-50px; right:-50px;
  width:180px; height:180px;
  background:radial-gradient(circle,rgba(59,130,246,.2) 0%,transparent 70%);
  border-radius:50%;
}
.wd-header::after {
  content:''; position:absolute; bottom:20px; left:-30px;
  width:140px; height:140px;
  background:radial-gradient(circle,rgba(6,182,212,.1) 0%,transparent 70%);
  border-radius:50%;
}
.wd-h-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; position:relative; z-index:1; }
.wd-logo { font-family:'Sora',sans-serif; font-size:13px; font-weight:800; color:rgba(255,255,255,.75); }
.wd-profile-row { display:flex; align-items:center; gap:12px; position:relative; z-index:1; }
.wd-avatar {
  width:56px; height:56px; border-radius:16px; flex-shrink:0;
  background:linear-gradient(135deg,#f59e0b,#ef4444);
  display:flex; align-items:center; justify-content:center; font-size:24px;
  border:2px solid rgba(255,255,255,.25); box-shadow:0 6px 20px rgba(0,0,0,.3);
  overflow:hidden; position:relative;
}
.wd-avatar img { width:100%; height:100%; object-fit:cover; }
.wd-online { position:absolute; bottom:0; right:0; width:12px; height:12px; background:#10b981; border-radius:50%; border:2px solid #0f2246; }
.wd-pinfo { flex:1; }
.wd-name { font-family:'Sora',sans-serif; font-size:18px; font-weight:800; color:white; line-height:1.1; }
.wd-role { font-size:11px; color:rgba(255,255,255,.6); margin-top:3px; }
.wd-phone { font-size:11px; color:rgba(255,255,255,.45); margin-top:2px; }
.wd-ci-pill {
  background:rgba(16,185,129,.2); border:1.5px solid rgba(16,185,129,.4);
  border-radius:12px; padding:7px 11px; text-align:center; flex-shrink:0;
}
.wd-ci-lbl { font-size:9px; color:rgba(255,255,255,.6); font-weight:700; text-transform:uppercase; }
.wd-ci-time { font-family:'Sora',sans-serif; font-size:15px; font-weight:800; color:#34d399; margin-top:2px; }

/* attendance strip */
.wd-att-strip {
  margin:-28px 13px 0; background:var(--card);
  border:1px solid var(--border-l,rgba(99,179,237,.18));
  border-radius:16px; padding:11px 6px;
  display:flex; position:relative; z-index:2;
  box-shadow:0 8px 28px rgba(0,0,0,.4);
}
.wd-att-item { flex:1; text-align:center; padding:0 4px; }
.wd-att-item+.wd-att-item { border-left:1px solid var(--border); }
.wd-att-num { font-family:'Sora',sans-serif; font-size:17px; font-weight:800; color:var(--text); }
.wd-att-lbl { font-size:9px; color:var(--muted); font-weight:600; margin-top:2px; text-transform:uppercase; }
.wd-att-tag { display:inline-block; margin-top:3px; padding:1px 6px; border-radius:4px; font-size:9px; font-weight:700; background:rgba(16,185,129,.12); color:#34d399; border:1px solid rgba(16,185,129,.22); }

/* period tabs */
.wd-period-tabs { display:flex; gap:6px; overflow-x:auto; padding-bottom:2px; margin-bottom:2px; }
.wd-period-tabs::-webkit-scrollbar { display:none; }
.wd-ptab {
  flex-shrink:0; padding:6px 13px; border-radius:20px; font-size:12px; font-weight:700;
  font-family:'Hind Siliguri',sans-serif; cursor:pointer; border:none;
  background:var(--card); color:var(--muted); border:1px solid var(--border);
  transition:all .18s;
}
.wd-ptab.active {
  background:var(--blue,#3b82f6); color:white; border-color:var(--blue,#3b82f6);
}

/* content */
.wd-content { padding:13px; display:flex; flex-direction:column; gap:11px; }
.wd-sec-hdr { display:flex; align-items:center; justify-content:space-between; margin-bottom:7px; }
.wd-sec-title { font-size:11px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.5px; }
.wd-sec-badge { font-size:10px; font-weight:700; font-family:'Sora',sans-serif; background:rgba(59,130,246,.12); color:var(--blue,#3b82f6); border:1px solid rgba(59,130,246,.22); padding:2px 8px; border-radius:6px; }

/* stat grid */
.wd-stat-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.wd-stat { background:var(--card); border:1px solid var(--border); border-radius:13px; padding:12px; position:relative; overflow:hidden; }
.wd-stat::before { content:''; position:absolute; top:0; left:0; right:0; height:2.5px; border-radius:13px 13px 0 0; }
.ws1::before{background:linear-gradient(90deg,#3b82f6,#06b6d4);}
.ws2::before{background:linear-gradient(90deg,#f59e0b,#fbbf24);}
.ws3::before{background:linear-gradient(90deg,#10b981,#34d399);}
.ws4::before{background:linear-gradient(90deg,#8b5cf6,#a78bfa);}
.ws5::before{background:linear-gradient(90deg,#ef4444,#f87171);}
.wd-stat-full { grid-column:1/-1; }
.wd-stat-ico { width:26px; height:26px; border-radius:7px; display:flex; align-items:center; justify-content:center; font-size:13px; margin-bottom:7px; }
.ws1 .wd-stat-ico{background:rgba(59,130,246,.12);}
.ws2 .wd-stat-ico{background:rgba(245,158,11,.12);}
.ws3 .wd-stat-ico{background:rgba(16,185,129,.12);}
.ws4 .wd-stat-ico{background:rgba(139,92,246,.12);}
.ws5 .wd-stat-ico{background:rgba(239,68,68,.12);}
.wd-stat-lbl { font-size:9px; color:var(--muted); font-weight:600; text-transform:uppercase; letter-spacing:.3px; }
.wd-stat-val { font-family:'Sora',sans-serif; font-size:17px; font-weight:800; margin-top:2px; line-height:1; }
.ws1 .wd-stat-val{color:#3b82f6;} .ws2 .wd-stat-val{color:#f59e0b;}
.ws3 .wd-stat-val{color:#10b981;} .ws4 .wd-stat-val{color:#8b5cf6;}
.ws5 .wd-stat-val{color:#ef4444;}
.wd-stat-sub { font-size:9px; color:var(--muted); margin-top:3px; }

/* mal card */
.wd-mal-card { background:var(--card); border:1px solid var(--border); border-radius:13px; padding:13px; }
.wd-mal-row { display:grid; grid-template-columns:1fr 1fr 1fr; gap:7px; margin-bottom:10px; }
.wd-mal-item { background:var(--surface); border:1px solid var(--border); border-radius:9px; padding:9px 7px; text-align:center; }
.wd-mal-num { font-family:'Sora',sans-serif; font-size:18px; font-weight:800; }
.wd-mal-lbl { font-size:9px; color:var(--muted); font-weight:600; margin-top:2px; text-transform:uppercase; }
.wm-taken .wd-mal-num{color:#3b82f6;} .wm-sold .wd-mal-num{color:#10b981;} .wm-left .wd-mal-num{color:#f59e0b;}
.wd-prod-row { display:flex; align-items:center; gap:8px; background:var(--surface); border:1px solid var(--border); border-radius:9px; padding:8px 10px; margin-bottom:6px; }
.wd-prod-row:last-child { margin-bottom:0; }
.wd-prod-name { flex:1; font-size:12px; color:var(--text); font-weight:600; }
.wd-prod-stats { font-size:10px; display:flex; flex-direction:column; align-items:flex-end; gap:2px; }
.wd-pbar-wrap { width:100%; height:3px; background:var(--border); border-radius:2px; margin-top:4px; overflow:hidden; }
.wd-pbar { height:100%; background:#10b981; border-radius:2px; }

/* replacement card */
.wd-rpl-card { background:var(--card); border:1px solid rgba(139,92,246,.18); border-radius:13px; padding:13px; }
.wd-rpl-item { display:flex; align-items:center; gap:9px; background:var(--surface); border:1px solid var(--border); border-radius:9px; padding:9px 10px; margin-bottom:6px; }
.wd-rpl-item:last-child { margin-bottom:0; }
.wd-rpl-tag { font-size:10px; font-weight:700; padding:2px 8px; border-radius:6px; flex-shrink:0; }
.wrt-in { background:rgba(139,92,246,.12); color:#a78bfa; border:1px solid rgba(139,92,246,.22); }
.wrt-out { background:rgba(16,185,129,.12); color:#34d399; border:1px solid rgba(16,185,129,.22); }
.wd-rpl-total { background:rgba(255,255,255,.03); border:1px solid var(--border); border-radius:9px; padding:10px 12px; margin-top:8px; }
.wd-rpl-trow { display:flex; justify-content:space-between; font-size:11px; padding:4px 0; border-bottom:1px solid var(--border); }
.wd-rpl-trow:last-child { border-bottom:none; padding-top:8px; margin-top:2px; }

/* route banner */
.wd-route-banner {
  background:linear-gradient(135deg,rgba(59,130,246,.1),rgba(6,182,212,.06));
  border:1px solid rgba(59,130,246,.18); border-radius:12px;
  padding:11px 13px; display:flex; align-items:center; gap:11px;
  margin-bottom:9px; cursor:pointer;
}

/* visit item */
.wd-visit { display:flex; align-items:center; gap:9px; background:var(--card); border:1px solid var(--border); border-radius:11px; padding:10px 12px; margin-bottom:7px; cursor:pointer; }
.wd-visit.wv-done { border-color:rgba(16,185,129,.18); }
.wd-visit.wv-pending { border-color:rgba(245,158,11,.18); }
.wd-vnum { width:25px; height:25px; border-radius:7px; display:flex; align-items:center; justify-content:center; font-family:'Sora',sans-serif; font-size:11px; font-weight:800; flex-shrink:0; }
.wv-done .wd-vnum{background:rgba(16,185,129,.12);color:#10b981;}
.wv-pending .wd-vnum{background:rgba(245,158,11,.1);color:#f59e0b;}
.wd-vname { font-size:13px; font-weight:600; color:var(--text); }
.wd-vsub { font-size:10px; color:var(--muted); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.wd-vamt { font-family:'Sora',sans-serif; font-size:13px; font-weight:800; color:var(--text); }
.wd-vtag { display:inline-block; font-size:9px; font-weight:700; padding:2px 7px; border-radius:5px; margin-top:3px; }
.wvt-done{background:rgba(16,185,129,.12);color:#34d399;border:1px solid rgba(16,185,129,.2);}
.wvt-pending{background:rgba(245,158,11,.1);color:#f59e0b;border:1px solid rgba(245,158,11,.18);}
.wvt-rpl{background:rgba(139,92,246,.12);color:#a78bfa;border:1px solid rgba(139,92,246,.2);margin-left:3px;}

/* summary card */
.wd-sum-card {
  background:linear-gradient(135deg,#0a2010,#0f3020);
  border:1px solid rgba(16,185,129,.2); border-radius:14px; padding:14px;
}
.wd-sum-grid { display:grid; grid-template-columns:1fr 1fr; gap:7px; margin-bottom:11px; }
.wd-sum-item { background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.06); border-radius:9px; padding:9px 10px; display:flex; align-items:center; gap:8px; }
.wd-sum-val { font-family:'Sora',sans-serif; font-size:14px; font-weight:800; }
.wsv-b{color:#60a5fa;} .wsv-g{color:#34d399;} .wsv-a{color:#fbbf24;} .wsv-p{color:#a78bfa;}
.wd-sum-total { display:flex; align-items:center; justify-content:space-between; background:rgba(16,185,129,.08); border:1px solid rgba(16,185,129,.18); border-radius:9px; padding:10px 13px; margin-bottom:8px; }
.wd-sum-ok { display:flex; align-items:center; gap:6px; background:rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.06); border-radius:8px; padding:7px 11px; }
.wd-sum-ok-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
    `;
    document.head.appendChild(s);
  }

  // active period — default আজকে
  let _wdPeriod = '1';

  const PERIODS = {
    '1':  { label:'আজ',    days:0 },
    '7':  { label:'৭ দিন', days:7 },
    '30': { label:'১ মাস', days:30 },
    '90': { label:'৩ মাস', days:90 },
  };

  // period অনুযায়ী date range
  function periodSales() {
    const all = myAllSales();
    if (_wdPeriod === '1') return all.filter(s => s.date === today());
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(_wdPeriod));
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return all.filter(s => s.date >= cutoffStr);
  }

  // period label
  function periodLabel() {
    return PERIODS[_wdPeriod]?.label || 'আজ';
  }

  // window expose — tab click এর জন্য
  window._wdSetPeriod = function(p) {
    _wdPeriod = p;
    window._wdPeriod = p; // ✅ app.js থেকে access এর জন্য
    render(); // async — Firebase থেকে fresh data নেবে
    // active tab highlight
    document.querySelectorAll('.wd-ptab').forEach(b => {
      b.classList.toggle('active', b.dataset.p === p);
    });
  };

  // ─────────────────────────────────────────
  //  পুরনো dashboard এর অংশ লুকাই
  // ─────────────────────────────────────────
  function hideOldDash() {
    const old = document.getElementById('oldDashContent');
    if (old) old.style.display = 'none';
  }

  function showOldDash() {
    const old = document.getElementById('oldDashContent');
    if (old) old.style.display = 'block';
  }

  // ─────────────────────────────────────────
  //  DATA HELPERS
  // ─────────────────────────────────────────
  function myTodaySales() {
    return myAllSales().filter(s => s.date === today());
  }

  function myAllSales() {
    // ✅ সরাসরি window.allSales থেকে — সবচেয়ে accurate
    const uid = window.CU?.uid;
    return Object.values(window.allSales || {})
      .filter(s => s.uid === uid)
      .map(s => s);
  }

  function _sc() { return window._sc || { byUid:{}, byShop:{}, arr:[], dueByShop:{}, totalByShop:{} }; }

  function myTodayAtt() {
    const att = Object.values(window.allAttendance || {});
    const t = today();
    return att.find(a => a.uid === window.CU?.uid && (a.date === t) && a.checkIn);
  }

  function myMonthAtt() {
    const now = new Date();
    const month = now.getMonth(), year = now.getFullYear();
    return Object.values(window.allAttendance || {}).filter(a => {
      if (a.uid !== window.CU?.uid) return false;
      const d = new Date(a.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });
  }

  function myDue() {
    // ✅ সরাসরি window.allSales থেকে — _sc bypass
    const uid = window.CU?.uid;
    return Object.values(window.allSales || {})
      .filter(s => s.uid === uid && (s.due || 0) > 0)
      .reduce((a, s) => a + (s.due || 0), 0);
  }

  function myDueShops() {
    const uid = window.CU?.uid;
    return Object.values(window.allSales || {})
      .filter(s => s.uid === uid && (s.due || 0) > 0).length;
  }

  function myPeriodRpl() {
    const all = Object.values(window.allReplacements || {});
    const uid = window.CU?.uid;
    const t = today();

    if (_wdPeriod === '1') {
      return all.filter(r => {
        if (r.uid !== uid && r.addedBy !== uid) return false;
        // date বা ts দিয়ে today check করি
        if (r.date === t) return true;
        if (r.ts) {
          const d = new Date(r.ts).toISOString().split('T')[0];
          return d === t;
        }
        return false;
      });
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(_wdPeriod));
    const cutoffTs = cutoff.getTime();
    const cutoffStr = cutoff.toISOString().split('T')[0];

    return all.filter(r => {
      if (r.uid !== uid && r.addedBy !== uid) return false;
      if (r.ts) return r.ts >= cutoffTs;
      return r.date >= cutoffStr;
    });
  }

  // backward compat
  function myTodayRpl() { return myPeriodRpl(); }

  function myStockTaken() {
    // কর্মীকে আজকে বরাদ্দ করা স্টক
    const alloc = Object.values(window.allStockAlloc || {});
    return alloc.filter(a => a.uid === window.CU?.uid && a.date === today());
  }

  function todayCheckinTime() {
    const att = myTodayAtt();
    if (!att?.checkIn) return null;
    try {
      const d = new Date(att.checkIn);
      if (isNaN(d.getTime())) return null;
      return `${d.getHours()}:${d.getMinutes().toString().padStart(2,'0')}`;
    } catch(e) { return null; }
  }

  function activeRoute() {
    // window.activeRouteId — app.js syncGlobals থেকে আসে
    const routeId = window.activeRouteId;
    if (!routeId) return null;
    return { id: routeId, name: (window.allRoutes || {})[routeId]?.name || '' };
  }

  function todayVisits() {
    const routeId = window.activeRouteId;
    if (!routeId) return { total: 0, done: [], pending: [] };
    const allCusts = Object.entries(window.allCustomers || {}).filter(([, c]) => c.routeId === routeId);
    // আজকের বিক্রয় থেকে visited shopId list
    const visited = myAllSales().filter(s=>s.date===today()).map(s => s.shopId).filter(Boolean);
    const done = allCusts.filter(([id]) => visited.includes(id));
    const pending = allCusts.filter(([id]) => !visited.includes(id));
    return { total: allCusts.length, done, pending };
  }

  // ─────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────
  async function render() {
    if (window.CR !== 'worker') return;
    const wrap = document.getElementById('workerDash');
    if (!wrap) return;
    wrap.style.display = 'block';
    hideOldDash();

    // ✅ Firebase থেকে fresh data নিই — Worker শুধু নিজের sales পাবে
    try {
      const { get, ref, query, orderByChild, equalTo } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js');
      const myUid = window.CU?.uid;

      // Worker: নিজের uid দিয়ে query, পুরো sales node নয়
      const salesSnap = await get(query(ref(window._db,'sales'), orderByChild('uid'), equalTo(myUid)));
      const freshSales = salesSnap.exists() ? salesSnap.val() : null;

      const freshRpl = await fbGet('replacements');

      if (freshSales) {
        window.allSales = freshSales;
        // _sc.byUid manually update — due calculation এর জন্য
        if (window._sc) {
          window._sc.byUid = {};
          Object.entries(freshSales).forEach(([id, s]) => {
            if (!s || !s.uid) return;
            if (!window._sc.byUid[s.uid]) window._sc.byUid[s.uid] = [];
            window._sc.byUid[s.uid].push({...s, _id:id});
          });
        }
        // computeSalesCache expose হলে call করি
        if (typeof window.computeSalesCache === 'function') window.computeSalesCache();
      }
      window.allReplacements = freshRpl || {};
    } catch(e) { console.warn('Dashboard fresh fetch:', e.message); }

    const sal       = periodSales(); // ✅ period অনুযায়ী
    const totalSale = sal.reduce((a, s) => a + (s.total || 0), 0);
    // ✅ নগদ হিসাব:
    // paid = পুরো টাকা নগদ
    // partial = কিছু নগদ কিছু বাকি → নগদ অংশ = total - due
    // due = পুরো বাকি → নগদ ০
    const totalCash = sal.reduce((a, s) => {
      if (s.payStatus === 'paid' || s.due === 0) return a + (s.total || 0);
      if (s.payStatus === 'partial') return a + ((s.total || 0) - (s.due || 0));
      return a; // due — নগদ নেই
    }, 0);
    const totalDue = sal.filter(s => s.due > 0).reduce((a, s) => a + (s.due || 0), 0);
    const ciTime    = todayCheckinTime();
    const monAtt    = myMonthAtt();
    const late      = monAtt.filter(a => a.isLate).length;
    const leaves    = (window.allSalaries || {})[window.CU?.uid]?.leaveDays || 0;
    const visits    = todayVisits();
    const route     = activeRoute();
    const mySal     = (window.allSalaries || {})[window.CU?.uid] || {};
    const myDueAmt  = myDue();
    const myDueCnt  = myDueShops();
    const rplSales  = myPeriodRpl();
    // ✅ replacements collection structure: retTotal, givTotal, diff
    const rplTotal  = rplSales.reduce((a, r) => a + (r.diff || 0), 0);
    const rplRetAmt = rplSales.reduce((a, r) => a + (r.retTotal || 0), 0);
    const rplGivAmt = rplSales.reduce((a, r) => a + (r.givTotal || 0), 0);
    // ✅ মোট পিস count — প্রতিটি record এর retItems এর qty যোগ
    const rplRetPcs = rplSales.reduce((a, r) => a + (r.retItems||[]).reduce((b,i)=>b+(i.qty||0),0), 0);
    const rplGivPcs = rplSales.reduce((a, r) => a + (r.givItems||[]).reduce((b,i)=>b+(i.qty||0),0), 0);

    // স্টক হিসাব — stock allocation থেকে
    const taken = myStockTaken();
    const takenTotal  = taken.reduce((a, t) => a + (t.qty || 0), 0);
    const soldTotal   = sal.reduce((a, s) => a + (s.qty || 0), 0);
    const leftTotal   = Math.max(takenTotal - soldTotal, 0);

    // মাসিক টার্গেট
    const target   = parseInt(mySal.monthlyTarget || 0);
    const thisMonth = (window._salesCache?.byUid?.[window.CU?.uid] || [])
      .filter(s => s.date?.startsWith(new Date().toISOString().slice(0,7)))
      .reduce((a, s) => a + (s.total || 0), 0);
    const targetPct = target > 0 ? Math.min(Math.round(thisMonth / target * 100), 100) : 0;

    // হিসাব মিলেছে কিনা
    const balanced = takenTotal > 0 && (soldTotal + leftTotal) === takenTotal;

    wrap.innerHTML = `

    <!-- HEADER -->
    <div class="wd-header">
      <div class="wd-h-top">
        <div class="wd-logo">📒 NovaTEch BD</div>
        <div style="display:flex;gap:7px;">
          <div style="width:30px;height:30px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;" onclick="window.showPage&&showPage('profile')">⚙️</div>
        </div>
      </div>
      <div class="wd-profile-row">
        <div class="wd-avatar">
          ${window.CU?.photoURL ? `<img src="${window.CU.photoURL}">` : '👷'}
          <div class="wd-online"></div>
        </div>
        <div class="wd-pinfo">
          <div class="wd-name">${window.CN || 'কর্মী'}</div>
          <div class="wd-role">🏷️ ${window.CR === 'worker' ? 'সেলস রিপ্রেজেন্টেটিভ' : 'ম্যানেজার'}${route ? ' · ' + route.name : ''}</div>
          <div class="wd-phone">${window.CU?.phone || ''}</div>
        </div>
        ${ciTime ? `
        <div class="wd-ci-pill">
          <div class="wd-ci-lbl">✅ চেক-ইন</div>
          <div class="wd-ci-time">${ciTime}</div>
        </div>` : `
        <div class="wd-ci-pill" onclick="window.showPage&&showPage('att')" style="cursor:pointer;background:rgba(239,68,68,.15);border-color:rgba(239,68,68,.3);">
          <div class="wd-ci-lbl" style="color:#f87171;">চেক-ইন</div>
          <div class="wd-ci-time" style="color:#f87171;font-size:12px;">বাকি</div>
        </div>`}
      </div>
    </div>

    <!-- ATTENDANCE STRIP -->
    <div class="wd-att-strip">
      <div class="wd-att-item">
        <div class="wd-att-num">${bnN(monAtt.filter(a=>a.checkIn).length)}</div>
        <div class="wd-att-lbl">উপস্থিত</div>
        <div class="wd-att-tag">এই মাস</div>
      </div>
      <div class="wd-att-item">
        <div class="wd-att-num">${bnN(late)}</div>
        <div class="wd-att-lbl">দেরি</div>
      </div>
      <div class="wd-att-item">
        <div class="wd-att-num">${bnN(monAtt.filter(a=>a.leaveType).length)}</div>
        <div class="wd-att-lbl">ছুটি নেওয়া</div>
      </div>
      <div class="wd-att-item">
        <div class="wd-att-num">${bnN(leaves)}</div>
        <div class="wd-att-lbl">বাকি ছুটি</div>
      </div>
    </div>

    <!-- CONTENT -->
    <div class="wd-content">

      <!-- পারফরম্যান্স — period tabs -->
      <div>
        <div class="wd-period-tabs">
          ${Object.entries(PERIODS).map(([k,v])=>`
            <button class="wd-ptab${_wdPeriod===k?' active':''}" data-p="${k}" onclick="window._wdSetPeriod('${k}')">${v.label}</button>
          `).join('')}
        </div>
        <div class="wd-sec-hdr" style="margin-top:8px;">
          <div class="wd-sec-title">📅 পারফরম্যান্স</div>
          <div class="wd-sec-badge">${periodLabel()}</div>
        </div>
        <div class="wd-stat-grid">
          <div class="wd-stat ws1">
            <div class="wd-stat-ico">💰</div>
            <div class="wd-stat-lbl">আজকের বিক্রয়</div>
            <div class="wd-stat-val">${bn(totalSale)}</div>
            <div class="wd-stat-sub">${bnN(sal.length)}টি বিক্রয়</div>
          </div>
          <div class="wd-stat ws2">
            <div class="wd-stat-ico">💵</div>
            <div class="wd-stat-lbl">নগদ সংগ্রহ</div>
            <div class="wd-stat-val">${bn(totalCash)}</div>
            <div class="wd-stat-sub">বাকি ${bn(totalDue)}</div>
          </div>
          <div class="wd-stat ws3">
            <div class="wd-stat-ico">🏪</div>
            <div class="wd-stat-lbl">ভিজিট করা</div>
            <div class="wd-stat-val">${bnN(visits.done.length)}/${bnN(visits.total)}</div>
            <div class="wd-stat-sub">${bnN(visits.pending.length)}টি বাকি</div>
          </div>
          <div class="wd-stat ws4">
            <div class="wd-stat-ico">🔄</div>
            <div class="wd-stat-lbl">রিপ্লেসমেন্ট</div>
            <div class="wd-stat-val">${bn(Math.abs(rplTotal))}</div>
            <div class="wd-stat-sub">${bnN(rplSales.length)}টি আজকে</div>
          </div>
          <div class="wd-stat ws5 wd-stat-full">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div>
                <div class="wd-stat-ico" style="margin-bottom:5px;">🏦</div>
                <div class="wd-stat-lbl">মার্কেটে মোট বাকি (আমার)</div>
                <div class="wd-stat-val">${bn(myDueAmt)}</div>
                <div class="wd-stat-sub">${bnN(myDueCnt)}টি দোকানে বাকি</div>
              </div>
              ${targetPct > 0 ? `
              <div style="text-align:right;">
                <div style="font-size:10px;color:var(--muted);margin-bottom:4px;">মাসিক টার্গেট</div>
                <div style="font-family:'Sora',sans-serif;font-size:20px;font-weight:800;color:#ef4444;">${bnN(targetPct)}%</div>
                <div style="font-size:10px;color:var(--muted);">${bn(thisMonth)} / ${bn(target)}</div>
              </div>` : ''}
            </div>
          </div>
        </div>
      </div>

      <!-- মাল হিসাব -->
      ${takenTotal > 0 ? `
      <div class="wd-mal-card">
        <div class="wd-sec-hdr">
          <div class="wd-sec-title">📦 মাল হিসাব</div>
          <div style="font-size:10px;color:var(--muted);">সকালে নেওয়া → এখন পর্যন্ত</div>
        </div>
        <div class="wd-mal-row">
          <div class="wd-mal-item wm-taken">
            <div class="wd-mal-num">${bnN(takenTotal)}</div>
            <div class="wd-mal-lbl">নেওয়া (পিস)</div>
          </div>
          <div class="wd-mal-item wm-sold">
            <div class="wd-mal-num">${bnN(soldTotal)}</div>
            <div class="wd-mal-lbl">বিক্রি (পিস)</div>
          </div>
          <div class="wd-mal-item wm-left">
            <div class="wd-mal-num">${bnN(leftTotal)}</div>
            <div class="wd-mal-lbl">হাতে (পিস)</div>
          </div>
        </div>
        ${taken.map(t => {
          const prod = (window.allProducts || {})[t.productId] || {};
          const soldQty = sal.filter(s => s.productId === t.productId).reduce((a,s)=>a+(s.qty||0),0);
          const pct = t.qty > 0 ? Math.round(soldQty/t.qty*100) : 0;
          return `
          <div class="wd-prod-row">
            <div style="font-size:14px;">📦</div>
            <div class="wd-prod-name">${prod.name || t.productId}</div>
            <div class="wd-prod-stats">
              <div style="font-size:10px;color:var(--muted);">নেওয়া: <b style="color:#3b82f6;">${bnN(t.qty)}</b></div>
              <div style="font-size:10px;">বিক্রি: <b style="color:#10b981;">${bnN(soldQty)}</b> · হাতে: <b style="color:#f59e0b;">${bnN(Math.max(t.qty-soldQty,0))}</b></div>
            </div>
          </div>
          <div class="wd-pbar-wrap" style="margin:-3px 0 5px 22px;">
            <div class="wd-pbar" style="width:${pct}%"></div>
          </div>`;
        }).join('')}
      </div>` : ''}

      <!-- রিপ্লেসমেন্ট -->
      ${rplSales.length > 0 ? `
      <div class="wd-rpl-card">
        <div class="wd-sec-hdr">
          <div class="wd-sec-title">🔄 রিপ্লেসমেন্ট</div>
          <div class="wd-sec-badge">আজকে ${bnN(rplSales.length)}টি</div>
        </div>
        <div style="font-size:9px;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:5px;">📥 ফেরত এনেছি</div>
        ${rplSales.map(r => {
          // প্রতিটি ফেরত পণ্য আলাদা দেখাই
          const retRows = (r.retItems||[]).map(item=>`
            <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid var(--border);">
              <div style="font-size:11px;color:var(--text);">${item.prodName||''} × ${bnN(item.qty||0)}</div>
              <div style="font-size:11px;font-weight:700;color:#a78bfa;">${bn((item.qty||0)*(item.price||0))}</div>
            </div>`).join('');
          const givRows = (r.givItems||[]).map(item=>`
            <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid var(--border);">
              <div style="font-size:11px;color:var(--text);">${item.prodName||''} × ${bnN(item.qty||0)}</div>
              <div style="font-size:11px;font-weight:700;color:#34d399;">${bn((item.qty||0)*(item.price||0))}</div>
            </div>`).join('');
          return `
          <div class="wd-rpl-item" style="flex-direction:column;align-items:stretch;gap:6px;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div style="font-size:12px;font-weight:700;color:var(--text);">${r.shopName||''}</div>
              <div class="wd-rpl-tag ${(r.diff||0)>0?'wrt-out':'wrt-in'}">${(r.diff||0)>0?'বাকি আছে':'সমান'}</div>
            </div>
            ${retRows ? `<div style="font-size:10px;font-weight:700;color:#a78bfa;margin-bottom:2px;">📥 ফেরত নিলাম</div>${retRows}` : ''}
            ${givRows ? `<div style="font-size:10px;font-weight:700;color:#34d399;margin-top:4px;margin-bottom:2px;">📤 দিলাম</div>${givRows}` : ''}
            <div style="display:flex;justify-content:space-between;padding-top:4px;">
              <div style="font-size:10px;color:var(--muted);">মোট ফেরত</div>
              <div style="font-size:12px;font-weight:800;color:#a78bfa;">${bn(r.retTotal||0)}</div>
            </div>
          </div>`;
        }).join('')}
        <div class="wd-rpl-total">
          <div class="wd-rpl-trow">
            <span style="color:var(--muted);font-size:11px;">ফেরত পাওয়া মোট</span>
            <span style="color:#a78bfa;font-weight:700;">${bn(rplRetAmt)}</span>
          </div>
          <div class="wd-rpl-trow">
            <span style="color:var(--muted);font-size:11px;">বদলে দেওয়া মোট</span>
            <span style="color:#34d399;font-weight:700;">${bn(rplGivAmt)}</span>
          </div>
          <div class="wd-rpl-trow" style="border-top:1px solid var(--border);">
            <span style="font-weight:700;color:var(--text);font-size:11px;">পার্থক্য</span>
            <span style="font-family:'Sora',sans-serif;font-size:13px;font-weight:800;color:#f59e0b;">${bn(Math.abs(rplTotal))} ${rplTotal > 0 ? 'বাকি' : rplTotal < 0 ? 'ফেরত দেওয়ার' : '✓ সমান'}</span>
          </div>
        </div>
      </div>` : ''}

      <!-- রুট ও ভিজিট -->
      <div>
        <div class="wd-sec-hdr">
          <div class="wd-sec-title">🗺️ আজকের রুট</div>
          <div class="wd-sec-link" style="font-size:11px;color:#3b82f6;cursor:pointer;" onclick="window.showPage&&showPage('sale')">ম্যাপ →</div>
        </div>
        ${route ? `
        <div class="wd-route-banner" onclick="window.showPage&&showPage('sale')">
          <div style="font-size:22px;">🗺️</div>
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:700;color:var(--text);">${route.name}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px;">${bnN(visits.total)}টি দোকান · ${bnN(visits.done.length)}টি ভিজিট · ${bnN(visits.pending.length)}টি বাকি</div>
          </div>
          <div style="font-size:18px;color:#3b82f6;">›</div>
        </div>` : `
        <div style="background:var(--card);border:1px dashed var(--border);border-radius:12px;padding:16px;text-align:center;color:var(--muted);font-size:13px;margin-bottom:8px;cursor:pointer;" onclick="window.showPage&&showPage('sale')">
          🗺️ রুট শুরু করুন
        </div>`}

        ${visits.total > 0 ? `
        <div class="wd-sec-hdr" style="margin-top:4px;">
          <div class="wd-sec-title">🏪 ভিজিট তালিকা</div>
          <div class="wd-sec-badge">${bnN(visits.done.length)}/${bnN(visits.total)} সম্পন্ন</div>
        </div>
        ${visits.done.slice(0,3).map(([id,c],i) => {
          const s = myTodaySales().find(s=>s.shopId===id);
          const hasRpl = s?.replacement;
          return `
          <div class="wd-visit wv-done" onclick="window.quickVisit&&quickVisit('${id}')">
            <div class="wd-vnum">${bnN(i+1)}</div>
            <div style="flex:1;min-width:0;">
              <div class="wd-vname">${c.name}</div>
              <div class="wd-vsub">${s?s.product+' × '+bnN(s.qty)+' পিস':''}</div>
            </div>
            <div style="text-align:right;flex-shrink:0;">
              <div class="wd-vamt">${s?bn(s.total):'—'}</div>
              <span class="wd-vtag wvt-done">✓ সম্পন্ন</span>
              ${hasRpl?'<span class="wd-vtag wvt-rpl">🔄 রিপ্লে</span>':''}
            </div>
          </div>`;
        }).join('')}
        ${visits.pending.slice(0,2).map(([id,c],i) => `
          <div class="wd-visit wv-pending" onclick="window.quickVisit&&quickVisit('${id}')">
            <div class="wd-vnum">${bnN(visits.done.length+i+1)}</div>
            <div style="flex:1;min-width:0;">
              <div class="wd-vname">${c.name}</div>
              <div class="wd-vsub">⏳ এখনো ভিজিট হয়নি</div>
            </div>
            <div style="text-align:right;flex-shrink:0;">
              <div class="wd-vamt" style="color:var(--muted);">—</div>
              <span class="wd-vtag wvt-pending">বাকি</span>
            </div>
          </div>`).join('')}` : ''}
      </div>

      <!-- দিন শেষের হিসাব -->
      <div class="wd-sum-card">
        <div class="wd-sec-hdr">
          <div class="wd-sec-title" style="color:rgba(255,255,255,.5);">📋 দিন শেষের হিসাব</div>
          <div style="font-size:10px;background:rgba(16,185,129,.12);color:#34d399;padding:2px 9px;border-radius:6px;font-weight:600;border:1px solid rgba(16,185,129,.2);">
            ${new Date().toLocaleTimeString('bn-BD',{hour:'2-digit',minute:'2-digit'})}
          </div>
        </div>
        <div class="wd-sum-grid">
          <div class="wd-sum-item">
            <div style="font-size:16px;">📦</div>
            <div>
              <div style="font-size:9px;color:rgba(255,255,255,.4);font-weight:600;text-transform:uppercase;">মোট নেওয়া</div>
              <div class="wd-sum-val wsv-b">${bnN(takenTotal)} পিস</div>
            </div>
          </div>
          <div class="wd-sum-item">
            <div style="font-size:16px;">🛍️</div>
            <div>
              <div style="font-size:9px;color:rgba(255,255,255,.4);font-weight:600;text-transform:uppercase;">মোট বিক্রি</div>
              <div class="wd-sum-val wsv-g">${bnN(soldTotal)} পিস</div>
            </div>
          </div>
          <div class="wd-sum-item">
            <div style="font-size:16px;">🔙</div>
            <div>
              <div style="font-size:9px;color:rgba(255,255,255,.4);font-weight:600;text-transform:uppercase;">হাতে ফেরত</div>
              <div class="wd-sum-val wsv-a">${bnN(leftTotal)} পিস</div>
            </div>
          </div>
          <div class="wd-sum-item">
            <div style="font-size:16px;">🔄</div>
            <div>
              <div style="font-size:9px;color:rgba(255,255,255,.4);font-weight:600;text-transform:uppercase;">রিপ্লেসমেন্ট</div>
              <div class="wd-sum-val wsv-p">${bnN(rplRetPcs)} পিস</div>
            </div>
          </div>
        </div>
        <div class="wd-sum-total">
          <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,.7);">💵 মোট নগদ সংগ্রহ</div>
          <div style="font-family:'Sora',sans-serif;font-size:17px;font-weight:800;color:#34d399;">${bn(totalCash)}</div>
        </div>
        <div class="wd-sum-ok">
          <div class="wd-sum-ok-dot" style="background:${balanced?'#34d399':'#f59e0b'};"></div>
          <div style="font-size:11px;color:rgba(255,255,255,.45);">নেওয়া মাল = বিক্রি + ফেরত · হিসাব</div>
          <div style="font-size:11px;font-weight:700;color:${balanced?'#34d399':'#f59e0b'};margin-left:auto;">${balanced?'✓ মিলেছে':'⏳ চলছে'}</div>
        </div>
      </div>

    </div><!-- /wd-content -->
    `;
  }

  // ─────────────────────────────────────────
  //  showPage ও syncGlobals patch
  // ─────────────────────────────────────────
  const _oSP = window.showPage;
  window.showPage = function (id, isBack) {
    if (typeof _oSP === 'function') _oSP(id, isBack);
    if (id === 'dash' && window.CR === 'worker') setTimeout(() => render(), 200);
  };

  const _oSync = window.syncGlobals;
  window.syncGlobals = function () {
    if (typeof _oSync === 'function') _oSync();
    const pg = document.getElementById('page-dash');
    if (pg && pg.classList.contains('active') && window.CR === 'worker') {
      clearTimeout(window._ntwT);
      window._ntwT = setTimeout(() => render(), 350);
    }
  };

  // ─────────────────────────────────────────
  //  INIT
  // ─────────────────────────────────────────
  waitForApp(() => {
    injectCSS();
    const pg = document.getElementById('page-dash');
    if (pg && pg.classList.contains('active') && window.CR === 'worker') {
      setTimeout(() => render(), 300);
    }
  });

})();
