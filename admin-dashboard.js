// ══════════════════════════════════════════════════════════════
//  NovaTEch BD — Admin Dashboard v4.0 FINAL
//  Design: dashboard-preview.html থেকে হুবহু
//  Data:   Firebase realtime (window.allSales, window.allUsers...)
//  Admin login করলে dash page এ automatically দেখাবে
// ══════════════════════════════════════════════════════════════
(function () {
  'use strict';

  // ── wait for app.js ──
  function waitForApp(cb, t = 0) {
    if (window._db && window.CU && window.CR) { cb(); return; }
    if (t > 120) return;
    setTimeout(() => waitForApp(cb, t + 1), 250);
  }

  const bn    = n => '৳' + Math.round(n||0).toLocaleString('bn-BD');
  const bnN   = n => Math.round(n||0).toLocaleString('bn-BD');
  const today = () => new Date().toISOString().split('T')[0];
  const fmt   = d => new Date(d).toLocaleDateString('bn-BD', {day:'numeric', month:'short'});

  let _P = '7'; // current period

  // ─────────────────────────────────────────
  //  INJECT CSS (exact from preview)
  // ─────────────────────────────────────────
  function injectCSS() {
    if (document.getElementById('ntd4-css')) return;
    const s = document.createElement('style');
    s.id = 'ntd4-css';
    s.textContent = `:root {
  --bg:      #070c18;
  --surf:    #0d1424;
  --surf2:   #111e33;
  --surf3:   #162038;
  --border:  rgba(99,179,237,0.10);
  --border2: rgba(99,179,237,0.18);
  --blue:    #3b82f6;
  --cyan:    #06b6d4;
  --purple:  #8b5cf6;
  --green:   #10b981;
  --amber:   #f59e0b;
  --red:     #ef4444;
  --pink:    #ec4899;
  --text:    #f1f5f9;
  --text2:   #94a3b8;
  --text3:   #475569;
  --text4:   #2d3f5c;
  --glow-b:  rgba(59,130,246,0.15);
  --glow-p:  rgba(139,92,246,0.15);
  --r:       16px;
  --r2:      12px;
  --r3:      10px;
}

*{margin:0;padding:0;box-sizing:border-box;}

body {
  font-family:'Hind Siliguri',sans-serif;
  background:var(--bg);
  color:var(--text);
  min-height:100vh;
  overflow-x:hidden;
}

/* ── Background mesh ── */
body::before {
  content:'';
  position:fixed;
  inset:0;
  background:
    radial-gradient(ellipse 80% 50% at 20% 10%, rgba(59,130,246,0.06) 0%, transparent 60%),
    radial-gradient(ellipse 60% 40% at 80% 80%, rgba(139,92,246,0.05) 0%, transparent 60%),
    radial-gradient(ellipse 40% 30% at 50% 50%, rgba(6,182,212,0.03) 0%, transparent 60%);
  pointer-events:none;
  z-index:0;
}

.wrap { position:relative; z-index:1; max-width:430px; margin:0 auto; padding:0 0 80px; }

/* ══ TOPBAR ══ */
.topbar {
  position:sticky; top:0; z-index:100;
  background:rgba(7,12,24,0.92);
  backdrop-filter:blur(20px);
  -webkit-backdrop-filter:blur(20px);
  border-bottom:1px solid var(--border);
  padding:12px 16px;
  display:flex; align-items:center; gap:10px;
}
.topbar-logo {
  font-family:'Syne',sans-serif;
  font-size:16px; font-weight:800;
  background:linear-gradient(135deg,#60a5fa,#a78bfa,#34d399);
  -webkit-background-clip:text; -webkit-text-fill-color:transparent;
  flex-shrink:0;
}
.topbar-tabs {
  display:flex; gap:2px;
  background:var(--surf2);
  padding:3px; border-radius:10px;
  overflow-x:auto; scrollbar-width:none; flex:1;
}
.topbar-tabs::-webkit-scrollbar{display:none}
.ttab {
  padding:4px 10px; border-radius:8px; font-size:10px; font-weight:600;
  cursor:pointer; color:var(--text3); white-space:nowrap;
  transition:all .2s; border:none; background:none;
  font-family:'Hind Siliguri',sans-serif; flex-shrink:0;
}
.ttab.on {
  background:linear-gradient(135deg,rgba(59,130,246,0.25),rgba(139,92,246,0.15));
  color:#93c5fd;
  box-shadow:inset 0 0 0 1px rgba(59,130,246,0.3);
}
.live-pill {
  display:flex; align-items:center; gap:5px;
  background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.25);
  color:var(--green); font-size:10px; font-weight:700;
  padding:4px 10px; border-radius:20px; flex-shrink:0;
}
.live-dot {
  width:6px; height:6px; background:var(--green);
  border-radius:50%; animation:livePulse 2s infinite;
}
@keyframes livePulse{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(16,185,129,.4)}50%{opacity:.5;box-shadow:0 0 0 4px rgba(16,185,129,0)}}

/* ══ CONTENT ══ */
.content { padding:14px; display:flex; flex-direction:column; gap:14px; }

/* ══ STAT CARDS ══ */
.stat-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }

.stat-card {
  background:var(--surf);
  border:1px solid var(--border);
  border-radius:var(--r);
  padding:15px;
  position:relative; overflow:hidden;
  cursor:default;
  transition:transform .25s, border-color .25s, box-shadow .25s;
  animation:fadeUp .5s ease both;
}
.stat-card:hover {
  transform:translateY(-3px);
  border-color:var(--border2);
  box-shadow:0 8px 32px rgba(0,0,0,0.4);
}
/* Glow orb */
.stat-card::before {
  content:''; position:absolute;
  top:-10px; right:-10px;
  width:90px; height:90px;
  border-radius:50%; filter:blur(35px); opacity:.18;
  transition:opacity .3s;
}
.stat-card:hover::before{opacity:.28}
/* Shimmer line */
.stat-card::after {
  content:''; position:absolute;
  top:0; left:0; right:0; height:1px;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent);
}
.sc-blue::before   {background:var(--blue)}
.sc-green::before  {background:var(--green)}
.sc-purple::before {background:var(--purple)}
.sc-cyan::before   {background:var(--cyan)}

.stat-card:nth-child(1){animation-delay:.06s}
.stat-card:nth-child(2){animation-delay:.12s}
.stat-card:nth-child(3){animation-delay:.18s}
.stat-card:nth-child(4){animation-delay:.24s}

.sico {
  width:36px; height:36px; border-radius:10px;
  display:flex; align-items:center; justify-content:center;
  font-size:16px; margin-bottom:11px;
}
.sc-blue .sico   {background:rgba(59,130,246,.15)}
.sc-green .sico  {background:rgba(16,185,129,.15)}
.sc-purple .sico {background:rgba(139,92,246,.15)}
.sc-cyan .sico   {background:rgba(6,182,212,.15)}

.slbl {font-size:10px;color:var(--text3);font-weight:600;margin-bottom:4px;letter-spacing:.3px}
.sval {
  font-family:'Syne',sans-serif;
  font-size:20px; font-weight:800;
  color:var(--text); line-height:1; margin-bottom:7px;
}
.schg {font-size:10px;font-weight:600;display:flex;align-items:center;gap:3px}
.schg.up{color:var(--green)} .schg.dn{color:var(--red)} .schg.n{color:var(--text3)}

/* ══ MINI ROW ══ */
.mini-row {display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
.mini-box {
  background:var(--surf);
  border:1px solid var(--border);
  border-radius:var(--r2); padding:10px; text-align:center;
  animation:fadeUp .5s ease .3s both;
}
.mini-lbl{font-size:9px;color:var(--text3);font-weight:600;margin-bottom:3px;letter-spacing:.3px}
.mini-val{font-family:'Syne',sans-serif;font-size:16px;font-weight:700}

/* ══ MONTH PROGRESS ══ */
.month-card {
  background:linear-gradient(135deg,var(--surf),var(--surf2));
  border:1px solid var(--border);
  border-radius:var(--r); padding:15px;
  animation:fadeUp .5s .35s ease both;
}
.month-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.month-title{font-size:12px;font-weight:700;color:var(--text)}
.month-badge{font-size:10px;padding:2px 9px;border-radius:20px;background:rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.2);color:#93c5fd;font-weight:600}
.month-bar{height:5px;background:var(--surf3);border-radius:3px;overflow:hidden;margin:0 0 9px}
.month-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--blue),var(--purple));transition:width 1s ease}
.month-meta{display:flex;justify-content:space-between;font-size:10px;color:var(--text3)}
.month-meta span.hi{color:var(--blue);font-weight:700}

/* ══ CARD ══ */
.card {
  background:var(--surf);
  border:1px solid var(--border);
  border-radius:var(--r); padding:15px;
  animation:fadeUp .5s ease both;
}
.card-h {display:flex;align-items:center;justify-content:space-between;margin-bottom:13px}
.card-t {font-size:13px;font-weight:700;color:var(--text);display:flex;align-items:center;gap:6px}
.card-b {font-size:10px;padding:2px 8px;border-radius:20px;background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.2);color:#93c5fd;font-weight:500}
.card-lk{font-size:11px;color:var(--blue);background:none;border:none;cursor:pointer;font-family:'Hind Siliguri',sans-serif}

/* ══ CHART PERIOD PILLS ══ */
.cperiods{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:12px}
.cpt{
  padding:3px 10px;border-radius:6px;font-size:10px;font-weight:600;
  cursor:pointer;color:var(--text3);background:var(--surf2);
  border:1px solid var(--border);transition:all .15s;
  font-family:'Hind Siliguri',sans-serif;
}
.cpt.on{background:rgba(59,130,246,.18);color:#93c5fd;border-color:rgba(59,130,246,.35)}

/* ══ SVG LINE CHART ══ */
.chart-wrap{position:relative;height:170px;overflow:hidden}
.chart-wrap svg{width:100%;height:100%}

/* ══ DONUT + LEGEND ══ */
.donut-row{display:flex;align-items:center;gap:18px}
.donut-leg{display:flex;flex-direction:column;gap:9px;flex:1}
.dleg-item{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text2)}
.dleg-dot{width:8px;height:8px;border-radius:3px;flex-shrink:0}
.dleg-val{margin-left:auto;font-weight:700;font-size:12px}

/* ══ 2-COL ROW ══ */
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px}

/* ══ MINI LIST (Workers / Products) ══ */
.mini-list{display:flex;flex-direction:column;gap:4px}
.mitem{
  display:flex;align-items:center;gap:9px;
  padding:8px;border-radius:10px;
  transition:background .2s;
}
.mitem:hover{background:var(--surf2)}
.mav{
  width:30px;height:30px;border-radius:8px;
  display:flex;align-items:center;justify-content:center;
  font-size:13px;flex-shrink:0;overflow:hidden;
}
.mav img{width:100%;height:100%;object-fit:cover;border-radius:8px}
.minfo{flex:1;min-width:0}
.mname{font-size:11px;font-weight:700;color:var(--text);line-height:1}
.msub{font-size:9px;color:var(--text3);margin-top:1px}
.mbar{height:3px;background:var(--surf3);border-radius:2px;overflow:hidden;margin-top:3px}
.mbar-fill{height:100%;border-radius:2px}
.mval{font-size:11px;font-weight:700;flex-shrink:0}

/* ══ TABLE ══ */
.data-tbl{width:100%;border-collapse:collapse}
.data-tbl th{
  font-size:9px;color:var(--text3);font-weight:700;
  text-transform:uppercase;letter-spacing:.6px;
  padding:6px 8px;text-align:left;
  border-bottom:1px solid rgba(99,179,237,.08);
}
.data-tbl td{
  padding:9px 8px;font-size:11px;color:var(--text2);
  border-bottom:1px solid rgba(99,179,237,.04);
  max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.data-tbl tr:last-child td{border-bottom:none}
.data-tbl tr:hover td{background:rgba(255,255,255,.02);color:var(--text)}
.tag{display:inline-block;padding:2px 7px;border-radius:5px;font-size:10px;font-weight:600}
.tag-p{background:rgba(16,185,129,.1);color:var(--green);border:1px solid rgba(16,185,129,.2)}
.tag-d{background:rgba(239,68,68,.1);color:var(--red);border:1px solid rgba(239,68,68,.2)}
.tag-a{background:rgba(245,158,11,.1);color:var(--amber);border:1px solid rgba(245,158,11,.2)}

/* ══ ROUTE LIST ══ */
.route-item{display:flex;align-items:center;gap:9px;padding:7px 0;border-bottom:1px solid rgba(99,179,237,.04)}
.route-item:last-child{border-bottom:none}
.route-ico{width:26px;height:26px;border-radius:7px;background:rgba(59,130,246,.12);display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0}
.route-info{flex:1;min-width:0}
.route-name{font-size:11px;font-weight:700;color:var(--text)}
.route-sub{font-size:9px;color:var(--text3)}
.route-val{font-size:11px;font-weight:700;color:var(--blue);flex-shrink:0}

/* ══ AGING ══ */
.aging-item{display:flex;align-items:center;gap:9px;margin-bottom:9px}
.aging-lbl{font-size:10px;color:var(--text3);width:62px;flex-shrink:0}
.aging-bar{flex:1;height:7px;background:var(--surf2);border-radius:4px;overflow:hidden}
.aging-fill{height:100%;border-radius:4px;transition:width .8s ease}
.aging-val{font-size:10px;font-weight:700;width:52px;text-align:right;flex-shrink:0}

/* ══ QUICK ACTIONS ══ */
.actions-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.act-btn{
  display:flex;align-items:center;gap:9px;padding:11px;
  background:var(--surf2);
  border:1px solid var(--border);
  border-radius:var(--r2);cursor:pointer;
  transition:all .2s;font-family:'Hind Siliguri',sans-serif;
  text-align:left;width:100%;position:relative;overflow:hidden;
}
.act-btn::before{
  content:'';position:absolute;inset:0;
  background:linear-gradient(135deg,rgba(59,130,246,0.08),transparent);
  opacity:0;transition:opacity .2s;
}
.act-btn:hover{border-color:rgba(59,130,246,.35);transform:translateY(-1px);box-shadow:0 4px 16px rgba(0,0,0,.3)}
.act-btn:hover::before{opacity:1}
.act-btn:active{transform:scale(.97)}
.act-ico{font-size:18px;flex-shrink:0}
.act-lbl{font-size:11px;font-weight:700;color:var(--text)}
.act-sub{font-size:9px;color:var(--text3);margin-top:1px}

/* ══ SEPARATOR ══ */
.sec-label {
  font-size:9px;font-weight:700;color:var(--text4);
  letter-spacing:1.5px;text-transform:uppercase;
  display:flex;align-items:center;gap:8px;
  padding:2px 0;
}
.sec-label::before,.sec-label::after{content:'';flex:1;height:1px;background:var(--border)}

/* ══ EMPTY ══ */
.empty{text-align:center;padding:20px;color:var(--text3);font-size:12px}

/* ══ ANIMATION ══ */
@keyframes fadeUp{
  from{opacity:0;transform:translateY(14px)}
  to{opacity:1;transform:translateY(0)}
}

/* ══ SCROLLBAR ══ */
::-webkit-scrollbar{width:3px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--surf3);border-radius:2px}`;
    document.head.appendChild(s);
  }

  // ─────────────────────────────────────────
  //  DATA
  // ─────────────────────────────────────────
  const aS = () => Object.values(window.allSales    || {});
  const aE = () => Object.values(window.allExpenses || {});
  const aU = () => Object.values(window.allUsers    || {});

  function pSales(p) {
    const a = aS(); if (p === 'all') return a;
    const c = new Date(); c.setDate(c.getDate() - parseInt(p)); c.setHours(0,0,0,0);
    return a.filter(s => new Date(s.date) >= c);
  }
  function prSales(p) {
    if (p === 'all') return [];
    const a = aS(), d = parseInt(p);
    const e = new Date(); e.setDate(e.getDate()-d); e.setHours(23,59,59,999);
    const s = new Date(); s.setDate(s.getDate()-d*2); s.setHours(0,0,0,0);
    return a.filter(x => { const dt = new Date(x.date); return dt>=s && dt<=e; });
  }
  function chg(cur, prv) {
    if (!prv) return `<div class="schg n">— তুলনা নেই</div>`;
    const p = ((cur-prv)/prv*100).toFixed(1);
    if (+p > 0) return `<div class="schg up">▲ ${p}% বেশি</div>`;
    if (+p < 0) return `<div class="schg dn">▼ ${Math.abs(p)}% কম</div>`;
    return `<div class="schg n">→ একই</div>`;
  }

  // ─────────────────────────────────────────
  //  SVG LINE CHART (real data)
  // ─────────────────────────────────────────
  function buildChart(period) {
    const a = aS(); let pts = [], lbls = [];
    const p = parseInt(period);

    if (period === '1') {
      for (let h=0; h<24; h+=2) {
        const td=today();
        pts.push(a.filter(s=>s.date===td&&new Date(s.ts||0).getHours()>=h&&new Date(s.ts||0).getHours()<h+2).reduce((x,s)=>x+(s.total||0),0));
        lbls.push(h+':০০');
      }
    } else if (p <= 30) {
      for (let i=p-1; i>=0; i--) {
        const d=new Date(); d.setDate(d.getDate()-i);
        const ds=d.toISOString().split('T')[0];
        pts.push(a.filter(s=>s.date===ds).reduce((x,s)=>x+(s.total||0),0));
        lbls.push(fmt(ds));
      }
    } else if (p <= 90) {
      const w=Math.ceil(p/7);
      for (let i=w-1; i>=0; i--) {
        const ws=new Date(); ws.setDate(ws.getDate()-i*7-6); ws.setHours(0,0,0,0);
        const we=new Date(); we.setDate(we.getDate()-i*7); we.setHours(23,59,59,999);
        pts.push(a.filter(s=>{const d=new Date(s.date);return d>=ws&&d<=we;}).reduce((x,s)=>x+(s.total||0),0));
        lbls.push(fmt(ws));
      }
    } else {
      const m=p===180?6:12; const now=new Date();
      for (let i=m-1; i>=0; i--) {
        const d=new Date(now.getFullYear(),now.getMonth()-i,1);
        const mk=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        pts.push(a.filter(s=>s.date?.startsWith(mk)).reduce((x,s)=>x+(s.total||0),0));
        lbls.push(d.toLocaleDateString('bn-BD',{month:'short'}));
      }
    }

    const n=pts.length; const W=400,H=130,PAD=10;
    const maxV=Math.max(...pts,1);
    const coords=pts.map((v,i)=>({
      x:PAD+(i/(n-1||1))*(W-PAD*2),
      y:H-PAD-(v/maxV)*(H-PAD*2)
    }));

    let path=`M${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
    for (let i=1; i<coords.length; i++) {
      const c1x=(coords[i-1].x+(coords[i].x-coords[i-1].x)/3).toFixed(1);
      const c2x=(coords[i].x-(coords[i].x-coords[i-1].x)/3).toFixed(1);
      path+=` C${c1x},${coords[i-1].y.toFixed(1)} ${c2x},${coords[i].y.toFixed(1)} ${coords[i].x.toFixed(1)},${coords[i].y.toFixed(1)}`;
    }
    const fill=path+` L${coords[n-1].x.toFixed(1)},${H} L${coords[0].x.toFixed(1)},${H} Z`;

    const step=Math.ceil(n/5);
    const lblHtml=lbls.map((l,i)=>{
      if(i===0||i===n-1||i%step===0){
        const x=PAD+(i/(n-1||1))*(W-PAD*2);
        return `<text x="${x.toFixed(1)}" y="${H+14}" text-anchor="middle" fill="#475569" font-size="8.5" font-family="Hind Siliguri">${l}</text>`;
      }return '';
    }).join('');

    const dots=coords.map((c,i)=>{
      if(i===n-1) return `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="4.5" fill="white" stroke="#3b82f6" stroke-width="2"/>`;
      if(n<=14)   return `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="2.5" fill="#3b82f6"/>`;
      return '';
    }).join('');

    return `<div class="chart-wrap">
      <svg viewBox="0 0 ${W} ${H+20}" preserveAspectRatio="none" style="width:100%;height:100%">
        <defs>
          <linearGradient id="ntd4g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <line x1="0" y1="${(H*.25).toFixed(1)}" x2="${W}" y2="${(H*.25).toFixed(1)}" stroke="rgba(99,179,237,0.06)" stroke-width="1"/>
        <line x1="0" y1="${(H*.5).toFixed(1)}"  x2="${W}" y2="${(H*.5).toFixed(1)}"  stroke="rgba(99,179,237,0.06)" stroke-width="1"/>
        <line x1="0" y1="${(H*.75).toFixed(1)}" x2="${W}" y2="${(H*.75).toFixed(1)}" stroke="rgba(99,179,237,0.06)" stroke-width="1"/>
        <path d="${fill}" fill="url(#ntd4g)"/>
        <path d="${path}" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        ${dots}${lblHtml}
      </svg>
    </div>`;
  }

  // ─────────────────────────────────────────
  //  DONUT (real data + %)
  // ─────────────────────────────────────────
  function buildDonut(profit, exp, due) {
    const total = profit + exp + due || 1;
    const C = 239;
    const pp=profit/total*C, ep=exp/total*C, dp=due/total*C;
    const pPct=Math.round(profit/total*100);
    const ePct=Math.round(exp/total*100);
    const dPct=Math.round(due/total*100);

    return `<div class="donut-row">
      <svg width="90" height="90" viewBox="0 0 100 100" style="flex-shrink:0">
        <circle cx="50" cy="50" r="38" fill="none" stroke="#162038" stroke-width="15"/>
        <circle cx="50" cy="50" r="38" fill="none" stroke="#3b82f6" stroke-width="15"
          stroke-dasharray="${pp.toFixed(1)} ${(C-pp).toFixed(1)}" transform="rotate(-90 50 50)" stroke-linecap="round"/>
        <circle cx="50" cy="50" r="38" fill="none" stroke="#ef4444" stroke-width="15"
          stroke-dasharray="${ep.toFixed(1)} ${(C-ep).toFixed(1)}" stroke-dashoffset="${(-pp).toFixed(1)}" transform="rotate(-90 50 50)" stroke-linecap="round"/>
        <circle cx="50" cy="50" r="38" fill="none" stroke="#8b5cf6" stroke-width="15"
          stroke-dasharray="${dp.toFixed(1)} ${(C-dp).toFixed(1)}" stroke-dashoffset="${(-(pp+ep)).toFixed(1)}" transform="rotate(-90 50 50)" stroke-linecap="round"/>
        <text x="50" y="46" text-anchor="middle" fill="white" font-size="11" font-family="Syne" font-weight="700">${pPct}%</text>
        <text x="50" y="57" text-anchor="middle" fill="#475569" font-size="7" font-family="Hind Siliguri">লাভ</text>
      </svg>
      <div class="donut-leg">
        <div class="dleg-item"><div class="dleg-dot" style="background:#3b82f6"></div>
          <div style="flex:1"><div style="display:flex;justify-content:space-between"><span>লাভ</span><span class="dleg-val" style="color:#3b82f6">${bn(profit)}</span></div>
          <div style="font-size:9px;color:#3b82f6;font-weight:700;margin-top:1px">${pPct}%</div></div>
        </div>
        <div class="dleg-item"><div class="dleg-dot" style="background:#ef4444"></div>
          <div style="flex:1"><div style="display:flex;justify-content:space-between"><span>খরচ</span><span class="dleg-val" style="color:#ef4444">${bn(exp)}</span></div>
          <div style="font-size:9px;color:#ef4444;font-weight:700;margin-top:1px">${ePct}%</div></div>
        </div>
        <div class="dleg-item"><div class="dleg-dot" style="background:#8b5cf6"></div>
          <div style="flex:1"><div style="display:flex;justify-content:space-between"><span>বাকি</span><span class="dleg-val" style="color:#8b5cf6">${bn(due)}</span></div>
          <div style="font-size:9px;color:#8b5cf6;font-weight:700;margin-top:1px">${dPct}%</div></div>
        </div>
      </div>
    </div>`;
  }

  // ─────────────────────────────────────────
  //  WORKERS (real data)
  // ─────────────────────────────────────────
  function buildWorkers(sales) {
    const map = {};
    sales.forEach(s => {
      if (!s.uid) return;
      if (!map[s.uid]) map[s.uid] = {name:s.workerName||'—',total:0,count:0,uid:s.uid};
      map[s.uid].total += (s.total||0); map[s.uid].count++;
    });
    const sorted = Object.values(map).sort((a,b)=>b.total-a.total).slice(0,4);
    if (!sorted.length) return `<div style="text-align:center;padding:20px;color:#475569;font-size:12px">📭 কোনো তথ্য নেই</div>`;
    const maxT = sorted[0].total || 1;
    const C = [
      {bg:'rgba(59,130,246,.15)',f:'linear-gradient(90deg,#3b82f6,#06b6d4)'},
      {bg:'rgba(139,92,246,.15)',f:'linear-gradient(90deg,#8b5cf6,#ec4899)'},
      {bg:'rgba(6,182,212,.15)', f:'linear-gradient(90deg,#06b6d4,#10b981)'},
      {bg:'rgba(245,158,11,.15)',f:'linear-gradient(90deg,#f59e0b,#ef4444)'},
    ];
    return `<div class="mini-list">${sorted.map((w,i)=>{
      const u=(window.allUsers||{})[w.uid];
      const av=u?.photoURL?`<img src="${u.photoURL}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:'👤';
      const pw=Math.round(w.total/maxT*100);
      return `<div class="mitem">
        <div class="mav" style="background:${C[i].bg};border-radius:50%">${av}</div>
        <div class="minfo">
          <div class="mname">${w.name}</div>
          <div class="msub">${bnN(w.count)}টি বিক্রয়</div>
          <div class="mbar"><div class="mbar-fill" style="width:${pw}%;background:${C[i].f}"></div></div>
        </div>
        <div class="mval" style="color:#10b981">${bn(w.total)}</div>
      </div>`;
    }).join('')}</div>`;
  }

  // ─────────────────────────────────────────
  //  TABLE (real data)
  // ─────────────────────────────────────────
  function buildTable(sales) {
    const r = [...sales].sort((a,b)=>(b.ts||0)-(a.ts||0)).slice(0,6);
    if (!r.length) return `<div style="text-align:center;padding:20px;color:#475569;font-size:12px">📭 কোনো বিক্রয় নেই</div>`;
    return `<table class="data-tbl">
      <thead><tr><th>দোকান</th><th>প্রোডাক্ট</th><th>কর্মী</th><th>পরিমাণ</th><th>স্ট্যাটাস</th></tr></thead>
      <tbody>${r.map(s=>{
        const t=s.payStatus==='নগদ'?'tag-p':s.payStatus==='বাকি'?'tag-d':'tag-a';
        const l=s.payStatus==='নগদ'?'নগদ':s.payStatus==='বাকি'?'বাকি':'আংশিক';
        return `<tr>
          <td style="color:#f1f5f9;font-weight:600">${s.shop||'—'}</td>
          <td>${s.product||'—'}</td>
          <td>${s.workerName||'—'}</td>
          <td style="color:#3b82f6;font-weight:600">${bn(s.total)}</td>
          <td><span class="tag ${t}">${l}</span></td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  }

  // ─────────────────────────────────────────
  //  PRODUCTS (real data)
  // ─────────────────────────────────────────
  function buildProducts(sales) {
    const map = {};
    sales.forEach(s=>{
      const k=s.product||'অজানা';
      if(!map[k])map[k]={name:k,total:0,qty:0};
      map[k].total+=(s.total||0); map[k].qty+=(s.qty||0);
    });
    const sorted=Object.values(map).sort((a,b)=>b.total-a.total).slice(0,4);
    if(!sorted.length) return `<div style="text-align:center;padding:20px;color:#475569;font-size:12px">📭 কোনো তথ্য নেই</div>`;
    const maxT=sorted[0].total||1;
    const C=[
      {bg:'rgba(139,92,246,.15)',f:'linear-gradient(90deg,#8b5cf6,#3b82f6)'},
      {bg:'rgba(59,130,246,.15)',f:'linear-gradient(90deg,#3b82f6,#06b6d4)'},
      {bg:'rgba(6,182,212,.15)', f:'linear-gradient(90deg,#06b6d4,#10b981)'},
      {bg:'rgba(16,185,129,.15)',f:'linear-gradient(90deg,#10b981,#8b5cf6)'},
    ];
    return `<div class="mini-list">${sorted.map((p,i)=>{
      const pw=Math.round(p.total/maxT*100);
      return `<div class="mitem">
        <div class="mav" style="background:${C[i].bg}">📦</div>
        <div class="minfo">
          <div class="mname">${p.name}</div>
          <div class="msub">${bnN(p.qty)} পিস</div>
          <div class="mbar"><div class="mbar-fill" style="width:${pw}%;background:${C[i].f}"></div></div>
        </div>
        <div class="mval" style="color:#8b5cf6">${bn(p.total)}</div>
      </div>`;
    }).join('')}</div>`;
  }

  // ─────────────────────────────────────────
  //  ROUTES (real data)
  // ─────────────────────────────────────────
  function buildRoutes(sales) {
    const rts=window.allRoutes||{}; const map={};
    sales.forEach(s=>{
      if(!s.routeId)return;
      if(!map[s.routeId])map[s.routeId]={name:rts[s.routeId]?.name||'অজানা',total:0,count:0};
      map[s.routeId].total+=(s.total||0); map[s.routeId].count++;
    });
    const nr=sales.filter(s=>!s.routeId).reduce((a,s)=>a+(s.total||0),0);
    if(nr>0)map['__']={name:'রুট ছাড়া',total:nr,count:0};
    const sorted=Object.values(map).sort((a,b)=>b.total-a.total).slice(0,4);
    if(!sorted.length) return `<div style="text-align:center;padding:16px;color:#475569;font-size:12px">📭 রুট তথ্য নেই</div>`;
    return sorted.map(r=>`
      <div class="route-item">
        <div class="route-ico">🗺️</div>
        <div class="route-info"><div class="route-name">${r.name}</div><div class="route-sub">${bnN(r.count)} বিক্রয়</div></div>
        <div class="route-val">${bn(r.total)}</div>
      </div>`).join('');
  }

  // ─────────────────────────────────────────
  //  AGING (real data)
  // ─────────────────────────────────────────
  function buildAging() {
    const now=new Date();
    const bk=[
      {l:'০–৭ দিন', mn:0, mx:7,   c:'#10b981',t:0},
      {l:'৮–৩০ দিন',mn:8, mx:30,  c:'#f59e0b',t:0},
      {l:'৩১–৯০',   mn:31,mx:90,  c:'#ef4444',t:0},
      {l:'৯০+ দিন', mn:91,mx:9999,c:'#7f1d1d',t:0},
    ];
    aS().filter(s=>(s.due||0)>0&&s.date).forEach(s=>{
      const d=Math.floor((now-new Date(s.date))/86400000);
      const b=bk.find(b=>d>=b.mn&&d<=b.mx); if(b)b.t+=(s.due||0);
    });
    const mx=Math.max(...bk.map(b=>b.t),1);
    if(bk.every(b=>b.t===0)) return `<div style="text-align:center;padding:16px;color:#10b981;font-size:12px;font-weight:600">✅ কোনো বাকি নেই!</div>`;
    return bk.map(b=>`
      <div class="aging-item">
        <div class="aging-lbl">${b.l}</div>
        <div class="aging-bar"><div class="aging-fill" style="width:${b.t/mx*100}%;background:${b.c}"></div></div>
        <div class="aging-val" style="color:${b.c}">${bn(b.t)}</div>
      </div>`).join('');
  }

  // ─────────────────────────────────────────
  //  GPS (real Firebase data)
  // ─────────────────────────────────────────
  function buildGPS() {
    const locs = window._liveLocations || {};
    const users = window.allUsers || {};
    const now = Date.now();

    // Firebase liveLocations থেকে data নাও
    const workerLocs = Object.entries(locs).map(([uid, loc]) => {
      const u = users[uid] || {};
      const minsAgo = Math.floor((now - (loc.ts||now)) / 60000);
      const online = loc.online !== false && minsAgo < 15;
      return { uid, name:u.name||'কর্মী', loc, minsAgo, online, photo:u.photoURL };
    }).sort((a,b)=> a.online===b.online ? a.minsAgo-b.minsAgo : b.online-a.online);

    if (!workerLocs.length) {
      return `<div style="text-align:center;padding:20px;color:#475569;font-size:12px">📡 কোনো লাইভ লোকেশন নেই</div>`;
    }

    const colors = ['linear-gradient(135deg,#3b82f6,#8b5cf6)','linear-gradient(135deg,#8b5cf6,#ec4899)','linear-gradient(135deg,#06b6d4,#10b981)','linear-gradient(135deg,#f59e0b,#ef4444)'];

    return workerLocs.slice(0,5).map((w,i)=>{
      const av = w.photo
        ? `<img src="${w.photo}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
        : `<span style="font-size:14px">👤</span>`;
      const loc = w.loc;
      const area = loc.area || (loc.lat && loc.lng ? `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}` : 'অজানা');
      const timeStr = w.minsAgo === 0 ? 'এইমাত্র' : `${w.minsAgo} মিনিট আগে`;

      return `<div style="display:flex;align-items:center;gap:10px;padding:9px;background:#111e33;border-radius:10px;border:1px solid rgba(99,179,237,.1);">
        <div style="width:34px;height:34px;border-radius:50%;background:${colors[i%colors.length]};display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;">${av}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;font-weight:700;color:#f1f5f9;">${w.name}</div>
          <div style="font-size:10px;color:#475569;margin-top:1px;">📍 ${area}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-size:10px;font-weight:600;color:${w.online?'#10b981':'#f59e0b'};">● ${w.online?'অনলাইন':'অফলাইন'}</div>
          <div style="font-size:9px;color:#475569;margin-top:1px;">${timeStr}</div>
        </div>
      </div>`;
    }).join('');
  }

  // ─────────────────────────────────────────
  //  HIDE ORIGINAL DASH ELEMENTS
  // ─────────────────────────────────────────
  function hideOrig() {
    ['dashLineChartWrap','dashWorkerChartWrap','dashWorkerRing','dashMonthProgress'].forEach(id=>{
      const e=document.getElementById(id); if(e)e.style.display='none';
    });
    document.querySelectorAll('#page-dash .sec').forEach(e=>e.style.display='none');
    const ds=document.getElementById('dashSales'); if(ds)ds.style.display='none';
  }

  // ─────────────────────────────────────────
  //  MAIN RENDER
  // ─────────────────────────────────────────
  function render() {
    if (window.CR !== 'admin') return;
    const wrap = document.getElementById('adminEnterpriseDash');
    if (!wrap) return;
    wrap.style.display = 'block';
    hideOrig();

    const now     = new Date();
    const sales   = pSales(_P);
    const prev    = prSales(_P);
    const allS    = aS();
    const wks     = aU().filter(u=>u.role==='worker'||u.role==='manager');
    const att     = Object.values(window.allAttendance||{}).filter(a=>a.date===today()).length;

    const tS  = sales.reduce((a,s)=>a+(s.total||0),0);
    const tP  = sales.reduce((a,s)=>a+(s.profit||0),0);
    const tD  = allS.reduce((a,s)=>a+(s.due||0),0);
    const tE  = aE().reduce((a,e)=>a+(e.amount||0),0);
    const pS  = prev.reduce((a,s)=>a+(s.total||0),0);
    const pP  = prev.reduce((a,s)=>a+(s.profit||0),0);

    const lastDay = new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
    const mPct    = Math.round(now.getDate()/lastDay*100);
    const PL = {'1':'আজ','7':'৭ দিন','30':'৩০ দিন','90':'৩ মাস','180':'৬ মাস','365':'১ বছর'};

    wrap.innerHTML = `<div class="wrap" style="padding:0 0 20px;max-width:100%">

  <!-- TOPBAR -->
  <div class="topbar" style="position:relative">
    <div class="topbar-logo">📒 NovaTEch</div>
    <div class="topbar-tabs">
      ${[['আজ','1'],['৭ দিন','7'],['মাস','30'],['৩ মাস','90'],['৬ মাস','180'],['১ বছর','365']].map(([l,v])=>
        `<button class="ttab${_P===v?' on':''}" onclick="window.ntd4P('${v}',this)">${l}</button>`
      ).join('')}
    </div>
    <div class="live-pill"><div class="live-dot"></div>লাইভ</div>
  </div>

  <div class="content">

    <!-- STAT CARDS -->
    <div class="stat-grid">
      <div class="stat-card sc-blue">
        <div class="sico">💰</div><div class="slbl">মোট বিক্রয়</div>
        <div class="sval">${bn(tS)}</div>${chg(tS,pS)}
      </div>
      <div class="stat-card sc-green">
        <div class="sico">📈</div><div class="slbl">মোট লাভ</div>
        <div class="sval">${bn(tP)}</div>${chg(tP,pP)}
      </div>
      <div class="stat-card sc-purple">
        <div class="sico">📉</div><div class="slbl">মোট খরচ</div>
        <div class="sval">${bn(tE)}</div>
        <div class="schg n">সব সময়ের</div>
      </div>
      <div class="stat-card sc-cyan">
        <div class="sico">🏦</div><div class="slbl">মোট বাকি</div>
        <div class="sval">${bn(tD)}</div>
        <div class="schg ${tD>0?'dn':'up'}">${tD>0?'⚠️ বাকি আছে':'✓ পরিষ্কার'}</div>
      </div>
    </div>

    <!-- MINI ROW -->
    <div class="mini-row">
      <div class="mini-box">
        <div class="mini-lbl">মোট বিক্রয়</div>
        <div class="mini-val" style="color:#3b82f6">${bnN(allS.length)}টি</div>
      </div>
      <div class="mini-box">
        <div class="mini-lbl">কর্মী</div>
        <div class="mini-val" style="color:#8b5cf6">${bnN(wks.length)}জন</div>
      </div>
      <div class="mini-box">
        <div class="mini-lbl">আজ উপস্থিত</div>
        <div class="mini-val" style="color:#10b981">${att}/${wks.length}</div>
      </div>
    </div>

    <!-- MONTH PROGRESS -->
    <div class="month-card">
      <div class="month-top">
        <div class="month-title">📅 ${now.toLocaleString('bn-BD',{month:'long',year:'numeric'})}</div>
        <span class="month-badge">${lastDay-now.getDate()} দিন বাকি</span>
      </div>
      <div class="month-bar"><div class="month-fill" style="width:${mPct}%"></div></div>
      <div class="month-meta">
        <span>শুরু</span><span class="hi">${mPct}% সম্পন্ন</span><span>শেষ</span>
      </div>
    </div>

    <!-- LINE CHART -->
    <div class="card">
      <div class="card-h">
        <div class="card-t">📈 বিক্রয় ট্রেন্ড <span class="card-b" id="ntd4-clbl">${PL[_P]}</span></div>
      </div>
      <div class="cperiods">
        ${[['আজ','1'],['৭ দিন','7'],['৩০ দিন','30'],['৩ মাস','90'],['৬ মাস','180'],['১২ মাস','365']].map(([l,v])=>
          `<button class="cpt${_P===v?' on':''}" onclick="window.ntd4C('${v}',this)">${l}</button>`
        ).join('')}
      </div>
      <div id="ntd4-chart">${buildChart(_P)}</div>
    </div>

    <!-- DONUT + WORKERS -->
    <div class="two-col">
      <div class="card">
        <div class="card-h"><div class="card-t">💹 লাভ-খরচ-বাকি</div></div>
        ${buildDonut(tP,tE,tD)}
      </div>
      <div class="card">
        <div class="card-h">
          <div class="card-t">🏆 শীর্ষ কর্মী</div>
          <span class="card-b">${PL[_P]}</span>
        </div>
        ${buildWorkers(sales)}
      </div>
    </div>

    <!-- SALES TABLE -->
    <div class="card">
      <div class="card-h">
        <div class="card-t">🧾 সর্বশেষ বিক্রয়</div>
        <button class="card-lk" onclick="window.navTo('sale')">সব দেখুন →</button>
      </div>
      ${buildTable(sales)}
    </div>

    <!-- PRODUCTS + ROUTES -->
    <div class="two-col">
      <div class="card">
        <div class="card-h"><div class="card-t">📦 শীর্ষ পণ্য</div></div>
        ${buildProducts(sales)}
      </div>
      <div class="card">
        <div class="card-h"><div class="card-t">🗺️ রুট</div></div>
        ${buildRoutes(sales)}
      </div>
    </div>

    <!-- DUE AGING -->
    <div class="card">
      <div class="card-h">
        <div class="card-t">⏳ বাকি Aging</div>
        <span class="card-b">কতদিন ধরে</span>
      </div>
      ${buildAging()}
    </div>

    <!-- LIVE GPS -->
    <div class="card">
      <div class="card-h">
        <div class="card-t">📡 কর্মীদের লাইভ লোকেশন</div>
        <div style="display:flex;align-items:center;gap:5px;font-size:10px;font-weight:600;color:#10b981;">
          <span style="width:6px;height:6px;background:#10b981;border-radius:50%;display:inline-block;animation:livePulse 2s infinite"></span>লাইভ
        </div>
      </div>
      <div id="ntd4-gps" style="display:flex;flex-direction:column;gap:8px;">${buildGPS()}</div>
      <button onclick="window.navTo('att')" style="width:100%;margin-top:10px;padding:10px;background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.2);border-radius:10px;color:#60a5fa;font-size:12px;font-weight:600;cursor:pointer;font-family:'Hind Siliguri',sans-serif;">
        🗺️ ম্যাপে দেখুন
      </button>
    </div>

    <!-- QUICK ACTIONS -->
    <div class="card">
      <div class="card-h"><div class="card-t">⚡ দ্রুত কাজ</div></div>
      <div class="actions-grid">
        ${[['🛍️','নতুন বিক্রয়','sale','এখনই এন্ট্রি'],['💰','পেমেন্ট নিন','due','বাকি আদায়'],
           ['⏰','উপস্থিতি','att','আজকের হাজিরা'],['📊','রিপোর্ট','report','বিশ্লেষণ'],
           ['💵','বেতন হিসাব','salary','এই মাসের'],['⚙️','সেটিংস','admin','কনফিগারেশন']].map(([i,l,p,s])=>`
          <button class="act-btn" onclick="window.navTo('${p}')">
            <span class="act-ico">${i}</span>
            <div><div class="act-lbl">${l}</div><div class="act-sub">${s}</div></div>
          </button>`).join('')}
      </div>
    </div>

  </div>
</div>`;
  }

  // ─────────────────────────────────────────
  //  GLOBALS
  // ─────────────────────────────────────────
  window.ntd4P = (p, btn) => {
    _P = p;
    document.querySelectorAll('.ttab').forEach(b=>b.classList.remove('on'));
    if(btn)btn.classList.add('on');
    render();
  };
  window.ntd4C = (p, btn) => {
    _P = p;
    document.querySelectorAll('.cpt').forEach(b=>b.classList.remove('on'));
    if(btn)btn.classList.add('on');
    const el=document.getElementById('ntd4-chart');
    if(el)el.innerHTML=buildChart(p);
    const lbl=document.getElementById('ntd4-clbl');
    const PL={'1':'আজ','7':'৭ দিন','30':'৩০ দিন','90':'৩ মাস','180':'৬ মাস','365':'১২ মাস'};
    if(lbl)lbl.textContent=PL[p]||p+'দিন';
    // topbar tabs sync
    document.querySelectorAll('.ttab').forEach(b=>{
      b.classList.toggle('on', b.textContent.trim().includes(PL[p]?.split(' ')[0]||''));
    });
  };

  // GPS live refresh
  function refreshGPS() {
    const el=document.getElementById('ntd4-gps');
    if(el)el.innerHTML=buildGPS();
  }

  // Firebase GPS listener
  function listenGPS() {
    if(!window._db||!window._ref||!window._onValue)return;
    try {
      window._onValue(window._ref(window._db,'liveLocations'), snap=>{
        window._liveLocations = snap.val()||{};
        refreshGPS();
      });
    } catch(e){}
  }

  const _oSP=window.showPage;
  window.showPage=function(id,isBack){
    if(typeof _oSP==='function')_oSP(id,isBack);
    if(id==='dash'&&window.CR==='admin')setTimeout(render,200);
  };

  const _oSync=window.syncGlobals;
  window.syncGlobals=function(){
    if(typeof _oSync==='function')_oSync();
    const pg=document.getElementById('page-dash');
    if(pg&&pg.classList.contains('active')&&window.CR==='admin'){
      clearTimeout(window._ntd4T); window._ntd4T=setTimeout(render,350);
    }
  };

  // ─────────────────────────────────────────
  //  INIT
  // ─────────────────────────────────────────
  waitForApp(()=>{
    injectCSS();
    listenGPS();
    const pg=document.getElementById('page-dash');
    if(pg&&pg.classList.contains('active')&&window.CR==='admin')setTimeout(render,300);
  });

})();
