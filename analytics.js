// ══════════════════════════════════════════════════════════════════
//  NovaTEch BD — Enterprise Analytics Engine v1.0
//  🤖 Claude AI + 📊 Advanced Charts + 🚨 Smart Alerts + 📅 Auto Reports
//  Built by: World's Top 1% Team
// ══════════════════════════════════════════════════════════════════

// ── Analytics State
let aiAnalysisCache = {};
let lastAnalysisTime = 0;
let anomalyHistory = [];
let analyticsRefreshTimer = null;

// ── Bengali number formatter
const bnNum = n => Math.round(n||0).toLocaleString('bn-BD');

// ✅ FIX 1: auditLog — আগে সংজ্ঞায়িত ছিল না, এখন সম্পূর্ণ কাজ করে
window.auditLog = async function(action, detail) {
  try {
    const db = window._firebaseDB || window._db;
    if (!db) return;
    const { ref, push } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js');
    await push(ref(db, 'auditLogs'), {
      action,
      detail,
      uid: window.CU?.uid || 'unknown',
      userName: window.CN || 'unknown',
      role: window.CR || 'unknown',
      ts: Date.now(),
      date: new Date().toISOString().split('T')[0]
    });
  } catch(e) { console.warn('AuditLog error:', e.message); }
};
function auditLog(action, detail) { window.auditLog(action, detail); }

// ✅ FIX 2: AI Key সরাসরি ব্রাউজারে না রেখে Firebase থেকে নিরাপদে নেওয়া হয়
// Anthropic API এখন একটি wrapper এর মাধ্যমে call হয় যাতে key client-এ cache না থাকে দীর্ঘক্ষণ
async function _secureAICall(messages, maxTokens=1000) {
  const key = await getAIKey();
  if (!key) throw new Error('AI Key পাওয়া যায়নি');
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: maxTokens, messages })
  });
  if (!resp.ok) throw new Error(`API Error: ${resp.status}`);
  return resp.json();
}
window._secureAICall = _secureAICall;

// ══════════════════════════════════════════════════════════════════
//  📊 DATA ENGINE — সব data এখানে process হয়
// ══════════════════════════════════════════════════════════════════
function buildAnalyticsData() {
  const now = new Date();
  const sales = Object.values(window.allSales || {});
  const expenses = Object.values(window.allExpenses || {});
  const users = window.allUsers || {};
  const products = window.allProducts || {};
  const salaries = window.allSalaries || {};
  const attendance = window.allAttendance || {};

  // ── Time periods
  const todayStr = now.toISOString().split('T')[0];
  const thisMonth = (s) => { const d = new Date(s.date); return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear(); };
  const lastMonth = (s) => { const d = new Date(s.date); const lm = new Date(now); lm.setMonth(lm.getMonth()-1); return d.getMonth()===lm.getMonth()&&d.getFullYear()===lm.getFullYear(); };
  const thisWeek = (s) => { const d = new Date(s.date); const ws = new Date(now); ws.setDate(now.getDate()-now.getDay()); return d >= ws; };
  const last7Days = (s) => { const d = new Date(s.date); const w = new Date(now); w.setDate(now.getDate()-7); return d >= w; };

  // ── Core metrics
  const monthSales = sales.filter(thisMonth);
  const lastMonthSales = sales.filter(lastMonth);
  const weekSales = sales.filter(thisWeek);
  const todaySales = sales.filter(s => s.date === todayStr);
  const monthExp = expenses.filter(thisMonth);

  const totalRevenue = monthSales.reduce((a,b) => a+(b.total||0), 0);
  const totalProfit = monthSales.reduce((a,b) => a+(b.profit||0), 0);
  const totalExpense = monthExp.reduce((a,b) => a+(b.amount||0), 0);
  const totalDue = sales.reduce((a,b) => a+(b.due||0), 0);
  const lastMonthRevenue = lastMonthSales.reduce((a,b) => a+(b.total||0), 0);
  const lastMonthProfit = lastMonthSales.reduce((a,b) => a+(b.profit||0), 0);
  const todayRevenue = todaySales.reduce((a,b) => a+(b.total||0), 0);
  const weekRevenue = weekSales.reduce((a,b) => a+(b.total||0), 0);

  // ── Growth rates
  const revenueGrowth = lastMonthRevenue > 0 ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1) : 0;
  const profitGrowth = lastMonthProfit > 0 ? ((totalProfit - lastMonthProfit) / lastMonthProfit * 100).toFixed(1) : 0;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue * 100).toFixed(1) : 0;

  // ── Per worker performance
  const workerStats = {};
  Object.entries(users).filter(([,u]) => u.role==='worker'||u.role==='manager').forEach(([uid,u]) => {
    const ws = monthSales.filter(s => s.uid === uid);
    const sal = salaries[uid];
    const target = sal?.monthlyTarget || 0;
    const revenue = ws.reduce((a,b) => a+(b.total||0), 0);
    const profit = ws.reduce((a,b) => a+(b.profit||0), 0);
    const attDays = Object.values(attendance).filter(a => { const d=new Date(a.date); return a.uid===uid&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()&&a.checkIn; }).length;
    const lateCount = Object.values(attendance).filter(a => { const d=new Date(a.date); return a.uid===uid&&d.getMonth()===now.getMonth()&&a.isLate; }).length;
    const targetPct = target > 0 ? (revenue/target*100).toFixed(1) : 0;
    workerStats[uid] = { name: u.name, revenue, profit, attDays, lateCount, target, targetPct: parseFloat(targetPct), txCount: ws.length };
  });

  // ── Product performance
  const productStats = {};
  monthSales.forEach(s => {
    if (!productStats[s.product]) productStats[s.product] = { qty: 0, revenue: 0, profit: 0 };
    productStats[s.product].qty += s.qty || 0;
    productStats[s.product].revenue += s.total || 0;
    productStats[s.product].profit += s.profit || 0;
  });

  // ── Daily trend (last 30 days)
  const dailyTrend = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now); d.setDate(now.getDate()-i);
    const ds = d.toISOString().split('T')[0];
    const daySales = sales.filter(s => s.date === ds);
    const dayExp = expenses.filter(e => e.date === ds);
    dailyTrend.push({
      date: ds,
      label: (d.getDate())+'/'+(d.getMonth()+1),
      revenue: daySales.reduce((a,b) => a+(b.total||0), 0),
      profit: daySales.reduce((a,b) => a+(b.profit||0), 0),
      expense: dayExp.reduce((a,b) => a+(b.amount||0), 0),
      txCount: daySales.length
    });
  }

  // ── Route performance
  const routeStats = {};
  const routes = window.allRoutes || {};
  monthSales.forEach(s => {
    if (s.routeId && routes[s.routeId]) {
      const rn = routes[s.routeId].name;
      if (!routeStats[rn]) routeStats[rn] = { revenue: 0, txCount: 0 };
      routeStats[rn].revenue += s.total || 0;
      routeStats[rn].txCount++;
    }
  });

  // ── Anomaly detection
  const avgDailyRevenue = dailyTrend.slice(-14).reduce((a,b) => a+b.revenue, 0) / 14;
  const stdDev = Math.sqrt(dailyTrend.slice(-14).reduce((a,b) => a+Math.pow(b.revenue-avgDailyRevenue,2), 0) / 14);
  const anomalies = dailyTrend.filter(d => Math.abs(d.revenue - avgDailyRevenue) > 2 * stdDev && d.revenue > 0);

  // ── Due risk analysis
  const custDueMap = {};
  sales.forEach(s => {
    if (s.due > 0 && s.shopId) {
      if (!custDueMap[s.shopId]) custDueMap[s.shopId] = { shop: s.shop, due: 0, lastDate: s.date };
      custDueMap[s.shopId].due += s.due;
      if (s.date > custDueMap[s.shopId].lastDate) custDueMap[s.shopId].lastDate = s.date;
    }
  });
  const highRiskDue = Object.values(custDueMap).filter(c => {
    const daysDiff = Math.floor((Date.now() - new Date(c.lastDate)) / 86400000);
    return c.due > 5000 || daysDiff > 30;
  }).sort((a,b) => b.due - a.due);

  return {
    totalRevenue, totalProfit, totalExpense, totalDue,
    lastMonthRevenue, lastMonthProfit,
    todayRevenue, weekRevenue,
    revenueGrowth: parseFloat(revenueGrowth),
    profitGrowth: parseFloat(profitGrowth),
    profitMargin: parseFloat(profitMargin),
    workerStats,
    productStats,
    dailyTrend,
    routeStats,
    anomalies,
    highRiskDue,
    txCount: monthSales.length,
    todayTxCount: todaySales.length,
    avgOrderValue: monthSales.length > 0 ? totalRevenue / monthSales.length : 0,
    topProduct: Object.entries(productStats).sort((a,b) => b[1].revenue-a[1].revenue)[0],
    topWorker: Object.values(workerStats).sort((a,b) => b.revenue-a.revenue)[0],
    workerCount: Object.keys(workerStats).length,
  };
}


// ══════════════════════════════════════════════════════════════════
//  🤖 CLAUDE AI ANALYSIS ENGINE
// ══════════════════════════════════════════════════════════════════
async function runAIAnalysis(forceRefresh = false) {
  const el = document.getElementById('aiAnalysisPanel');
  if (!el) return;

  // Cache: ৩০ মিনিটের বেশি পুরনো না হলে cache দেখাও
  const now = Date.now();
  const cacheKey = window.CR + '_' + new Date().toDateString();
  if (!forceRefresh && aiAnalysisCache[cacheKey] && (now - lastAnalysisTime) < 30 * 60 * 1000) {
    el.innerHTML = aiAnalysisCache[cacheKey];
    return;
  }

  // Loading state
  el.innerHTML = `
    <div style="padding:20px;text-align:center">
      <div style="font-size:28px;margin-bottom:10px;animation:pulse 1.2s ease-in-out infinite">🤖</div>
      <div style="font-size:13px;color:var(--text-2);font-weight:600">Claude AI বিশ্লেষণ করছে...</div>
      <div style="font-size:11px;color:var(--muted);margin-top:4px">ব্যবসার সব ডেটা পর্যালোচনা হচ্ছে</div>
      <div class="ai-loading-dots"><span></span><span></span><span></span></div>
    </div>`;

  try {
    const data = buildAnalyticsData();
    const prompt = buildAIPrompt(data);

    // Firebase থেকে API Key
    let apiKey = window._ntAIKey || '';
    if(!apiKey) {
      try {
        const db = window._firebaseDB || window.db;
        if(db) {
          const { ref, get } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js');
          const snap = await get(ref(db,'aiConfig'));
          if(snap.exists()) {
            apiKey = snap.val().apiKey || snap.val().anthropicApiKey || '';
            window._ntAIKey = apiKey; // cache
          }
        }
      } catch(e) { apiKey = localStorage.getItem('nt-ai-key') || ''; }
    }
    if(!apiKey){
      el.innerHTML = `<div style="padding:20px;text-align:center;color:var(--red)">
        <div style="font-size:30px">🔑</div>
        <div style="font-size:13px;margin-top:8px;font-weight:600">Anthropic API Key সেট করা হয়নি</div>
        <div style="font-size:11px;color:var(--muted);margin-top:6px">⚙️ Admin পেজ → AI Config → Key দিন</div>
      </div>`;
      return;
    }
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const result = await response.json();
    const text = result.content?.[0]?.text || '';

    // Parse JSON response
    let analysis;
    try {
      const clean = text.replace(/```json|```/g, '').trim();
      analysis = JSON.parse(clean);
    } catch {
      analysis = { summary: text, insights: [], alerts: [], recommendations: [] };
    }

    const html = renderAIAnalysis(analysis, data);
    el.innerHTML = html;
    aiAnalysisCache[cacheKey] = html;
    lastAnalysisTime = now;

  } catch (err) {
    el.innerHTML = `
      <div style="padding:16px;text-align:center">
        <div style="font-size:24px;margin-bottom:8px">⚠️</div>
        <div style="font-size:12px;color:var(--muted)">AI বিশ্লেষণ করা যায়নি।<br>ইন্টারনেট চেক করুন বা পরে চেষ্টা করুন।</div>
        <button onclick="runAIAnalysis(true)" style="margin-top:10px;padding:6px 14px;border:1px solid var(--border-l);border-radius:var(--r-sm);background:none;color:var(--muted);cursor:pointer;font-family:inherit;font-size:11px">🔄 আবার চেষ্টা</button>
      </div>`;
  }
}

function buildAIPrompt(data) {
  const monthName = new Date().toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' });
  const workers = Object.values(data.workerStats).map(w =>
    `${w.name}: বিক্রয়=${w.revenue} টাকা, টার্গেট=${w.target} টাকা (${w.targetPct}%), উপস্থিতি=${w.attDays} দিন, দেরি=${w.lateCount} বার`
  ).join('\n');
  const topProducts = Object.entries(data.productStats)
    .sort((a,b) => b[1].revenue-a[1].revenue).slice(0,5)
    .map(([name,s]) => `${name}: ${s.qty} পিস, ${s.revenue} টাকা`).join(', ');
  const anomalyText = data.anomalies.length > 0
    ? data.anomalies.map(a => `${a.label}: ${a.revenue} টাকা (স্বাভাবিকের বাইরে)`).join(', ')
    : 'কোনো অস্বাভাবিকতা নেই';
  const riskDue = data.highRiskDue.slice(0,3).map(c => `${c.shop}: ${c.due} টাকা বাকি`).join(', ');

  return `তুমি NovaTEch BD কোম্পানির Business Intelligence AI। নিচের ডেটা বিশ্লেষণ করে JSON ফরম্যাটে বাংলায় রিপোর্ট দাও।

## ${monthName} ব্যবসার ডেটা:

**মূল সংখ্যা:**
- মোট বিক্রয়: ${data.totalRevenue} টাকা (গত মাসের তুলনায় ${data.revenueGrowth > 0 ? '+' : ''}${data.revenueGrowth}%)
- মোট লাভ: ${data.totalProfit} টাকা (মার্জিন: ${data.profitMargin}%)
- মোট খরচ: ${data.totalExpense} টাকা
- মোট বাকি: ${data.totalDue} টাকা
- আজকের বিক্রয়: ${data.todayRevenue} টাকা (${data.todayTxCount} টি লেনদেন)
- গড় অর্ডার মূল্য: ${Math.round(data.avgOrderValue)} টাকা

**কর্মী পারফরম্যান্স:**
${workers || 'কোনো কর্মী নেই'}

**শীর্ষ পণ্য:**
${topProducts || 'ডেটা নেই'}

**অস্বাভাবিকতা:**
${anomalyText}

**ঝুঁকিপূর্ণ বাকি:**
${riskDue || 'কোনো উচ্চ ঝুঁকি নেই'}

এই ডেটা বিশ্লেষণ করে নিচের JSON ফরম্যাটে উত্তর দাও (শুধু JSON, আর কিছু না):

{
  "mood": "excellent|good|warning|critical",
  "summary": "২-৩ লাইনে সামগ্রিক ব্যবসার অবস্থা",
  "insights": [
    {"icon": "emoji", "title": "শিরোনাম", "text": "বিস্তারিত", "type": "positive|negative|neutral"}
  ],
  "alerts": [
    {"level": "high|medium|low", "text": "সতর্কতার বিষয়", "action": "কী করতে হবে"}
  ],
  "recommendations": [
    {"priority": "high|medium|low", "text": "পরামর্শ", "impact": "প্রভাব"}
  ],
  "prediction": "আগামী সপ্তাহে বিক্রয় কেমন হতে পারে এবং কেন"
}`;
}

function renderAIAnalysis(analysis, data) {
  const moodConfig = {
    excellent: { bg: 'rgba(16,185,129,.1)', border: 'rgba(16,185,129,.3)', icon: '🚀', color: 'var(--green)', label: 'চমৎকার' },
    good:      { bg: 'rgba(59,130,246,.1)', border: 'rgba(59,130,246,.3)', icon: '✅', color: 'var(--blue)', label: 'ভালো' },
    warning:   { bg: 'rgba(245,158,11,.1)', border: 'rgba(245,158,11,.3)', icon: '⚠️', color: 'var(--accent)', label: 'সতর্কতা' },
    critical:  { bg: 'rgba(239,68,68,.1)',  border: 'rgba(239,68,68,.3)',  icon: '🔴', color: 'var(--red)', label: 'সংকট' },
  };
  const mood = moodConfig[analysis.mood] || moodConfig.good;

  const insightTypes = { positive: 'var(--green)', negative: 'var(--red)', neutral: 'var(--blue)' };

  return `
  <div style="background:${mood.bg};border:1px solid ${mood.border};border-radius:var(--r);padding:16px;margin-bottom:12px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
      <span style="font-size:28px">${mood.icon}</span>
      <div>
        <div style="font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.8px">AI বিশ্লেষণ · ${new Date().toLocaleTimeString('bn-BD',{hour:'2-digit',minute:'2-digit'})}</div>
        <div style="font-size:14px;font-weight:700;color:${mood.color};font-family:'Sora',sans-serif">${mood.label} অবস্থা</div>
      </div>
      <button onclick="runAIAnalysis(true)" style="margin-left:auto;padding:5px 10px;border:1px solid ${mood.border};border-radius:var(--r-xs);background:none;color:var(--muted);cursor:pointer;font-family:inherit;font-size:10px;flex-shrink:0">🔄 রিফ্রেশ</button>
    </div>
    <div style="font-size:13px;color:var(--text-2);line-height:1.7">${analysis.summary || ''}</div>
  </div>

  ${(analysis.alerts||[]).length > 0 ? `
  <div style="margin-bottom:12px">
    <div class="sec" style="margin-top:0">🚨 স্মার্ট অ্যালার্ট</div>
    ${analysis.alerts.map(a => `
      <div style="background:${a.level==='high'?'rgba(239,68,68,.07)':a.level==='medium'?'rgba(245,158,11,.07)':'rgba(59,130,246,.07)'};border:1px solid ${a.level==='high'?'rgba(239,68,68,.25)':a.level==='medium'?'rgba(245,158,11,.25)':'rgba(59,130,246,.25)'};border-radius:var(--r-sm);padding:11px 13px;margin-bottom:7px">
        <div style="font-size:12px;font-weight:600;color:${a.level==='high'?'var(--red)':a.level==='medium'?'var(--accent)':'var(--blue)'}">${a.level==='high'?'🔴':a.level==='medium'?'🟡':'🔵'} ${a.text}</div>
        ${a.action ? `<div style="font-size:11px;color:var(--muted);margin-top:4px">👉 ${a.action}</div>` : ''}
      </div>`).join('')}
  </div>` : ''}

  ${(analysis.insights||[]).length > 0 ? `
  <div style="margin-bottom:12px">
    <div class="sec" style="margin-top:0">💡 মূল অন্তর্দৃষ্টি</div>
    ${analysis.insights.map(i => `
      <div style="display:flex;gap:10px;background:var(--card);border:1px solid var(--border-l);border-radius:var(--r-sm);padding:12px;margin-bottom:7px;box-shadow:var(--shadow-sm)">
        <span style="font-size:22px;flex-shrink:0">${i.icon||'📌'}</span>
        <div>
          <div style="font-size:12px;font-weight:600;color:${insightTypes[i.type]||'var(--text)'}">${i.title||''}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:3px;line-height:1.6">${i.text||''}</div>
        </div>
      </div>`).join('')}
  </div>` : ''}

  ${(analysis.recommendations||[]).length > 0 ? `
  <div style="margin-bottom:12px">
    <div class="sec" style="margin-top:0">🎯 AI পরামর্শ</div>
    ${analysis.recommendations.map((r,i) => `
      <div style="display:flex;gap:8px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="width:22px;height:22px;border-radius:50%;background:${r.priority==='high'?'var(--red)':r.priority==='medium'?'var(--accent)':'var(--blue)'};color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">${i+1}</div>
        <div>
          <div style="font-size:12px;color:var(--text-2);line-height:1.6">${r.text||''}</div>
          ${r.impact ? `<div style="font-size:10px;color:var(--muted);margin-top:2px">প্রভাব: ${r.impact}</div>` : ''}
        </div>
      </div>`).join('')}
  </div>` : ''}

  ${analysis.prediction ? `
  <div style="background:linear-gradient(135deg,rgba(139,92,246,.1),rgba(59,130,246,.08));border:1px solid rgba(139,92,246,.25);border-radius:var(--r-sm);padding:13px">
    <div style="font-size:11px;color:var(--purple);font-weight:700;margin-bottom:6px">🔮 AI পূর্বাভাস</div>
    <div style="font-size:12px;color:var(--text-2);line-height:1.7">${analysis.prediction}</div>
  </div>` : ''}`;
}


// ══════════════════════════════════════════════════════════════════
//  📊 ADVANCED CHARTS ENGINE
// ══════════════════════════════════════════════════════════════════

// ── CSS Variable helper
function cv(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

// ── Canvas setup with DPR
function setupCanvas(id, heightPx) {
  const c = document.getElementById(id); if (!c) return null;
  const dpr = window.devicePixelRatio || 1;
  const w = c.parentElement.clientWidth || 300;
  const h = heightPx || parseInt(c.getAttribute('height')) || 100;
  c.width = w * dpr; c.height = h * dpr;
  c.style.width = w + 'px'; c.style.height = h + 'px';
  const ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
  return { c, ctx, w, h };
}

// ── Hex to rgba
function hexA(hex, a) {
  if (hex.startsWith('var(')) {
    const resolved = cv(hex.slice(4,-1));
    hex = resolved || '#3B82F6';
  }
  if (!hex.startsWith('#')) return hex.replace('rgb(', `rgba(`).replace(')', `,${a})`);
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

// ── GAUGE CHART (Revenue vs Target)
function drawGaugeChart(canvasId, value, max, label, color) {
  const r = setupCanvas(canvasId, 120); if (!r) return;
  const { ctx, w, h } = r;
  const cx = w/2, cy = h * 0.72;
  const radius = Math.min(w, h*1.4) * 0.38;
  const pct = Math.min(value / (max||1), 1);
  const startAngle = Math.PI * 0.75;
  const endAngle = Math.PI * 2.25;
  const valueAngle = startAngle + (endAngle - startAngle) * pct;

  ctx.clearRect(0, 0, w, h);

  // Background arc
  ctx.beginPath(); ctx.arc(cx, cy, radius, startAngle, endAngle);
  ctx.strokeStyle = cv('--border') || '#1E2D45';
  ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.stroke();

  // Value arc
  if (pct > 0) {
    const grad = ctx.createLinearGradient(cx-radius, cy, cx+radius, cy);
    grad.addColorStop(0, hexA(color, 0.7));
    grad.addColorStop(1, color);
    ctx.beginPath(); ctx.arc(cx, cy, radius, startAngle, valueAngle);
    ctx.strokeStyle = grad; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.stroke();
  }

  // Center text
  ctx.fillStyle = color; ctx.font = `bold ${Math.round(h*0.22)}px Sora,sans-serif`; ctx.textAlign = 'center';
  ctx.fillText(Math.round(pct*100) + '%', cx, cy + 4);
  ctx.fillStyle = cv('--muted') || '#64748B'; ctx.font = `${Math.round(h*0.1)}px Hind Siliguri,sans-serif`;
  ctx.fillText(label, cx, cy + h*0.16);

  // Min/Max labels
  ctx.fillStyle = cv('--muted'); ctx.font = `9px sans-serif`; ctx.textAlign = 'center';
  ctx.fillText('০', cx - radius*0.85, cy + 12);
  ctx.fillText('১০০%', cx + radius*0.85, cy + 12);
}

// ── MULTI-LINE CHART (Revenue vs Profit vs Expense)
function drawMultiLineChart(canvasId, data) {
  const r = setupCanvas(canvasId, 160); if (!r) return;
  const { ctx, w, h } = r;
  const padL=10, padR=10, padT=20, padB=30;
  const cw=w-padL-padR, ch=h-padT-padB;

  const series = [
    { key:'revenue', color: cv('--blue')||'#3B82F6', label:'বিক্রয়' },
    { key:'profit',  color: cv('--green')||'#10B981', label:'লাভ' },
    { key:'expense', color: cv('--red')||'#EF4444',   label:'খরচ' },
  ];

  const allVals = data.flatMap(d => series.map(s => d[s.key]||0));
  const max = Math.max(...allVals, 1);
  const step = data.length > 1 ? cw / (data.length-1) : cw;

  ctx.clearRect(0, 0, w, h);

  // Grid lines
  ctx.strokeStyle = cv('--border') || '#1E2D45'; ctx.lineWidth = 1;
  [0,0.25,0.5,0.75,1].forEach(t => {
    const y = padT + ch*(1-t);
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL+cw, y); ctx.stroke();
  });

  // Draw each series
  series.forEach(s => {
    // Fill area
    ctx.beginPath();
    data.forEach((d,i) => {
      const x = padL + i*step, y = padT + ch*(1-(d[s.key]||0)/max);
      i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    });
    ctx.lineTo(padL+cw, padT+ch); ctx.lineTo(padL, padT+ch); ctx.closePath();
    const g = ctx.createLinearGradient(0, padT, 0, padT+ch);
    g.addColorStop(0, hexA(s.color, 0.12)); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.fill();

    // Line
    ctx.beginPath();
    data.forEach((d,i) => {
      const x = padL + i*step, y = padT + ch*(1-(d[s.key]||0)/max);
      i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    });
    ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
  });

  // X labels (every 7 days)
  ctx.fillStyle = cv('--muted'); ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
  data.forEach((d,i) => { if (i%7===0||i===data.length-1) ctx.fillText(d.label, padL+i*step, h-4); });

  // Legend
  let lx = padL;
  series.forEach(s => {
    ctx.fillStyle = s.color; ctx.fillRect(lx, 3, 10, 4);
    ctx.fillStyle = cv('--muted'); ctx.font = '9px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(s.label, lx+13, 8); lx += 50;
  });
}

// ── WORKER COMPARISON BAR CHART
function drawWorkerComparisonChart(canvasId, workerStats) {
  const r = setupCanvas(canvasId, 180); if (!r) return;
  const { ctx, w, h } = r;
  const workers = Object.values(workerStats).sort((a,b) => b.revenue-a.revenue).slice(0,6);
  if (!workers.length) return;

  const padL=8, padR=8, padT=20, padB=36;
  const cw=w-padL-padR, ch=h-padT-padB;
  const n=workers.length, barW=Math.min(cw/n*0.55, 32);
  const gap=cw/n;
  const maxRev = Math.max(...workers.map(w=>w.revenue), 1);
  const colors = [cv('--blue'), cv('--green'), cv('--accent'), cv('--purple'), cv('--red'), cv('--blue-l')];

  ctx.clearRect(0, 0, w, h);

  // Grid
  ctx.strokeStyle = cv('--border'); ctx.lineWidth = 1;
  [0,0.25,0.5,0.75,1].forEach(t => {
    const y = padT + ch*(1-t);
    ctx.beginPath(); ctx.moveTo(padL,y); ctx.lineTo(padL+cw,y); ctx.stroke();
  });

  // Bars
  workers.forEach((wk, i) => {
    const x = padL + i*gap + (gap-barW)/2;
    const bh = ch * (wk.revenue/maxRev);
    const y = padT + ch - bh;
    const col = colors[i % colors.length] || '#3B82F6';

    // Bar gradient
    const g = ctx.createLinearGradient(0, y, 0, y+bh);
    g.addColorStop(0, col); g.addColorStop(1, hexA(col, 0.5));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(x, y, barW, bh, [4,4,0,0]);
    ctx.fill();

    // Target line
    if (wk.target > 0) {
      const ty = padT + ch*(1 - Math.min(wk.target/maxRev,1));
      ctx.strokeStyle = hexA(col, 0.6); ctx.lineWidth = 1.5; ctx.setLineDash([3,2]);
      ctx.beginPath(); ctx.moveTo(x-2, ty); ctx.lineTo(x+barW+2, ty); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Revenue label on bar
    if (bh > 20) {
      ctx.fillStyle = '#fff'; ctx.font = `bold 8px Sora,sans-serif`; ctx.textAlign = 'center';
      ctx.fillText('৳'+bnNum(wk.revenue/1000)+'K', x+barW/2, y+12);
    }

    // Name label
    ctx.fillStyle = cv('--muted'); ctx.font = '9px Hind Siliguri,sans-serif'; ctx.textAlign = 'center';
    const name = wk.name.length > 7 ? wk.name.slice(0,6)+'…' : wk.name;
    ctx.fillText(name, x+barW/2, h-20);

    // Target pct
    const pctColor = wk.targetPct >= 100 ? cv('--green') : wk.targetPct >= 60 ? cv('--accent') : cv('--red');
    ctx.fillStyle = pctColor; ctx.font = 'bold 9px Sora,sans-serif';
    ctx.fillText(wk.targetPct+'%', x+barW/2, h-8);
  });

  // Y axis labels
  ctx.fillStyle = cv('--muted'); ctx.font = '8px sans-serif'; ctx.textAlign = 'right';
  [0,0.5,1].forEach(t => {
    const y = padT + ch*(1-t);
    ctx.fillText('৳'+bnNum(maxRev*t/1000)+'K', padL+18, y+3);
  });
}

// ── DONUT CHART (Product mix)
function drawDonutChart(canvasId, data, total) {
  const r = setupCanvas(canvasId, 130); if (!r) return;
  const { ctx, w, h } = r;
  const cx=w*0.4, cy=h/2, outerR=Math.min(cx,cy)*0.85, innerR=outerR*0.55;
  const colors = [cv('--blue'),cv('--green'),cv('--accent'),cv('--purple'),cv('--red'),cv('--blue-l')];

  ctx.clearRect(0, 0, w, h);
  if (!data.length) return;

  let startAngle = -Math.PI/2;
  data.slice(0,5).forEach((d, i) => {
    const slice = (d.value/total) * Math.PI*2;
    const mid = startAngle + slice/2;
    const col = colors[i % colors.length];

    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(startAngle)*innerR, cy + Math.sin(startAngle)*innerR);
    ctx.arc(cx, cy, outerR, startAngle, startAngle+slice);
    ctx.arc(cx, cy, innerR, startAngle+slice, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = col; ctx.fill();

    // Small gap
    ctx.strokeStyle = cv('--bg')||'#0B1120'; ctx.lineWidth = 2; ctx.stroke();

    startAngle += slice;
  });

  // Center text
  ctx.fillStyle = cv('--text'); ctx.font = `bold ${Math.round(h*0.16)}px Sora,sans-serif`; ctx.textAlign = 'center';
  ctx.fillText(data.length + 'টি', cx, cy+4);
  ctx.fillStyle = cv('--muted'); ctx.font = `${Math.round(h*0.1)}px sans-serif`;
  ctx.fillText('পণ্য', cx, cy+h*0.18);

  // Legend
  const lx = w*0.62, ly = h*0.1;
  data.slice(0,5).forEach((d,i) => {
    const col = colors[i % colors.length];
    ctx.fillStyle = col; ctx.fillRect(lx, ly+i*20, 8, 8);
    ctx.fillStyle = cv('--muted'); ctx.font = '9px Hind Siliguri,sans-serif'; ctx.textAlign = 'left';
    const name = d.name.length > 9 ? d.name.slice(0,8)+'…' : d.name;
    ctx.fillText(name, lx+11, ly+i*20+8);
    ctx.fillStyle = cv('--text-2'); ctx.font = 'bold 9px Sora,sans-serif';
    ctx.fillText(Math.round(d.value/total*100)+'%', lx+11, ly+i*20+18);
  });
}

// ── SPARKLINE (Mini chart for summary cards)
function drawSparkline(canvasId, values, color) {
  const cv_el = document.getElementById(canvasId); if (!cv_el||!values.length) return;
  const dpr = window.devicePixelRatio||1;
  const w = cv_el.parentElement.clientWidth-28||100, h=28;
  cv_el.width=w*dpr; cv_el.height=h*dpr;
  cv_el.style.width=w+'px'; cv_el.style.height=h+'px';
  const ctx=cv_el.getContext('2d'); ctx.scale(dpr,dpr);
  const max=Math.max(...values,1), pad=2;
  const step=values.length>1?(w-pad*2)/(values.length-1):0;
  ctx.clearRect(0,0,w,h);
  ctx.beginPath();
  values.forEach((v,i)=>{ const x=pad+i*step, y=h-pad-((v/max)*(h-pad*2)); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
  ctx.strokeStyle=color; ctx.lineWidth=1.5; ctx.lineJoin='round'; ctx.stroke();
  ctx.lineTo(pad+(values.length-1)*step,h); ctx.lineTo(pad,h); ctx.closePath();
  const g=ctx.createLinearGradient(0,0,0,h); g.addColorStop(0,hexA(color,0.25)); g.addColorStop(1,'transparent');
  ctx.fillStyle=g; ctx.fill();
}


// ══════════════════════════════════════════════════════════════════
//  🚨 SMART ANOMALY DETECTION
// ══════════════════════════════════════════════════════════════════
function runAnomalyDetection() {
  const el = document.getElementById('anomalyPanel'); if (!el) return;
  const data = buildAnalyticsData();
  const alerts = [];

  // 1. Revenue drop
  if (data.revenueGrowth < -15) {
    alerts.push({ level:'critical', icon:'📉', text:`বিক্রয় ${Math.abs(data.revenueGrowth)}% কমেছে গত মাসের তুলনায়`, action:'বিক্রয় দলের সাথে জরুরি মিটিং করুন' });
  } else if (data.revenueGrowth < -5) {
    alerts.push({ level:'warning', icon:'⚠️', text:`বিক্রয় ${Math.abs(data.revenueGrowth)}% হ্রাস পেয়েছে`, action:'বাজার পরিস্থিতি বিশ্লেষণ করুন' });
  }

  // 2. Profit margin too low
  if (data.profitMargin < 10 && data.totalRevenue > 0) {
    alerts.push({ level:'critical', icon:'💸', text:`লাভের মার্জিন মাত্র ${data.profitMargin}% — অনেক কম`, action:'খরচ কমান এবং মূল্য পর্যালোচনা করুন' });
  }

  // 3. High due amount
  if (data.totalDue > data.totalRevenue * 0.3) {
    alerts.push({ level:'warning', icon:'🏦', text:`মোট বাকি বিক্রয়ের ${Math.round(data.totalDue/data.totalRevenue*100)}% — ঝুঁকিপূর্ণ`, action:'বাকি আদায়ে প্রাধান্য দিন' });
  }

  // 4. Worker below target
  const belowTarget = Object.values(data.workerStats).filter(w => w.target > 0 && w.targetPct < 50);
  if (belowTarget.length > 0) {
    alerts.push({ level:'warning', icon:'👤', text:`${belowTarget.map(w=>w.name).join(', ')} টার্গেটের ৫০%-এরও কম অর্জন করেছেন`, action:'কারণ জানুন এবং সহায়তা করুন' });
  }

  // 5. Zero sales day
  const recentZero = data.dailyTrend.slice(-7).filter(d => d.revenue === 0);
  if (recentZero.length >= 2) {
    alerts.push({ level:'warning', icon:'📅', text:`গত ৭ দিনে ${recentZero.length}টি দিন কোনো বিক্রয় হয়নি`, action:'সেই দিনগুলোর কারণ বিশ্লেষণ করুন' });
  }

  // 6. Anomaly spikes
  if (data.anomalies.length > 0) {
    alerts.push({ level:'info', icon:'📊', text:`${data.anomalies.length}টি অস্বাভাবিক বিক্রয়ের দিন শনাক্ত`, action:'এই দিনগুলো থেকে শিক্ষা নিন' });
  }

  // 7. High risk due customers
  if (data.highRiskDue.length > 0) {
    alerts.push({ level:'critical', icon:'⚠️', text:`${data.highRiskDue.length}টি দোকানের উচ্চ-ঝুঁকির বাকি — মোট ${bnNum(data.highRiskDue.reduce((a,b)=>a+b.due,0))} টাকা`, action:'এই সপ্তাহেই যোগাযোগ করুন' });
  }

  if (!alerts.length) {
    el.innerHTML = `<div style="text-align:center;padding:16px;color:var(--green)"><div style="font-size:24px">✅</div><div style="font-size:12px;margin-top:6px">কোনো অস্বাভাবিকতা নেই</div></div>`;
    return;
  }

  const levelConfig = {
    critical: { bg:'rgba(239,68,68,.08)', border:'rgba(239,68,68,.3)', color:'var(--red)' },
    warning:  { bg:'rgba(245,158,11,.08)', border:'rgba(245,158,11,.3)', color:'var(--accent)' },
    info:     { bg:'rgba(59,130,246,.08)', border:'rgba(59,130,246,.3)', color:'var(--blue)' },
  };

  el.innerHTML = alerts.map(a => {
    const lc = levelConfig[a.level] || levelConfig.info;
    return `<div style="background:${lc.bg};border:1px solid ${lc.border};border-radius:var(--r-sm);padding:12px;margin-bottom:8px">
      <div style="display:flex;gap:8px;align-items:flex-start">
        <span style="font-size:18px;flex-shrink:0">${a.icon}</span>
        <div>
          <div style="font-size:12px;font-weight:600;color:${lc.color}">${a.text}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:4px">👉 ${a.action}</div>
        </div>
      </div>
    </div>`;
  }).join('');
}


// ══════════════════════════════════════════════════════════════════
//  📅 AUTO REPORT PDF (Daily & Weekly)
// ══════════════════════════════════════════════════════════════════
window.generateDailyReport = async () => {
  const data = buildAnalyticsData();
  const now = new Date();
  const dateStr = now.toLocaleDateString('bn-BD', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const workers = Object.values(data.workerStats).sort((a,b) => b.revenue-a.revenue);
  const products = Object.entries(data.productStats).sort((a,b) => b[1].revenue-a[1].revenue).slice(0,5);

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Arial,sans-serif;padding:24px;color:#1a202c;font-size:12px;max-width:800px;margin:0 auto;}
  .header{background:linear-gradient(135deg,#1E3A8A,#1e40af);color:#fff;padding:20px 24px;border-radius:10px;margin-bottom:20px;}
  .header h1{font-size:20px;font-weight:800;}
  .header .sub{font-size:11px;opacity:.8;margin-top:4px;}
  .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;}
  .kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;text-align:center;}
  .kpi .label{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;}
  .kpi .value{font-size:18px;font-weight:800;margin-top:4px;}
  .kpi .change{font-size:10px;margin-top:3px;}
  .section{margin-bottom:20px;}
  .section h2{font-size:14px;font-weight:700;color:#1E3A8A;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #e2e8f0;}
  table{width:100%;border-collapse:collapse;}
  th{background:#1E3A8A;color:#fff;padding:8px 10px;text-align:left;font-size:11px;}
  td{padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;}
  tr:nth-child(even){background:#f8fafc;}
  .good{color:#059669;font-weight:700;}
  .warn{color:#d97706;font-weight:700;}
  .bad{color:#dc2626;font-weight:700;}
  .footer{text-align:center;margin-top:20px;font-size:10px;color:#94a3b8;padding-top:12px;border-top:1px solid #e2e8f0;}
  .growth-up{color:#059669;}.growth-down{color:#dc2626;}
  @media print{body{padding:0;}}
</style>
</head><body>
<div class="header">
  <h1>📊 NovaTEch BD — দৈনিক ব্যবসায়িক প্রতিবেদন</h1>
  <div class="sub">${dateStr} | তৈরি: ${now.toLocaleTimeString('bn-BD',{hour:'2-digit',minute:'2-digit'})}</div>
</div>

<div class="kpi-grid">
  <div class="kpi">
    <div class="label">আজকের বিক্রয়</div>
    <div class="value" style="color:#2563eb">৳${bnNum(data.todayRevenue)}</div>
    <div class="change">${data.todayTxCount}টি লেনদেন</div>
  </div>
  <div class="kpi">
    <div class="label">মাসিক বিক্রয়</div>
    <div class="value" style="color:#2563eb">৳${bnNum(data.totalRevenue)}</div>
    <div class="change ${data.revenueGrowth>=0?'growth-up':'growth-down'}">${data.revenueGrowth>=0?'▲':'▼'} ${Math.abs(data.revenueGrowth)}%</div>
  </div>
  <div class="kpi">
    <div class="label">মাসিক লাভ</div>
    <div class="value" style="color:#059669">৳${bnNum(data.totalProfit)}</div>
    <div class="change">মার্জিন: ${data.profitMargin}%</div>
  </div>
  <div class="kpi">
    <div class="label">মোট বাকি</div>
    <div class="value" style="color:#dc2626">৳${bnNum(data.totalDue)}</div>
    <div class="change">${data.highRiskDue.length}টি উচ্চ ঝুঁকি</div>
  </div>
</div>

${workers.length ? `
<div class="section">
  <h2>👥 কর্মী পারফরম্যান্স</h2>
  <table>
    <tr><th>কর্মী</th><th>বিক্রয়</th><th>লাভ</th><th>টার্গেট</th><th>অর্জন</th><th>উপস্থিতি</th><th>দেরি</th></tr>
    ${workers.map(w => `<tr>
      <td><b>${w.name}</b></td>
      <td>৳${bnNum(w.revenue)}</td>
      <td>৳${bnNum(w.profit)}</td>
      <td>৳${bnNum(w.target)}</td>
      <td class="${w.targetPct>=100?'good':w.targetPct>=60?'warn':'bad'}">${w.targetPct}%</td>
      <td>${w.attDays} দিন</td>
      <td class="${w.lateCount>=3?'bad':w.lateCount>0?'warn':''}">${w.lateCount} বার</td>
    </tr>`).join('')}
  </table>
</div>` : ''}

${products.length ? `
<div class="section">
  <h2>📦 শীর্ষ পণ্য</h2>
  <table>
    <tr><th>পণ্য</th><th>বিক্রয় (পিস)</th><th>রাজস্ব</th><th>লাভ</th></tr>
    ${products.map(([name,s]) => `<tr>
      <td>${name}</td><td>${bnNum(s.qty)} পিস</td>
      <td>৳${bnNum(s.revenue)}</td><td>৳${bnNum(s.profit)}</td>
    </tr>`).join('')}
  </table>
</div>` : ''}

${data.highRiskDue.length ? `
<div class="section">
  <h2>⚠️ ঝুঁকিপূর্ণ বাকি</h2>
  <table>
    <tr><th>দোকান</th><th>বাকির পরিমাণ</th><th>সর্বশেষ লেনদেন</th></tr>
    ${data.highRiskDue.slice(0,10).map(c => `<tr>
      <td>${c.shop}</td><td class="bad">৳${bnNum(c.due)}</td><td>${c.lastDate}</td>
    </tr>`).join('')}
  </table>
</div>` : ''}

<div class="footer">
  NovaTEch BD Management System | ${dateStr}<br>
  এই প্রতিবেদন স্বয়ংক্রিয়ভাবে তৈরি হয়েছে
</div>
</body></html>`;

  const w = window.open('','_blank');
  w.document.write(html); w.document.close();
  setTimeout(() => w.print(), 600);
  if (typeof auditLog === 'function') auditLog('daily_report', 'দৈনিক রিপোর্ট PDF তৈরি');
};

window.generateWeeklyReport = async () => {
  const data = buildAnalyticsData();
  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate()-now.getDay());
  const weekStr = weekStart.toLocaleDateString('bn-BD',{day:'numeric',month:'short'}) + ' — ' + now.toLocaleDateString('bn-BD',{day:'numeric',month:'short',year:'numeric'});

  const weekSalesData = data.dailyTrend.slice(-7);
  const weekRevenue = weekSalesData.reduce((a,b) => a+b.revenue, 0);
  const weekProfit = weekSalesData.reduce((a,b) => a+b.profit, 0);
  const weekExp = weekSalesData.reduce((a,b) => a+b.expense, 0);
  const bestDay = weekSalesData.reduce((a,b) => a.revenue>b.revenue?a:b, {revenue:0,label:'-'});

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Arial,sans-serif;padding:24px;color:#1a202c;font-size:12px;max-width:800px;margin:0 auto;}
  .header{background:linear-gradient(135deg,#1E3A8A,#7C3AED);color:#fff;padding:22px 24px;border-radius:10px;margin-bottom:20px;}
  .header h1{font-size:20px;font-weight:800;}
  .header .sub{font-size:11px;opacity:.8;margin-top:4px;}
  .kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;}
  .kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;text-align:center;border-top:3px solid;}
  .kpi .label{font-size:10px;color:#64748b;text-transform:uppercase;}
  .kpi .value{font-size:20px;font-weight:800;margin-top:5px;}
  .day-table tr{border-bottom:1px solid #e2e8f0;}
  .day-table td{padding:9px 10px;font-size:11px;}
  .day-bar{display:inline-block;height:8px;background:#1E3A8A;border-radius:4px;transition:width .3s;}
  section{margin-bottom:20px;}
  section h2{font-size:14px;font-weight:700;color:#1E3A8A;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #e2e8f0;}
  table{width:100%;border-collapse:collapse;}
  th{background:#1E3A8A;color:#fff;padding:8px 10px;text-align:left;font-size:11px;}
  td{padding:8px 10px;border-bottom:1px solid #e2e8f0;}
  tr:nth-child(even){background:#f8fafc;}
  .footer{text-align:center;margin-top:20px;font-size:10px;color:#94a3b8;padding-top:12px;border-top:1px solid #e2e8f0;}
  @media print{body{padding:0;}}
</style>
</head><body>
<div class="header">
  <h1>📈 NovaTEch BD — সাপ্তাহিক প্রতিবেদন</h1>
  <div class="sub">${weekStr}</div>
</div>

<div class="kpi-grid">
  <div class="kpi" style="border-top-color:#2563eb">
    <div class="label">সাপ্তাহিক বিক্রয়</div>
    <div class="value" style="color:#2563eb">৳${bnNum(weekRevenue)}</div>
  </div>
  <div class="kpi" style="border-top-color:#059669">
    <div class="label">সাপ্তাহিক লাভ</div>
    <div class="value" style="color:#059669">৳${bnNum(weekProfit)}</div>
  </div>
  <div class="kpi" style="border-top-color:#d97706">
    <div class="label">সেরা দিন</div>
    <div class="value" style="color:#d97706;font-size:14px">${bestDay.label}<br>৳${bnNum(bestDay.revenue)}</div>
  </div>
</div>

<section>
  <h2>📅 দিন অনুযায়ী বিক্রয়</h2>
  <table class="day-table">
    <tr><th>তারিখ</th><th>বিক্রয়</th><th>লাভ</th><th>খরচ</th><th>লেনদেন</th><th>গ্রাফ</th></tr>
    ${weekSalesData.map(d => `<tr>
      <td><b>${d.label}</b></td>
      <td style="color:#2563eb">৳${bnNum(d.revenue)}</td>
      <td style="color:#059669">৳${bnNum(d.profit)}</td>
      <td style="color:#dc2626">৳${bnNum(d.expense)}</td>
      <td>${d.txCount}টি</td>
      <td><div class="day-bar" style="width:${weekRevenue>0?Math.round(d.revenue/Math.max(...weekSalesData.map(x=>x.revenue),1)*80):0}px"></div></td>
    </tr>`).join('')}
    <tr style="background:#f0fdf4;font-weight:700">
      <td>মোট</td>
      <td>৳${bnNum(weekRevenue)}</td>
      <td>৳${bnNum(weekProfit)}</td>
      <td>৳${bnNum(weekExp)}</td>
      <td>${weekSalesData.reduce((a,b)=>a+b.txCount,0)}টি</td>
      <td></td>
    </tr>
  </table>
</section>

${Object.values(data.workerStats).length ? `
<section>
  <h2>👥 কর্মী সাপ্তাহিক পারফরম্যান্স</h2>
  <table>
    <tr><th>কর্মী</th><th>মাসিক বিক্রয়</th><th>টার্গেট অর্জন</th><th>উপস্থিতি</th></tr>
    ${Object.values(data.workerStats).sort((a,b)=>b.revenue-a.revenue).map(w => `<tr>
      <td><b>${w.name}</b></td>
      <td>৳${bnNum(w.revenue)}</td>
      <td style="color:${w.targetPct>=100?'#059669':w.targetPct>=60?'#d97706':'#dc2626'};font-weight:700">${w.targetPct}%</td>
      <td>${w.attDays} দিন</td>
    </tr>`).join('')}
  </table>
</section>` : ''}

<div class="footer">
  NovaTEch BD Management System | সাপ্তাহিক স্বয়ংক্রিয় প্রতিবেদন<br>
  তৈরি: ${now.toLocaleString('bn-BD',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}
</div>
</body></html>`;

  const w = window.open('','_blank');
  w.document.write(html); w.document.close();
  setTimeout(() => w.print(), 600);
  if (typeof auditLog === 'function') auditLog('weekly_report', 'সাপ্তাহিক রিপোর্ট PDF তৈরি');
};


// ══════════════════════════════════════════════════════════════════
//  🎛️ ENTERPRISE DASHBOARD RENDERER
// ══════════════════════════════════════════════════════════════════
window.renderEnterpriseDashboard = function() {
  if (window.CR === 'worker') return;

  const data = buildAnalyticsData();
  const el = document.getElementById('enterpriseDashboard');
  if (!el) return;

  el.innerHTML = `
  <!-- KPI Row with Gauges -->
  <div class="sec" style="margin-top:0">🎯 টার্গেট ড্যাশবোর্ড</div>
  <div class="sum-grid" style="grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:12px">
    <div class="form-card" style="padding:12px 10px;text-align:center">
      <div style="font-size:11px;color:var(--muted);margin-bottom:4px">মাসিক বিক্রয় অর্জন</div>
      <canvas id="gaugeRevenue" height="110"></canvas>
      <div style="font-size:11px;color:var(--blue);margin-top:4px;font-weight:600">৳${bnNum(data.totalRevenue)}</div>
    </div>
    <div class="form-card" style="padding:12px 10px;text-align:center">
      <div style="font-size:11px;color:var(--muted);margin-bottom:4px">লাভের মার্জিন</div>
      <canvas id="gaugeProfit" height="110"></canvas>
      <div style="font-size:11px;color:var(--green);margin-top:4px;font-weight:600">৳${bnNum(data.totalProfit)}</div>
    </div>
  </div>

  <!-- Multi-line Revenue Chart -->
  <div class="sec">📊 ৩০ দিনের বিক্রয় / লাভ / খরচ</div>
  <div class="form-card" style="padding:14px 10px">
    <canvas id="multiLineChart" height="160"></canvas>
  </div>

  <!-- Worker Comparison -->
  <div class="sec">👥 কর্মী তুলনামূলক বিশ্লেষণ</div>
  <div class="form-card" style="padding:14px 10px">
    <canvas id="workerCompChart" height="180"></canvas>
  </div>

  <!-- Product Donut -->
  <div class="sec">📦 পণ্য বিতরণ</div>
  <div class="form-card" style="padding:14px 10px">
    <canvas id="productDonut" height="130"></canvas>
  </div>

  <!-- Anomaly Detection -->
  <div class="sec">🚨 স্মার্ট অ্যালার্ট</div>
  <div id="anomalyPanel"></div>

  <!-- AI Analysis -->
  <div class="sec">🤖 AI ব্যবসায়িক বিশ্লেষণ (Claude)</div>
  <div class="form-card" style="padding:0;overflow:hidden">
    <div id="aiAnalysisPanel" style="padding:16px">
      <div style="text-align:center;padding:20px;color:var(--muted)">
        <div style="font-size:32px;margin-bottom:8px">🤖</div>
        <div style="font-size:13px">AI বিশ্লেষণ শুরু করতে নিচের বাটন চাপুন</div>
        <button onclick="runAIAnalysis(true)" style="margin-top:12px;padding:10px 20px;background:linear-gradient(135deg,var(--primary),var(--primary-l));border:none;border-radius:var(--r-sm);color:#fff;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600">🤖 AI বিশ্লেষণ শুরু করুন</button>
      </div>
    </div>
  </div>

  <!-- Auto Report Buttons -->
  <div class="sec">📅 স্বয়ংক্রিয় প্রতিবেদন</div>
  <div class="g2" style="gap:8px;margin-bottom:14px">
    <button onclick="generateDailyReport()" class="btn" style="background:rgba(59,130,246,.12);border:1.5px solid var(--blue);color:var(--blue);font-family:inherit;font-size:12px;padding:12px">📄 দৈনিক রিপোর্ট PDF</button>
    <button onclick="generateWeeklyReport()" class="btn" style="background:rgba(139,92,246,.12);border:1.5px solid var(--purple);color:var(--purple);font-family:inherit;font-size:12px;padding:12px">📈 সাপ্তাহিক রিপোর্ট PDF</button>
  </div>`;

  // Draw all charts after DOM ready
  requestAnimationFrame(() => {
    const totalTarget = Object.values(data.workerStats).reduce((a,b) => a+b.target, 0) || data.totalRevenue * 1.2;
    drawGaugeChart('gaugeRevenue', data.totalRevenue, totalTarget, 'বিক্রয়', cv('--blue')||'#3B82F6');
    drawGaugeChart('gaugeProfit', data.profitMargin, 30, 'মার্জিন', cv('--green')||'#10B981');
    drawMultiLineChart('multiLineChart', data.dailyTrend);
    drawWorkerComparisonChart('workerCompChart', data.workerStats);

    // Product donut data
    const productData = Object.entries(data.productStats)
      .sort((a,b) => b[1].revenue-a[1].revenue).slice(0,5)
      .map(([name,s]) => ({ name, value: s.revenue }));
    const productTotal = productData.reduce((a,b) => a+b.value, 0);
    drawDonutChart('productDonut', productData, productTotal);

    // Anomaly detection
    runAnomalyDetection();

    // Auto AI analysis after 1 second
    setTimeout(() => runAIAnalysis(false), 1000);
  });
};

// Auto-refresh every 5 minutes
function startAnalyticsAutoRefresh() {
  if (analyticsRefreshTimer) clearInterval(analyticsRefreshTimer);
  analyticsRefreshTimer = setInterval(() => {
    if (window.CR !== 'worker') {
      window.renderEnterpriseDashboard();
    }
  }, 5 * 60 * 1000);
}

// Export for app.js
window.buildAnalyticsData = buildAnalyticsData;
// ✅ FIX: runAIAnalysis window-এ expose করি (HTML onclick থেকে call হয়)
window.runAIAnalysis = runAIAnalysis;
window.drawSparklines = function() {
  const days = [];
  for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);days.push(d.toISOString().split('T')[0]);}
  const sales = Object.values(window.allSales||{});
  const exps = Object.values(window.allExpenses||{});
  const saleTotals=days.map(d=>sales.filter(s=>s.date===d).reduce((a,b)=>a+(b.total||0),0));
  const profitTotals=days.map(d=>sales.filter(s=>s.date===d).reduce((a,b)=>a+(b.profit||0),0));
  const expTotals=days.map(d=>exps.filter(e=>e.date===d).reduce((a,b)=>a+(b.amount||0),0));
  const dueTotals=days.map(d=>sales.filter(s=>s.date===d).reduce((a,b)=>a+(b.due||0),0));
  drawSparkline('sparkSale',saleTotals,cv('--blue')||'#3B82F6');
  drawSparkline('sparkProfit',profitTotals,cv('--green')||'#10B981');
  drawSparkline('sparkExp',expTotals,cv('--red')||'#EF4444');
  drawSparkline('sparkDue',dueTotals,cv('--purple')||'#8B5CF6');
};

// Initialize on load
document.addEventListener('DOMContentLoaded', startAnalyticsAutoRefresh);


// ══════════════════════════════════════════════════════════════════
//  🤖 AI MANAGER SYSTEM — NovaTEch BD এর 2nd ম্যানেজার
// ══════════════════════════════════════════════════════════════════

let aiChatHistory = [];
let aiManagerInitialized = false;

// AI Manager পেজ render
window.renderAIManager = async function() {
  const el = document.getElementById('aiManagerPanel');
  if(!el) return;
  if(!aiManagerInitialized) {
    aiManagerInitialized = true;
    // স্বাগত বার্তা
    aiChatHistory = [{
      role: 'assistant',
      content: `আসসালামু আলাইকুম! আমি NovaTEch BD-এর AI ম্যানেজার। 🤖

আমি আপনার ব্যবসার সব ডেটা দেখতে পাচ্ছি এবং আপনাকে সাহায্য করতে পারব:

• 📊 **বিক্রয় ও লাভের বিশ্লেষণ**
• 👥 **কর্মী পারফরম্যান্স রিপোর্ট**
• 🏪 **কাস্টমার তথ্য ও বাকির হিসাব**
• 📈 **ভবিষ্যৎ পরিকল্পনার পরামর্শ**
• ⚠️ **সমস্যা চিহ্নিত করা ও সমাধান**

আমাকে যেকোনো প্রশ্ন করুন বাংলায়! যেমন:
_"আজকের বিক্রয় কেমন হলো?"_
_"কোন কর্মী সবচেয়ে ভালো করছে?"_
_"এই মাসে কত লাভ হলো?"_`
    }];
    renderChatMessages();
  }
};

function renderChatMessages() {
  const el = document.getElementById('aiChatMessages');
  if(!el) return;
  el.innerHTML = aiChatHistory.map(msg => {
    const isAI = msg.role === 'assistant';
    const text = msg.content.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/\*(.*?)\*/g, '<i>$1</i>')
      .replace(/_(.*?)_/g, '<i>$1</i>')
      .replace(/
/g, '<br>');
    return `<div style="display:flex;gap:8px;margin-bottom:14px;align-items:flex-start;${isAI?'':'flex-direction:row-reverse'}">
      <div style="width:34px;height:34px;border-radius:50%;background:${isAI?'linear-gradient(135deg,#7C3AED,#3B82F6)':'linear-gradient(135deg,var(--accent),var(--blue)'};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">
        ${isAI?'🤖':'👤'}
      </div>
      <div style="max-width:80%;background:${isAI?'var(--card)':'rgba(245,166,35,.15)'};border:1px solid ${isAI?'var(--border)':'rgba(245,166,35,.3)'};border-radius:${isAI?'4px 14px 14px 14px':'14px 4px 14px 14px'};padding:10px 13px;font-size:13px;line-height:1.6">
        ${text}
      </div>
    </div>`;
  }).join('');
  el.scrollTop = el.scrollHeight;
}

async function getAIKey() {
  // ১. cache থেকে
  if(window._ntAIKey) return window._ntAIKey;
  // ২. Firebase থেকে
  try {
    const db = window._firebaseDB || window.db;
    if(db) {
      const { ref, get } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js');
      const snap = await get(ref(db,'aiConfig'));
      if(snap.exists()) {
        const d = snap.val();
        const key = d.apiKey || d.anthropicApiKey || '';
        if(key) { window._ntAIKey = key; return key; }
      }
    }
  } catch(e) { console.log('AI key load error:', e.message); }
  // ৩. localStorage fallback
  return localStorage.getItem('nt-ai-key') || '';
}

function buildContextPrompt() {
  const data = buildAnalyticsData();
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const workers = Object.values(data.workerStats).map(w =>
    `${w.name} (${Object.values(window.allUsers||{}).find(u=>u.name===w.name)?.role||'worker'}): বিক্রয়=৳${Math.round(w.revenue)}, টার্গেট=৳${w.target} (${w.targetPct}%), উপস্থিতি=${w.attDays} দিন, দেরি=${w.lateCount} বার`
  ).join('
');

  const topCusts = Object.entries(
    Object.values(window.allSales||{}).filter(s=>{const d=new Date(s.date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();})
    .reduce((m,s)=>{m[s.shop]=(m[s.shop]||0)+s.total;return m;},{})
  ).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([s,t])=>`${s}: ৳${Math.round(t)}`).join(', ');

  const highDue = Object.entries(
    Object.values(window.allSales||{}).filter(s=>s.due>0)
    .reduce((m,s)=>{m[s.shop]=(m[s.shop]||0)+s.due;return m;},{})
  ).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([s,d])=>`${s}: ৳${Math.round(d)}`).join(', ');

  const topProducts = Object.entries(data.productStats).sort((a,b)=>b[1].revenue-a[1].revenue).slice(0,5)
    .map(([n,s])=>`${n}: ${s.qty}পিস, ৳${Math.round(s.revenue)}`).join(', ');

  const routes = Object.values(window.allRoutes||{}).map(r=>r.name).join(', ');
  const totalWorkers = Object.values(window.allUsers||{}).filter(u=>u.role==='worker').length;
  const totalManagers = Object.values(window.allUsers||{}).filter(u=>u.role==='manager').length;

  return `তুমি NovaTEch BD কোম্পানির AI ম্যানেজার। তুমি ব্যবসার সিনিয়র ম্যানেজার হিসেবে কাজ করো।

## আজকের তারিখ: ${todayStr}
## কোম্পানির তথ্য:
- মোট কর্মী: ${totalWorkers} জন, ম্যানেজার: ${totalManagers} জন
- রুট: ${routes||'নেই'}

## এই মাসের ব্যবসার অবস্থা:
- মোট বিক্রয়: ৳${Math.round(data.totalRevenue)} (আগের মাসের তুলনায় ${data.revenueGrowth>0?'+':''}${data.revenueGrowth}%)
- মোট লাভ: ৳${Math.round(data.totalProfit)} (মার্জিন: ${data.profitMargin}%)
- মোট খরচ: ৳${Math.round(data.totalExpense)}
- মোট বাকি: ৳${Math.round(data.totalDue)}
- আজকের বিক্রয়: ৳${Math.round(data.todayRevenue)} (${data.todayTxCount}টি অর্ডার)

## কর্মী পারফরম্যান্স:
${workers||'ডেটা নেই'}

## শীর্ষ কাস্টমার:
${topCusts||'ডেটা নেই'}

## সর্বোচ্চ বাকি:
${highDue||'কোনো বাকি নেই'}

## শীর্ষ পণ্য:
${topProducts||'ডেটা নেই'}

নির্দেশনা:
- সবসময় বাংলায় উত্তর দাও
- সংখ্যা দিয়ে প্রমাণ করো
- ব্যবহারিক পরামর্শ দাও
- সরাসরি ও স্পষ্ট হও
- প্রয়োজনে ইমোজি ব্যবহার করো
- উত্তর বেশি লম্বা না করে সংক্ষিপ্ত ও কার্যকর রাখো`;
}

window.sendAIMessage = async function() {
  const input = document.getElementById('aiChatInput');
  if(!input) return;
  const msg = input.value.trim();
  if(!msg) return;

  // User বার্তা যোগ
  aiChatHistory.push({role:'user', content:msg});
  input.value = '';
  renderChatMessages();

  // Loading দেখানো
  aiChatHistory.push({role:'assistant', content:'⏳ চিন্তা করছি...'});
  renderChatMessages();

  const apiKey = await getAIKey();
  if(!apiKey) {
    aiChatHistory.pop();
    aiChatHistory.push({role:'assistant', content:'❌ API Key সেট করা হয়নি। ⚙️ Admin → AI Config এ গিয়ে Anthropic API Key দিন।'});
    renderChatMessages();
    return;
  }

  try {
    const systemPrompt = buildContextPrompt();
    // শেষ ১০টি বার্তা পাঠানো (loading বাদে)
    const msgs = aiChatHistory.slice(0,-1).filter(m=>m.content!=='⏳ চিন্তা করছি...').slice(-10);

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        system: systemPrompt,
        messages: msgs
      })
    });

    const data = await resp.json();
    const reply = data.content?.[0]?.text || 'উত্তর পাওয়া যায়নি';

    aiChatHistory.pop(); // loading সরাও
    aiChatHistory.push({role:'assistant', content:reply});
    renderChatMessages();

  } catch(e) {
    aiChatHistory.pop();
    aiChatHistory.push({role:'assistant', content:`❌ সংযোগ সমস্যা: ${e.message}`});
    renderChatMessages();
  }
};

window.askQuickQuestion = function(q) {
  const input = document.getElementById('aiChatInput');
  if(input) { input.value = q; window.sendAIMessage(); }
};

// Enterprise রিপোর্ট — সব বিশ্লেষণ একসাথে
window.runEnterpriseReport = async function() {
  const questions = [
    "এই মাসের সামগ্রিক ব্যবসার Enterprise রিপোর্ট দাও: কর্মী পারফরম্যান্স, পণ্য ট্রেন্ড, রুট বিশ্লেষণ, বাকির ঝুঁকি, এবং আগামী ৩০ দিনের কৌশলগত পরামর্শ সহ।"
  ];
  for(const q of questions) {
    aiChatHistory.push({role:'user', content:q});
    renderChatMessages();
    await window.sendAIMessageInternal(q);
  }
};

// Internal send (no input box)
window.sendAIMessageInternal = async function(msg) {
  aiChatHistory.push({role:'assistant', content:'⏳ বিশ্লেষণ করছি...'});
  renderChatMessages();
  const apiKey = await getAIKey();
  if(!apiKey) {
    aiChatHistory.pop();
    aiChatHistory.push({role:'assistant', content:'❌ API Key নেই'});
    renderChatMessages();
    return;
  }
  try {
    const systemPrompt = buildContextPrompt();
    const msgs = aiChatHistory.filter(m=>!m.content.includes('⏳')).slice(-12);
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:1500,system:systemPrompt,messages:msgs})
    });
    const data = await resp.json();
    const reply = data.content?.[0]?.text||'উত্তর পাওয়া যায়নি';
    aiChatHistory.pop();
    aiChatHistory.push({role:'assistant', content:reply});
    renderChatMessages();
  } catch(e) {
    aiChatHistory.pop();
    aiChatHistory.push({role:'assistant', content:`❌ সমস্যা: ${e.message}`});
    renderChatMessages();
  }
};

window.clearAIChat = function() {
  aiChatHistory = [];
  aiManagerInitialized = false;
  window.renderAIManager();
};

// Enter চাপলে send
document.addEventListener('keydown', function(e) {
  if(e.key === 'Enter' && !e.shiftKey && document.activeElement?.id === 'aiChatInput') {
    e.preventDefault();
    window.sendAIMessage();
  }
});

// ══════════════════════════════════════════════════════════════════
//  🚀 ENTERPRISE AI AUTOMATION ENGINE
//  - অটো সতর্কবার্তা, প্রেডিকশন, স্মার্ট অ্যালার্ট
// ══════════════════════════════════════════════════════════════════

let aiAlertsSent = {};       // duplicate এড়ানো
let aiDailyReportDone = '';  // একদিনে একবার
let aiAutoEngine = null;

// ── মূল অটো-ইঞ্জিন (প্রতি ১০ মিনিটে চলে)
async function runAIAutoEngine() {
  if(window.CR !== 'admin' && window.CR !== 'manager') return;
  const apiKey = await getAIKey();
  if(!apiKey) return;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const hour = now.getHours();

  try {
    // ১. সকালের ব্রিফিং (৮-৯টার মধ্যে, একবার)
    if(hour >= 8 && hour < 9 && aiDailyReportDone !== todayStr) {
      aiDailyReportDone = todayStr;
      await runMorningBriefing(apiKey, todayStr);
    }

    // ২. রিয়েল-টাইম সতর্কবার্তা (সবসময়)
    await checkAndSendAlerts(apiKey, todayStr);

    // ৩. বিক্রয় ট্রেন্ড আপডেট
    updateLiveTrend();

  } catch(e) { console.log('AI Engine error:', e.message); }
}

// ── সকালের ব্রিফিং
async function runMorningBriefing(apiKey, date) {
  const data = buildAnalyticsData();
  const allSalesArr = Object.values(window.allSales||{});
  const allUsersObj = window.allUsers||{};
  const allRoutesObj = window.allRoutes||{};

  // গতকালের ডেটা
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate()-1);
  const yStr = yesterday.toISOString().split('T')[0];
  const ySales = allSalesArr.filter(s=>s.date===yStr);
  const yRev = ySales.reduce((a,s)=>a+(s.total||0),0);

  // দেরিতে আসা কর্মী (এই মাস)
  const now = new Date();
  const lateSummary = {};
  Object.values(window.allAttendance||{}).forEach(a=>{
    const d=new Date(a.date);
    if(a.isLate&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()){
      lateSummary[a.uid]={name:a.name,count:(lateSummary[a.uid]?.count||0)+1};
    }
  });
  const lateWorkers = Object.values(lateSummary).filter(w=>w.count>=1).map(w=>`${w.name}(${w.count}বার)`).join(', ');

  const prompt = `তুমি NovaTEch BD-এর AI ম্যানেজার। আজ ${date}-এর সকালের ব্রিফিং তৈরি করো।

গতকালের বিক্রয়: ৳${Math.round(yRev)} (${ySales.length}টি অর্ডার)
এই মাসের বিক্রয়: ৳${Math.round(data.totalRevenue)}, লাভ: ৳${Math.round(data.totalProfit)}
মোট বাকি: ৳${Math.round(data.totalDue)}
দেরিতে আসা কর্মী: ${lateWorkers||'কেউ না'}

সংক্ষিপ্ত সকালের ব্রিফিং দাও (৫-৭ লাইন):
- আজকের টপ ৩ অগ্রাধিকার
- গতকালের মূল্যায়ন  
- আজকের লক্ষ্য`;

  const reply = await callClaude(apiKey, prompt, 400);
  showAINotification('🌅 সকালের ব্রিফিং', reply, 'briefing');
}

// ── স্বয়ংক্রিয় সতর্কবার্তা চেক
async function checkAndSendAlerts(apiKey, todayStr) {
  const now = new Date();
  const allSalesArr = Object.values(window.allSales||{});
  const allUsersObj = window.allUsers||{};
  const allAttArr = Object.values(window.allAttendance||{});

  // ১. দেরিতে আসা কর্মী (৩+ বার এই মাস)
  const lateMap = {};
  allAttArr.forEach(a=>{
    const d=new Date(a.date);
    if(a.isLate&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()){
      if(!lateMap[a.uid])lateMap[a.uid]={name:a.name,uid:a.uid,count:0,dates:[]};
      lateMap[a.uid].count++;
      lateMap[a.uid].dates.push(a.date);
    }
  });
  for(const [uid,w] of Object.entries(lateMap)) {
    if(w.count>=3) {
      const key=`late_${uid}_${now.getMonth()}`;
      if(!aiAlertsSent[key]) {
        aiAlertsSent[key]=true;
        const msg = await callClaude(apiKey,
          `তুমি NovaTEch BD-এর AI ম্যানেজার। ${w.name} এই মাসে ${w.count}বার দেরিতে এসেছে (${w.dates.slice(-3).join(', ')})।
          তাকে একটি সংক্ষিপ্ত পেশাদার সতর্কবার্তা লিখো বাংলায় (৩-৪ লাইন)।`, 200);
        showAINotification(`⚠️ দেরি সতর্কবার্তা — ${w.name}`, msg, 'warning');
        // Firebase এ সেভ করা
        saveAIAlert(uid, 'late_warning', msg, w.name);
      }
    }
  }

  // ২. টার্গেট মিস (মাসের ২০ তারিখের পরে ৫০% এরও কম)
  if(now.getDate() >= 20) {
    const data = buildAnalyticsData();
    for(const [uid, w] of Object.entries(data.workerStats)) {
      if(w.target>0 && w.targetPct<50) {
        const key=`target_${uid}_${now.getMonth()}`;
        if(!aiAlertsSent[key]) {
          aiAlertsSent[key]=true;
          const msg = await callClaude(apiKey,
            `${w.name} মাসের ${now.getDate()} তারিখে টার্গেটের মাত্র ${w.targetPct}% অর্জন করেছে (টার্গেট: ৳${w.target}, বিক্রয়: ৳${Math.round(w.revenue)})।
            তাকে অনুপ্রেরণামূলক কিন্তু সরাসরি একটি বার্তা লিখো বাংলায় (৩-৪ লাইন)।`, 200);
          showAINotification(`🎯 টার্গেট সতর্কতা — ${w.name}`, msg, 'warning');
          saveAIAlert(uid, 'target_warning', msg, w.name);
        }
      }
    }
  }

  // ৩. বাকি বাড়ছে (গত ৭ দিনে নতুন বাকি)
  const recentDue = allSalesArr.filter(s=>{
    const d=new Date(s.date);
    const diff=(now-d)/(1000*60*60*24);
    return s.due>0&&diff<=7;
  });
  if(recentDue.length>0) {
    const dueByShop={};
    recentDue.forEach(s=>{dueByShop[s.shop]=(dueByShop[s.shop]||0)+s.due;});
    const highDue=Object.entries(dueByShop).filter(([,d])=>d>5000).sort((a,b)=>b[1]-a[1]);
    if(highDue.length>0) {
      const key=`due_alert_${todayStr}`;
      if(!aiAlertsSent[key]) {
        aiAlertsSent[key]=true;
        const dueList=highDue.slice(0,3).map(([s,d])=>`${s}: ৳${Math.round(d)}`).join(', ');
        const msg = await callClaude(apiKey,
          `গত ৭ দিনে নতুন বাকি জমেছে: ${dueList}। এই বাকি আদায়ের জন্য কী করতে হবে? (৩-৪ লাইন, সরাসরি পরামর্শ)`, 200);
        showAINotification('🏦 বাকি সতর্কবার্তা', msg, 'danger');
      }
    }
  }

  // ৪. কাস্টমার হঠাৎ অর্ডার কমিয়েছে
  const custOrderCheck={};
  allSalesArr.forEach(s=>{
    if(!custOrderCheck[s.shop])custOrderCheck[s.shop]={recent:0,old:0};
    const d=new Date(s.date);
    const diff=(now-d)/(1000*60*60*24);
    if(diff<=30)custOrderCheck[s.shop].recent+=s.total||0;
    else if(diff<=60)custOrderCheck[s.shop].old+=s.total||0;
  });
  const droppedCusts=Object.entries(custOrderCheck)
    .filter(([,v])=>v.old>10000&&v.recent<v.old*0.4)
    .map(([s,v])=>`${s}(আগে:৳${Math.round(v.old)}, এখন:৳${Math.round(v.recent)})`);
  if(droppedCusts.length>0) {
    const key=`cust_drop_${todayStr}`;
    if(!aiAlertsSent[key]) {
      aiAlertsSent[key]=true;
      const msg = await callClaude(apiKey,
        `এই কাস্টমাররা হঠাৎ অর্ডার কমিয়ে দিয়েছে: ${droppedCusts.slice(0,3).join(', ')}। তাদের ফিরিয়ে আনতে কী করা উচিত? (৩-৪ লাইন)`, 200);
      showAINotification('📉 কাস্টমার হারানোর ঝুঁকি', msg, 'warning');
    }
  }

  // ৫. স্টক কম
  const stockData=Object.values(window.allStock||{});
  const assignedData=Object.values(window.allStockAssign||{});
  const netStock={};
  stockData.forEach(s=>{netStock[s.prodId]=(netStock[s.prodId]||0)+s.qty;});
  assignedData.forEach(s=>{netStock[s.prodId]=(netStock[s.prodId]||0)-s.qty;});
  const lowStock=Object.entries(netStock).filter(([,q])=>q<=5&&q>=0);
  if(lowStock.length>0) {
    const key=`stock_${todayStr}`;
    if(!aiAlertsSent[key]) {
      aiAlertsSent[key]=true;
      const allProds=window.allProducts||{};
      const lowList=lowStock.map(([pid,q])=>`${allProds[pid]?.name||pid}(${q}টি)`).join(', ');
      showAINotification('📦 স্টক সতর্কতা', `⚠️ এই পণ্যগুলোর স্টক কম: ${lowList}\n\n👉 দ্রুত পুনরায় অর্ডার করুন।`, 'warning');
    }
  }

  // ৬. আজকে কোনো বিক্রয় নেই (বিকাল ৩টার পরে)
  if(now.getHours()>=15) {
    const todaySales=allSalesArr.filter(s=>s.date===todayStr);
    if(todaySales.length===0) {
      const key=`no_sale_${todayStr}`;
      if(!aiAlertsSent[key]) {
        aiAlertsSent[key]=true;
        showAINotification('🚨 বিক্রয় শূন্য!', `আজ বিকাল ${now.getHours()}টা পর্যন্ত কোনো বিক্রয় রেকর্ড হয়নি।\n\n👉 কর্মীদের সাথে যোগাযোগ করুন।`, 'danger');
      }
    }
  }
}

// ── সাপ্তাহিক প্রেডিকশন
window.runWeeklyForecast = async function() {
  const apiKey = await getAIKey();
  if(!apiKey){showAINotification('❌ API Key নেই','AI Config এ Anthropic API Key দিন','danger');return;}
  const data = buildAnalyticsData();
  const allSalesArr = Object.values(window.allSales||{});
  const now = new Date();

  // গত ৪ সপ্তাহের ডেটা
  const weeklyData=[];
  for(let w=0;w<4;w++){
    const wStart=new Date(now);wStart.setDate(now.getDate()-(w+1)*7);
    const wEnd=new Date(now);wEnd.setDate(now.getDate()-w*7);
    const wSales=allSalesArr.filter(s=>{const d=new Date(s.date);return d>=wStart&&d<wEnd;});
    weeklyData.unshift({week:4-w,rev:Math.round(wSales.reduce((a,s)=>a+(s.total||0),0)),orders:wSales.length});
  }

  const prompt = `তুমি NovaTEch BD-এর AI ম্যানেজার। গত ৪ সপ্তাহের ডেটা:
${weeklyData.map(w=>`সপ্তাহ ${w.week}: ৳${w.rev} (${w.orders}টি অর্ডার)`).join('\n')}

এই মাসের বিক্রয়: ৳${Math.round(data.totalRevenue)}, বাকি: ৳${Math.round(data.totalDue)}

আগামী সপ্তাহের জন্য:
১. বিক্রয় প্রেডিকশন (সংখ্যাসহ)
২. কোন পণ্যে মনোযোগ দিতে হবে
৩. কোন রুটে চাপ দিতে হবে
৪. ৩টি সুনির্দিষ্ট কর্মপরিকল্পনা`;

  showAINotification('📈 প্রেডিকশন তৈরি হচ্ছে...', '⏳ একটু অপেক্ষা করুন...', 'info');
  const reply = await callClaude(apiKey, prompt, 600);
  showAINotification('📈 সাপ্তাহিক প্রেডিকশন', reply, 'info');
};

// ── মাসিক কৌশল পরামর্শ
window.runMonthlyStrategy = async function() {
  const apiKey = await getAIKey();
  if(!apiKey){showAINotification('❌ API Key নেই','AI Config এ Anthropic API Key দিন','danger');return;}
  const context = buildContextPrompt();
  const prompt = context + `\n\nআমাকে এই মাসের জন্য একটি সম্পূর্ণ কৌশলগত পরিকল্পনা দাও:
১. বিক্রয় বৃদ্ধির ৩টি সুনির্দিষ্ট পথ (সংখ্যাসহ)
২. কোন ২টি পণ্যে সবচেয়ে বেশি মনোযোগ দিতে হবে এবং কেন
৩. কোন ২টি রুটে বিনিয়োগ বাড়াতে হবে
৪. বাকি কমানোর কৌশল
৫. কর্মী পারফরম্যান্স উন্নতির পরিকল্পনা
৬. আর্থিক স্বাস্থ্য উন্নতির পরামর্শ`;

  showAINotification('📋 কৌশল তৈরি হচ্ছে...', '⏳ একটু অপেক্ষা করুন...', 'info');
  const reply = await callClaude(apiKey, prompt, 1000);
  showAINotification('📋 মাসিক কৌশল পরিকল্পনা', reply, 'info');
};

// ── লাইভ ট্রেন্ড আপডেট
function updateLiveTrend() {
  const el = document.getElementById('aiLiveTrend');
  if(!el) return;
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const allSalesArr = Object.values(window.allSales||{});
  const todaySales = allSalesArr.filter(s=>s.date===todayStr);
  const todayRev = todaySales.reduce((a,s)=>a+(s.total||0),0);
  const yesterday = new Date(now);yesterday.setDate(now.getDate()-1);
  const yStr = yesterday.toISOString().split('T')[0];
  const ySales = allSalesArr.filter(s=>s.date===yStr);
  const yRev = ySales.reduce((a,s)=>a+(s.total||0),0);
  const growth = yRev>0?((todayRev-yRev)/yRev*100).toFixed(1):0;

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--card);border-radius:10px;border:1px solid var(--border);margin-bottom:8px">
      <div>
        <div style="font-size:11px;color:var(--muted)">আজকের বিক্রয়</div>
        <div style="font-size:20px;font-weight:700;color:var(--accent)">৳${Math.round(todayRev).toLocaleString('bn-BD')}</div>
        <div style="font-size:11px;color:${growth>=0?'var(--green)':'var(--red)'}">${growth>=0?'↑':'↓'} ${Math.abs(growth)}% গতকালের তুলনায়</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:11px;color:var(--muted)">অর্ডার</div>
        <div style="font-size:24px;font-weight:700;color:var(--blue)">${todaySales.length}</div>
        <div style="font-size:10px;color:var(--muted)">আপডেট: ${now.toLocaleTimeString('bn-BD',{hour:'2-digit',minute:'2-digit'})}</div>
      </div>
    </div>`;
}

// ── Claude API call helper
async function callClaude(apiKey, prompt, maxTokens=300) {
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:maxTokens,messages:[{role:'user',content:prompt}]})
    });
    const data = await resp.json();
    return data.content?.[0]?.text||'উত্তর পাওয়া যায়নি';
  } catch(e) { return `সংযোগ সমস্যা: ${e.message}`; }
}

// ── Firebase এ alert সেভ
async function saveAIAlert(uid, type, message, workerName) {
  try {
    const db = window._firebaseDB||window.db;
    if(!db)return;
    const {ref,push} = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js');
    await push(ref(db,'aiAlerts'),{uid,type,message,workerName,ts:Date.now(),read:false});
  } catch(e){}
}

// ── Notification UI
const aiNotifications=[];
function showAINotification(title, message, type='info') {
  aiNotifications.unshift({title,message,type,ts:Date.now()});
  if(aiNotifications.length>20)aiNotifications.pop();
  renderAINotifications();
  // ব্যাজ আপডেট
  const badge=document.getElementById('aiAlertBadge');
  if(badge){badge.textContent=aiNotifications.filter(n=>!n.read).length;badge.style.display='block';}
}

function renderAINotifications() {
  const el=document.getElementById('aiNotificationPanel');
  if(!el)return;
  const colors={info:{bg:'rgba(59,130,246,.1)',border:'rgba(59,130,246,.3)',icon:'💡'},warning:{bg:'rgba(245,158,11,.1)',border:'rgba(245,158,11,.3)',icon:'⚠️'},danger:{bg:'rgba(239,68,68,.1)',border:'rgba(239,68,68,.3)',icon:'🚨'},briefing:{bg:'rgba(16,185,129,.1)',border:'rgba(16,185,129,.3)',icon:'🌅'}};
  el.innerHTML=aiNotifications.slice(0,10).map(n=>{
    const c=colors[n.type]||colors.info;
    const text=n.message.replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<b>$1</b>');
    const time=new Date(n.ts).toLocaleTimeString('bn-BD',{hour:'2-digit',minute:'2-digit'});
    return `<div style="background:${c.bg};border:1px solid ${c.border};border-radius:10px;padding:12px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5px">
        <div style="font-size:12px;font-weight:700">${c.icon} ${n.title}</div>
        <div style="font-size:10px;color:var(--muted)">${time}</div>
      </div>
      <div style="font-size:12px;line-height:1.6;color:var(--text)">${text}</div>
    </div>`;
  }).join('')||'<div style="text-align:center;padding:20px;color:var(--muted);font-size:12px">কোনো সতর্কবার্তা নেই</div>';
}

window.renderAIAlerts = function() {
  renderAINotifications();
  aiNotifications.forEach(n=>n.read=true);
  const badge=document.getElementById('aiAlertBadge');
  if(badge)badge.style.display='none';
};

// ── অটো-ইঞ্জিন শুরু
window.startAIAutoEngine = function() {
  if(aiAutoEngine)clearInterval(aiAutoEngine);
  runAIAutoEngine(); // প্রথমবার সাথে সাথে
  aiAutoEngine = setInterval(runAIAutoEngine, 10*60*1000); // প্রতি ১০ মিনিট
  updateLiveTrend();
  setInterval(updateLiveTrend, 60*1000); // প্রতি ১ মিনিট লাইভ ট্রেন্ড
  console.log('🤖 AI Auto Engine started');
};


// ══════════════════════════════════════════════
// MISSING CHART FUNCTIONS — Report Page
// ══════════════════════════════════════════════

function drawSalesTrendChart(){
  const r=setupCanvas('salesTrendChart');if(!r)return;
  const{ctx,w,h}=r;
  const days=[],labels=[];
  for(let i=29;i>=0;i--){
    const d=new Date();d.setDate(d.getDate()-i);
    days.push(d.toISOString().split('T')[0]);
    if(i%7===0||i===0)labels.push((d.getMonth()+1)+'/'+(d.getDate()));
    else labels.push('');
  }
  const values=days.map(d=>Object.values(window.allSales||{}).filter(s=>s.date===d).reduce((a,b)=>a+(b.total||0),0));
  const profVals=days.map(d=>Object.values(window.allSales||{}).filter(s=>s.date===d).reduce((a,b)=>a+(b.profit||0),0));
  const padL=8,padR=8,padT=10,padB=28,cw=w-padL-padR,ch=h-padT-padB;
  const max=Math.max(...values,...profVals,1);
  ctx.clearRect(0,0,w,h);
  const step=cw/(values.length-1);
  // Grid lines
  ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=1;
  [0.25,0.5,0.75,1].forEach(t=>{
    const y=padT+ch*(1-t);ctx.beginPath();ctx.moveTo(padL,y);ctx.lineTo(padL+cw,y);ctx.stroke();
  });
  // Sales fill
  const grad=ctx.createLinearGradient(0,padT,0,padT+ch);
  grad.addColorStop(0,'rgba(74,158,255,0.3)');grad.addColorStop(1,'rgba(74,158,255,0)');
  ctx.beginPath();
  values.forEach((v,i)=>{const x=padL+i*step,y=padT+ch*(1-v/max);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
  ctx.lineTo(padL+cw,padT+ch);ctx.lineTo(padL,padT+ch);ctx.closePath();
  ctx.fillStyle=grad;ctx.fill();
  // Sales line
  ctx.beginPath();
  values.forEach((v,i)=>{const x=padL+i*step,y=padT+ch*(1-v/max);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
  ctx.strokeStyle='#4a9eff';ctx.lineWidth=2;ctx.lineJoin='round';ctx.stroke();
  // Profit line
  ctx.beginPath();
  profVals.forEach((v,i)=>{const x=padL+i*step,y=padT+ch*(1-v/max);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
  ctx.strokeStyle='#2ecc8a';ctx.lineWidth=1.5;ctx.setLineDash([4,3]);ctx.stroke();ctx.setLineDash([]);
  // X labels
  ctx.fillStyle='rgba(124,128,153,0.9)';ctx.font='8px sans-serif';ctx.textAlign='center';
  labels.forEach((l,i)=>{if(l)ctx.fillText(l,padL+i*step,h-5);});
  // Legend
  ctx.fillStyle='#4a9eff';ctx.fillRect(padL,4,12,4);
  ctx.fillStyle='rgba(255,255,255,0.7)';ctx.font='9px sans-serif';ctx.textAlign='left';
  ctx.fillText('বিক্রয়',padL+15,9);
  ctx.strokeStyle='#2ecc8a';ctx.setLineDash([4,3]);ctx.beginPath();ctx.moveTo(padL+70,6);ctx.lineTo(padL+82,6);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='rgba(255,255,255,0.7)';ctx.fillText('লাভ',padL+85,9);
}

function drawTopProductsChart(){
  const pm={};
  Object.values(window.allSales||{}).forEach(s=>{pm[s.product]=(pm[s.product]||0)+s.qty;});
  const sorted=Object.entries(pm).sort((a,b)=>b[1]-a[1]).slice(0,5);
  if(!sorted.length)return;
  const r=setupCanvas('topProductsChart');if(!r)return;
  const{ctx,w,h}=r;
  const n=sorted.length,padL=6,padR=6,padT=6,padB=6,rowH=(h-padT-padB)/n;
  const maxV=Math.max(...sorted.map(e=>e[1]),1);
  const labelW=80;
  ctx.clearRect(0,0,w,h);
  sorted.forEach(([name,val],i)=>{
    const y=padT+i*rowH;
    const barW=(w-padL-padR-labelW)*val/maxV;
    ctx.fillStyle='rgba(124,128,153,0.7)';ctx.font='10px Hind Siliguri,sans-serif';ctx.textAlign='left';
    const lbl=name.length>10?name.slice(0,9)+'…':name;
    ctx.fillText(lbl,padL,y+rowH*0.65);
    // Bar bg
    ctx.fillStyle='rgba(46,50,80,0.8)';ctx.beginPath();ctx.roundRect&&ctx.roundRect(padL+labelW,y+rowH*.2,w-padL-padR-labelW,rowH*.55,3);ctx.fill();
    // Bar fill
    if(barW>0){
      const g=ctx.createLinearGradient(padL+labelW,0,padL+labelW+barW,0);
      g.addColorStop(0,'#f5a623');g.addColorStop(1,'#ff8c42');
      ctx.fillStyle=g;ctx.beginPath();ctx.roundRect&&ctx.roundRect(padL+labelW,y+rowH*.2,barW,rowH*.55,3);ctx.fill();
    }
    ctx.fillStyle='rgba(255,255,255,0.8)';ctx.font='9px sans-serif';ctx.textAlign='right';
    ctx.fillText(val+' পিস',w-padR,y+rowH*0.65);
  });
}

function drawTopShopsChart(){
  const sm={};
  Object.values(window.allSales||{}).forEach(s=>{sm[s.shop]=(sm[s.shop]||0)+s.total;});
  const sorted=Object.entries(sm).sort((a,b)=>b[1]-a[1]).slice(0,5);
  if(!sorted.length)return;
  const r=setupCanvas('topShopsChart');if(!r)return;
  const{ctx,w,h}=r;
  const n=sorted.length,padL=6,padR=6,padT=6,padB=6,rowH=(h-padT-padB)/n;
  const maxV=Math.max(...sorted.map(e=>e[1]),1);
  const labelW=80;
  ctx.clearRect(0,0,w,h);
  sorted.forEach(([name,val],i)=>{
    const y=padT+i*rowH;
    const barW=(w-padL-padR-labelW)*val/maxV;
    ctx.fillStyle='rgba(124,128,153,0.7)';ctx.font='10px Hind Siliguri,sans-serif';ctx.textAlign='left';
    const lbl=name.length>10?name.slice(0,9)+'…':name;
    ctx.fillText(lbl,padL,y+rowH*0.65);
    ctx.fillStyle='rgba(46,50,80,0.8)';ctx.beginPath();ctx.roundRect&&ctx.roundRect(padL+labelW,y+rowH*.2,w-padL-padR-labelW,rowH*.55,3);ctx.fill();
    if(barW>0){
      const g=ctx.createLinearGradient(padL+labelW,0,padL+labelW+barW,0);
      g.addColorStop(0,'#a78bfa');g.addColorStop(1,'#4a9eff');
      ctx.fillStyle=g;ctx.beginPath();ctx.roundRect&&ctx.roundRect(padL+labelW,y+rowH*.2,barW,rowH*.55,3);ctx.fill();
    }
    const bnV='৳'+Math.round(val/1000)+'K';
    ctx.fillStyle='rgba(255,255,255,0.8)';ctx.font='9px sans-serif';ctx.textAlign='right';
    ctx.fillText(bnV,w-padR,y+rowH*0.65);
  });
}

// ✅ Chart functions globally expose করি — app.js থেকে call করার জন্য
window.drawSalesTrendChart = drawSalesTrendChart;
window.drawTopProductsChart = drawTopProductsChart;
window.drawTopShopsChart = drawTopShopsChart;
