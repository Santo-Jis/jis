// ══ THEME ══
// ════════════════════════════════════════════════════════════
//  🔍 GLOBAL NAVIGATION SEARCH
//  ভূমিকা অনুযায়ী — Admin, Manager, Worker
// ════════════════════════════════════════════════════════════

// সব সার্চযোগ্য আইটেম — ভূমিকা ও keywords সহ
const SEARCH_ITEMS = [

  // ── ড্যাশবোর্ড
  { ico:'🏠', title:'ড্যাশবোর্ড', desc:'মূল পর্দা — বিক্রয়, লাভ, বাকির সারসংক্ষেপ', page:'dash', r:['admin','manager','worker'], keys:['ড্যাশ','হোম','dashboard','home','সারসংক্ষেপ','summary'] },

  // ── বিক্রয়
  { ico:'🛍', title:'বিক্রয় এন্ট্রি', desc:'নতুন বিক্রয় যোগ করুন', page:'sale', r:['admin','manager','worker'], keys:['বিক্রয়','sale','sell','বিক্রি','বেচা','পণ্য বেচা'] },
  { ico:'🔐', title:'OTP নিশ্চিতকরণ', desc:'বিক্রয় SMS OTP দিয়ে নিশ্চিত করুন', page:'sale', scroll:'otpSection', r:['admin','manager','worker'], keys:['otp','এসএমএস','sms','নিশ্চিত'] },
  { ico:'🧾', title:'ইনভয়েস', desc:'বিক্রয়ের রশিদ তৈরি ও শেয়ার করুন', page:'sale', r:['admin','manager','worker'], keys:['ইনভয়েস','invoice','রশিদ','receipt'] },

  // ── কাস্টমার
  { ico:'🏪', title:'কাস্টমার তালিকা', desc:'সব দোকানের তালিকা দেখুন', page:'cust', r:['admin','manager','worker'], keys:['কাস্টমার','customer','দোকান','shop','রিটেইলার'] },
  { ico:'➕', title:'নতুন কাস্টমার যোগ', desc:'নতুন দোকান যোগ করুন', page:'cust', action:'openMo("custMo")', r:['admin','manager','worker'], keys:['নতুন কাস্টমার','add customer','দোকান যোগ'] },
  { ico:'📢', title:'SMS ব্রডকাস্ট', desc:'সব কাস্টমারকে একসাথে SMS পাঠান', page:'cust', action:'openSMSBroadcast()', r:['admin','manager','worker'], keys:['sms','ব্রডকাস্ট','broadcast','মার্কেটিং'] },
  { ico:'🗺️', title:'রুট ম্যানেজমেন্ট', desc:'রুট তৈরি ও পরিচালনা করুন', page:'cust', r:['admin','manager'], keys:['রুট','route','এলাকা','zone'] },

  // ── রুট
  { ico:'🗺️', title:'আজকের রুট', desc:'আজকের ভিজিট রুট শুরু করুন', page:'route', r:['admin','manager','worker'], keys:['রুট','route','ভিজিট','visit','আজ'] },

  // ── বাকি
  { ico:'🏦', title:'বাকির তালিকা', desc:'সব কাস্টমারের বাকির হিসাব', page:'due', r:['admin','manager','worker'], keys:['বাকি','due','ধার','পাওনা','টাকা'] },
  { ico:'💰', title:'পেমেন্ট গ্রহণ', desc:'কাস্টমারের বাকি পেমেন্ট নিন', page:'due', r:['admin','manager','worker'], keys:['পেমেন্ট','payment','টাকা আদায়','collect'] },

  // ── খরচ
  { ico:'💸', title:'খরচ এন্ট্রি', desc:'নিজের খরচ যোগ করুন', page:'exp', r:['admin','manager','worker'], keys:['খরচ','expense','যাতায়াত','transport','ভাড়া'] },
  { ico:'🚗', title:'ভাতা দেখুন', desc:'আপনার ভ্রমণ ভাতার হিসাব', page:'exp', scroll:'myAllowance', r:['admin','manager','worker'], keys:['ভাতা','allowance','ট্রাভেল'] },

  // ── স্টক
  { ico:'📦', title:'স্টক সারসংক্ষেপ', desc:'গুদামের পণ্যের হিসাব', page:'stock', r:['admin','manager','worker'], keys:['স্টক','stock','মজুদ','inventory','পণ্য'] },
  { ico:'🚚', title:'স্টক বরাদ্দ', desc:'কর্মীকে পণ্য বরাদ্দ দিন', page:'stock', scroll:'stockAssignForm', r:['admin','manager'], keys:['বরাদ্দ','assign','দেওয়া'] },

  // ── উপস্থিতি
  { ico:'⏰', title:'চেক-ইন / চেক-আউট', desc:'উপস্থিতি দিন', page:'att', r:['admin','manager','worker'], keys:['চেক','checkin','checkout','উপস্থিতি','attendance','হাজিরা'] },
  { ico:'📸', title:'সেলফি চেক-ইন', desc:'GPS + সেলফি দিয়ে উপস্থিতি নিশ্চিত করুন', page:'att', r:['admin','manager','worker'], keys:['সেলফি','selfie','ছবি','ফটো'] },
  { ico:'🏖️', title:'ছুটির আবেদন', desc:'ছুটির জন্য আবেদন করুন', page:'att', scroll:'leaveList', r:['admin','manager','worker'], keys:['ছুটি','leave','অনুপস্থিত','holiday'] },
  { ico:'⏱️', title:'ওভারটাইম আবেদন', desc:'অতিরিক্ত কাজের আবেদন করুন', page:'att', scroll:'otRequestForm', r:['admin','manager','worker'], keys:['ওভারটাইম','overtime','অতিরিক্ত'] },
  { ico:'⚠️', title:'লেট অ্যালার্ট', desc:'দেরিতে আসার তালিকা দেখুন', page:'att', scroll:'lateAlertList', r:['admin','manager'], keys:['লেট','late','দেরি','অ্যালার্ট'] },

  // ── বেতন
  { ico:'💵', title:'বেতন হিসাব', desc:'এই মাসের বেতন ও কমিশন দেখুন', page:'salary', r:['admin','manager','worker'], keys:['বেতন','salary','মাসিক','payment','কমিশন','commission'] },
  { ico:'📊', title:'কমিশন কাঠামো', desc:'বিক্রয়ের উপর কমিশনের হার', page:'salary', scroll:'commSlabs', r:['admin','manager','worker'], keys:['কমিশন','commission','স্ল্যাব','slab','হার'] },
  { ico:'🎯', title:'টার্গেট নির্ধারণ', desc:'কর্মীর মাসিক টার্গেট সেট করুন', page:'salary', scroll:'setSalaryForm', r:['admin','manager'], keys:['টার্গেট','target','লক্ষ্য','goal'] },

  // ── টিম
  { ico:'👥', title:'টিম তৈরি', desc:'নতুন টিম তৈরি করুন', page:'teams', r:['admin','manager'], keys:['টিম','team','গ্রুপ','দল'] },

  // ── রিপোর্ট
  { ico:'🤖', title:'AI রিপোর্ট', desc:'Claude AI দিয়ে বিশ্লেষণ', page:'enterprise', r:['admin','manager'], keys:['ai','আই','রিপোর্ট','বিশ্লেষণ','analysis','claude'] },
  { ico:'📈', title:'বিক্রয় রিপোর্ট', desc:'কর্মী ও পণ্য ভিত্তিক বিক্রয় বিশ্লেষণ', page:'report', r:['admin'], keys:['রিপোর্ট','report','বিশ্লেষণ','বিক্রয়','sales report'] },
  { ico:'📊', title:'P&L স্টেটমেন্ট', desc:'লাভ-ক্ষতির হিসাব', page:'report', scroll:'plContent', r:['admin'], keys:['p&l','pl','লাভ','ক্ষতি','profit','loss','আর্থিক'] },
  { ico:'📅', title:'দৈনিক রিপোর্ট', desc:'আজকের সারসংক্ষেপ PDF', page:'folders', action:'renderFolderTab("daily")', r:['admin'], keys:['দৈনিক','daily','আজ','today'] },
  { ico:'📆', title:'মাসিক রিপোর্ট', desc:'মাসের সারসংক্ষেপ PDF', page:'folders', action:'renderFolderTab("monthly")', r:['admin'], keys:['মাসিক','monthly','মাস','month'] },

  // ── ফোল্ডার
  { ico:'🗂️', title:'ফাইল ম্যানেজার', desc:'কর্মী ও কাস্টমারের ডকুমেন্ট', page:'folders', r:['admin'], keys:['ফাইল','file','ডকুমেন্ট','document','ফোল্ডার','folder'] },
  { ico:'👤', title:'কর্মী ফোল্ডার', desc:'কর্মীদের NID, সার্টিফিকেট', page:'folders', action:'renderFolderTab("workers")', r:['admin'], keys:['কর্মী','worker','nid','সার্টিফিকেট','ডকুমেন্ট'] },

  // ── চ্যাট
  { ico:'💬', title:'চ্যাট', desc:'টিমের সাথে কথা বলুন', page:'chat', r:['admin','manager','worker'], keys:['চ্যাট','chat','বার্তা','message','কথা'] },
  { ico:'📢', title:'সাধারণ চ্যাট', desc:'সব কর্মী একসাথে', page:'chat', r:['admin','manager','worker'], keys:['সাধারণ','general','সবাই','all'] },

  // ── টাস্ক
  { ico:'📋', title:'টাস্ক তালিকা', desc:'নিজের সব কাজের তালিকা', page:'tasks', r:['admin','manager','worker'], keys:['টাস্ক','task','কাজ','work','দায়িত্ব'] },

  // ── অর্ডার
  { ico:'🛒', title:'অর্ডার', desc:'ফিল্ড থেকে অর্ডার দিন ও দেখুন', page:'order', r:['admin','manager','worker'], keys:['অর্ডার','order','ফরমায়েশ'] },

  // ── প্রোফাইল
  { ico:'👤', title:'আমার প্রোফাইল', desc:'নাম, পাসওয়ার্ড, ছবি আপডেট করুন', page:'profile', r:['admin','manager','worker'], keys:['প্রোফাইল','profile','নাম','পাসওয়ার্ড','password','ছবি'] },
  { ico:'📱', title:'WhatsApp নম্বর', desc:'প্রোফাইলে WhatsApp নম্বর যোগ করুন', page:'profile', r:['admin','manager','worker'], keys:['whatsapp','হোয়াটসঅ্যাপ','নম্বর','মোবাইল'] },
  { ico:'📁', title:'ডকুমেন্ট আপলোড', desc:'নিজের ডকুমেন্ট Google Drive-এ সেভ করুন', page:'profile', scroll:'docUploadInput', r:['admin','manager','worker'], keys:['ডকুমেন্ট','document','আপলোড','upload','drive'] },

  // ── Admin Only
  { ico:'📢', title:'নোটিশ পাঠান', desc:'সকল কর্মীকে নোটিশ দিন', page:'admin', scroll:'noticeTitle', r:['admin','manager'], keys:['নোটিশ','notice','ঘোষণা','announcement','বিজ্ঞপ্তি'] },
  { ico:'👤', title:'নতুন কর্মী তৈরি', desc:'নতুন কর্মী বা ম্যানেজার যোগ করুন', page:'admin', scroll:'createUserForm', r:['admin'], keys:['কর্মী','worker','employee','নতুন','তৈরি','create','যোগ'] },
  { ico:'📦', title:'প্রোডাক্ট যোগ', desc:'নতুন পণ্য তালিকায় যোগ করুন', page:'admin', scroll:'npName', r:['admin'], keys:['প্রোডাক্ট','product','পণ্য','আইটেম','item'] },
  { ico:'📱', title:'SMS কনফিগারেশন', desc:'Alpha Net SMS সেটআপ করুন', page:'admin', scroll:'smsApiKey', r:['admin'], keys:['sms','এসএমএস','alpha net','api','কনফিগ'] },
  { ico:'🤖', title:'Claude AI কনফিগ', desc:'Anthropic API Key সেটআপ করুন', page:'admin', scroll:'anthropicApiKey', r:['admin'], keys:['claude','ai','anthropic','api key','কনফিগ','সেটআপ'] },
  { ico:'☁️', title:'Google Drive', desc:'ডকুমেন্ট Drive-এ সেভের সেটআপ', page:'admin', scroll:'driveApiKey', r:['admin'], keys:['drive','গুগল','google','ক্লাউড','cloud'] },
  { ico:'🗑️', title:'বিক্রয় রিসেট', desc:'সকলের বিক্রয় শূন্য করুন (মাস শেষে)', page:'admin', action:'resetAllSales()', r:['admin'], keys:['রিসেট','reset','শূন্য','মুছ','মাস শেষ'] },
  { ico:'🗑️', title:'খরচ রিসেট', desc:'সকলের খরচের হিসাব শূন্য করুন', page:'admin', action:'resetAllExpenses()', r:['admin'], keys:['রিসেট','reset','খরচ','শূন্য'] },
  { ico:'🚗', title:'ভাতা নির্ধারণ', desc:'কর্মীর যাতায়াত ও খাবার ভাতা সেট করুন', page:'allow', r:['admin','manager'], keys:['ভাতা','allowance','যাতায়াত','খাবার'] },
];

// ── Search খোলা
window.openGlobalSearch = function() {
  const overlay = document.getElementById('globalSearchOverlay');
  const panel   = document.getElementById('globalSearchPanel');
  const input   = document.getElementById('globalSearchInput');
  if (!overlay || !panel) return;
  overlay.style.display = 'block';
  panel.style.display   = 'block';
  if (input) { input.value = ''; input.focus(); }
  renderSearchResults(''); // খালি হলে সব popular দেখাও
};

// ── Search বন্ধ
window.closeGlobalSearch = function() {
  document.getElementById('globalSearchOverlay').style.display = 'none';
  document.getElementById('globalSearchPanel').style.display   = 'none';
};

// ── সাম্প্রতিক সার্চ history
const _searchHistory = [];
function _addSearchHistory(q) {
  if (!q || q.length < 2) return;
  const idx = _searchHistory.indexOf(q);
  if (idx > -1) _searchHistory.splice(idx, 1);
  _searchHistory.unshift(q);
  if (_searchHistory.length > 5) _searchHistory.pop();
}

// ── Search রেজাল্ট রেন্ডার
window.runGlobalSearch = function(q) { renderSearchResults(q); };

function renderSearchResults(q) {
  const el = document.getElementById('globalSearchResults');
  if (!el) return;
  const query = (q || '').trim().toLowerCase();

  // Role অনুযায়ী menu items ফিল্টার
  let menuItems = SEARCH_ITEMS.filter(it => it.r.includes(window.CR));

  // ── খালি হলে history + shortcut দেখাই
  if (query.length === 0) {
    const groups = [];
    if (_searchHistory.length > 0) {
      groups.push({
        label: '🕐 সাম্প্রতিক',
        items: _searchHistory.map(h => ({
          ico: '🔍', title: h, desc: 'আবার খুঁজুন',
          r: ['admin','manager','worker'],
          action: `document.getElementById('globalSearchInput').value='${h}';runGlobalSearch('${h}')`
        }))
      });
    }
    groups.push({ label: '⚡ দ্রুত অ্যাক্সেস', items: menuItems.slice(0, 8) });
    renderSearchGroups(el, groups);
    return;
  }

  // ── search history-তে যোগ করি
  _addSearchHistory(q);

  const groups = [];
  const words = query.split(' ').filter(Boolean);
  const match = str => str && words.every(w => str.toLowerCase().includes(w));

  // ── ১. Menu/Page items
  const matchedMenu = menuItems.filter(it => {
    const hay = [it.title, it.desc, ...(it.keys||[])].join(' ').toLowerCase();
    return words.every(w => hay.includes(w));
  });
  if (matchedMenu.length) {
    groups.push({ label: '📋 পেজ ও ফিচার', items: matchedMenu.slice(0, 4) });
  }

  // ── ২. কাস্টমার / দোকান
  const custResults = [];
  Object.entries(window.allCustomers || {}).forEach(([id, c]) => {
    if (!match(c.name) && !match(c.owner) && !match(c.smsNum) && !match(c.waNum)) return;
    const due = Object.values(window.allSales||{}).filter(s=>s.shopId===id&&s.due>0).reduce((a,b)=>a+b.due,0);
    custResults.push({
      ico: '🏪',
      title: c.name || '–',
      desc: `${c.owner||''} · ${c.bizType||''} ${due>0?'· বাকি: '+bn(due):'· বাকি নেই ✅'}`,
      r: ['admin','manager','worker'],
      page: 'cust',
      _customRender: true,
      _type: 'customer',
      _id: id,
      _due: due,
      _waNum: c.waNum,
    });
  });
  if (custResults.length) {
    groups.push({ label: `🏪 কাস্টমার (${custResults.length})`, items: custResults.slice(0,5), _isData: true });
  }

  // ── ৩. কর্মী (Admin/Manager)
  if (window.CR === 'admin' || window.CR === 'manager') {
    const workerResults = [];
    const now = new Date();
    Object.entries(window.allUsers || {}).forEach(([uid, u]) => {
      if (u.role !== 'worker' && u.role !== 'manager') return;
      if (!match(u.name) && !match(u.email) && !match(u.phone) && !match(u.waNum)) return;
      const mSale = Object.values(window.allSales||{})
        .filter(s=>{const d=new Date(s.date);return s.uid===uid&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();})
        .reduce((a,b)=>a+(b.total||0),0);
      workerResults.push({
        ico: u.role==='manager'?'🎯':'👷',
        title: u.name || '–',
        desc: `${u.role==='manager'?'ম্যানেজার':'কর্মী'} · এই মাস: ${bn(mSale)}`,
        r: ['admin','manager'],
        _type: 'worker', _uid: uid, _name: u.name,
      });
    });
    if (workerResults.length) {
      groups.push({ label: `👤 কর্মী (${workerResults.length})`, items: workerResults.slice(0,4), _isData: true });
    }
  }

  // ── ৪. পণ্য
  const prodResults = [];
  Object.entries(window.allProducts || {}).forEach(([id, p]) => {
    if (!match(p.name)) return;
    const sold = Object.values(window.allSales||{}).filter(s=>s.productId===id).reduce((a,b)=>a+(b.qty||0),0);
    prodResults.push({
      ico: '📦',
      title: p.name,
      desc: `মূল্য: ${bn(p.sellPrice||0)} · বিক্রয়: ${sold} পিস`,
      r: ['admin','manager','worker'],
      page: 'sale', _type: 'product',
    });
  });
  if (prodResults.length) {
    groups.push({ label: `📦 পণ্য (${prodResults.length})`, items: prodResults.slice(0,3), _isData: true });
  }

  // ── ৫. বিক্রয় (তারিখ বা পরিমাণ)
  const saleResults = [];
  const isDateQuery = /^\d{1,2}[-\/]\d{1,2}/.test(query) || /^\d{4}/.test(query);
  if (isDateQuery || query.length >= 3) {
    const salesToSearch = Object.values(window.allSales||{})
      .filter(s => window.CR==='worker' ? s.uid===window.CU.uid : true)
      .sort((a,b)=>(b.ts||0)-(a.ts||0))
      .slice(0, 200); // সর্বশেষ ২০০টি
    salesToSearch.forEach(s => {
      if (!match(s.shop) && !match(s.product) && !match(s.date) && !match(s.workerName)) return;
      saleResults.push({
        ico: '🛍️',
        title: s.shop || '–',
        desc: `${s.product} × ${s.qty} · ${bn(s.total)} · ${s.date} · ${s.workerName||''}`,
        r: ['admin','manager','worker'],
        _type: 'sale',
      });
    });
    if (saleResults.length) {
      groups.push({ label: `🛍️ বিক্রয় (${saleResults.length})`, items: saleResults.slice(0,4), _isData: true });
    }
  }

  // ── কিছু না পেলে
  if (!groups.length) {
    el.innerHTML = `<div style="text-align:center;padding:32px 16px;color:var(--muted);">
      <div style="font-size:32px;margin-bottom:8px;">🔍</div>
      <div style="font-size:14px;">"${q}" — কিছু পাওয়া যায়নি</div>
      <div style="font-size:12px;margin-top:6px;opacity:.6;">দোকানের নাম, কর্মী, পণ্য বা তারিখ লিখুন</div>
    </div>`;
    return;
  }

  renderSearchGroups(el, groups);
}

function renderSearchGroups(el, groups) {
  el.innerHTML = groups.map(g => `
    <div style="padding:6px 0 4px;">
      <div style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
        color:var(--muted);padding:0 4px 6px;">${g.label}</div>
      window.${g.items.map(it => {
        // ── কাস্টমার card — বাকি + action button
        if (it._type === 'customer') {
          return `<div style="background:var(--card);border:1px solid var(--border-l);border-radius:12px;
              padding:12px;margin-bottom:6px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:38px;height:38px;border-radius:10px;background:var(--surface);
                border:1px solid var(--border);display:flex;align-items:center;justify-content:center;
                font-size:18px;flex-shrink:0;">🏪</div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:700;color:var(--text);">window.${it.title}</div>
                <div style="font-size:11px;color:var(--muted);margin-top:1px;
                  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${it.desc}</div>
              </div>
            </div>
            <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
              <button onclick="closeGlobalSearch();showPage('cust');setActiveTab('cust')"
                style="padding:5px 10px;font-size:11px;font-weight:600;border-radius:7px;cursor:pointer;
                  font-family:inherit;background:rgba(59,130,246,.15);border:1px solid var(--blue);color:var(--blue);">
                📋 দেখুন
              </button>
              window.${it._due > 0 ? `<button onclick="closeGlobalSearch();openPayMo('${it.title}',${it._due})"
                style="padding:5px 10px;font-size:11px;font-weight:600;border-radius:7px;cursor:pointer;
                  font-family:inherit;background:rgba(139,92,246,.15);border:1px solid var(--purple);color:var(--purple);">
                💰 পেমেন্ট ৳window.${Math.round(it._due).toLocaleString('bn-BD')}
              </button>` : ''}
              window.${it._waNum ? `<button onclick="window.open('https://wa.me/88${it._waNum.replace(/[^0-9]/g,'')}','_blank')"
                style="padding:5px 10px;font-size:11px;font-weight:600;border-radius:7px;cursor:pointer;
                  font-family:inherit;background:rgba(37,211,102,.15);border:1px solid #25d366;color:#25d366;">
                💬 WhatsApp
              </button>` : ''}
            </div>
          </div>`;
        }

        // ── কর্মী card
        if (it._type === 'worker') {
          return `<div style="display:flex;align-items:center;gap:12px;padding:11px 10px;
              border-radius:12px;cursor:pointer;margin-bottom:2px;
              background:var(--card);border:1px solid var(--border-l);"
            onclick="closeGlobalSearch();showWorkerProfile('${it._uid}')">
            <div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--blue));
              display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">${it.ico}</div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:13px;font-weight:700;color:var(--text);">window.${it.title}</div>
              <div style="font-size:11px;color:var(--muted);margin-top:1px;">window.${it.desc}</div>
            </div>
            <div style="font-size:18px;color:var(--muted);">›</div>
          </div>`;
        }

        // ── Default card (menu items, products, sales)
        return `<div onclick="goSearchItem(${JSON.stringify(it).replace(/"/g,'&quot;')})"
          style="display:flex;align-items:center;gap:12px;padding:11px 10px;border-radius:12px;
            cursor:pointer;transition:background .12s;margin-bottom:2px;"
          onmouseover="this.style.background='rgba(255,255,255,.05)'"
          onmouseout="this.style.background='transparent'">
          <div style="width:38px;height:38px;border-radius:10px;background:var(--card);
            border:1px solid var(--border);display:flex;align-items:center;
            justify-content:center;font-size:18px;flex-shrink:0;">${it.ico}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:14px;font-weight:600;color:var(--text);">window.${it.title}</div>
            <div style="font-size:12px;color:var(--muted);margin-top:1px;
              white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${it.desc}</div>
          </div>
          <div style="font-size:18px;color:var(--muted);">›</div>
        </div>`;
      }).join('')}
    </div>`).join('');
}

// ── আইটেমে ক্লিক করলে পেজে যাওয়া
window.goSearchItem = function(it) {
  if (typeof it === 'string') it = JSON.parse(it.replace(/&quot;/g,'"'));
  closeGlobalSearch();

  // পেজে যাই
  if (it.page && typeof showPage === 'function') {
    showPage(it.page);
    if (typeof setActiveTab === 'function') setActiveTab(it.page);
  }

  // Action থাকলে চালাই
  if (it.action) {
    setTimeout(() => { try { eval(it.action); } catch(e) { console.warn(e); } }, 400);
  }

  // Scroll target থাকলে সেখানে যাই
  if (it.scroll) {
    setTimeout(() => {
      const el = document.getElementById(it.scroll);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // হাইলাইট effect
        el.style.transition = 'box-shadow .3s';
        el.style.boxShadow  = '0 0 0 3px rgba(245,166,35,.5)';
        setTimeout(() => { el.style.boxShadow = ''; }, 1800);
        // Input হলে focus করি
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.focus();
      }
    }, 450);
  }
};

// ✅ Browser/Phone Back Button handle
window.addEventListener('popstate', function(e) {
  if (_pageHistory.length > 1) {
    _pageHistory.pop();
    const prev = _pageHistory[_pageHistory.length - 1] || 'dash';
    _currentPage = prev;
    // page দেখাই (history push ছাড়া)
    const restricted={
      'report':['admin','manager'],'admin':['admin'],'folders':['admin','manager'],
      'salary':['admin','manager'],'teams':['admin','manager'],
      'allow':['admin','manager'],'enterprise':['admin','manager'],
    };
    if(restricted[prev]&&!restricted[prev].includes(window.CR)) return;
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.getElementById('page-'+prev)?.classList.add('active');
    if(typeof setActiveTab==='function') setActiveTab(prev);
    const backBtn = document.getElementById('globalBackBtn');
    if(backBtn) backBtn.style.display = prev==='dash'?'none':'flex';
  } else {
    // ড্যাশে ফিরে যাই
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.getElementById('page-dash')?.classList.add('active');
    if(typeof setActiveTab==='function') setActiveTab('dash');
  }
});

window.toggleTheme=()=>{
  const html=document.documentElement;
  const isDark=html.getAttribute('data-theme')!=='light';
  html.setAttribute('data-theme',isDark?'light':'dark');
  localStorage.setItem('nt-theme',isDark?'light':'dark');
};

