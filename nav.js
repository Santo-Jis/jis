function buildNav(){
  // পুরানো top nav (hidden, backward compat)
  const tabs=[
    {id:'dash',label:'🏠 ড্যাশ',r:['admin','manager','worker']},
    {id:'sale',label:'🛍 বিক্রয়',r:['admin','manager','worker']},
    {id:'due',label:'🏦 বাকি',r:['admin','manager','worker']},
    {id:'profile',label:'👤 প্রোফাইল',r:['admin','manager','worker']},
  ];
  window.$('mainNav').innerHTML=tabs.filter(t=>t.r.includes(window.CR))
    .map(t=>`<button class="nav-btn" data-page="${t.id}" onclick="showPage('${t.id}')">${t.label}</button>`).join('');

  // ══ Drawer মেনু সংজ্ঞা — গ্রুপ করা ══
  const drawerSections = [
    // ── গ্রুপ ১: বিক্রয় ও কাস্টমার
    {
      sectionTitle: '🛍 বিক্রয় ও কাস্টমার',
      items: [
        { ico:'🏪', lbl:'কাস্টমার', page:'cust', r:['admin','manager','worker'] },
        { ico:'🗺️', lbl:'রুট', page:'route', r:['admin','manager','worker'] },
        { ico:'🏦', lbl:'বাকি', page:'due', r:['admin','manager','worker'] },
        { ico:'🛒', lbl:'অর্ডার', page:'order', r:['worker','manager','admin'] },
      ]
    },
    // ── গ্রুপ ২: স্টক ও খরচ
    {
      sectionTitle: '📦 স্টক ও খরচ',
      items: [
        { ico:'📦', lbl:'স্টক', page:'stock', r:['admin','manager','worker'] },
        { ico:'💸', lbl:'খরচ', page:'exp', r:['admin','manager','worker'] },
      ]
    },
    // ── গ্রুপ ৩: কর্মী ব্যবস্থাপনা
    {
      sectionTitle: '👷 কর্মী ব্যবস্থাপনা',
      items: [
        { ico:'⏰', lbl:'উপস্থিতি', page:'att', r:['admin','manager','worker'] },
        {
          ico:'💰', lbl:'HR', r:['admin','manager'],
          sub: {
            title:'💰 HR ও পেমেন্ট',
            items: [
              { ico:'💵', lbl:'বেতন', desc:'বেতন হিসাব', page:'salary' },
              { ico:'🚗', lbl:'ভাতা', desc:'ভ্রমণ ভাতা', page:'allow' },
              { ico:'👥', lbl:'টিম', desc:'টিম ব্যবস্থাপনা', page:'teams' },
            ]
          }
        },
      ]
    },
    // ── গ্রুপ ৪: রিপোর্ট ও যোগাযোগ
    {
      sectionTitle: '📊 রিপোর্ট ও যোগাযোগ',
      items: [
        {
          ico:'📊', lbl:'রিপোর্ট', r:['admin','manager'],
          sub: {
            title:'📊 রিপোর্ট বেছে নিন',
            items: [
              { ico:'🤖', lbl:'AI রিপোর্ট', desc:'Claude AI বিশ্লেষণ', page:'enterprise' },
              { ico:'📈', lbl:'বিক্রয় রিপোর্ট', desc:'বিস্তারিত বিক্রয়', page:'report', sub:'sales' },
              { ico:'🏪', lbl:'কাস্টমার রিপোর্ট', desc:'দোকান ভিত্তিক', page:'report', sub:'shop' },
              { ico:'🛍', lbl:'পণ্য রিপোর্ট', desc:'পণ্য ভিত্তিক', page:'report', sub:'prod' },
              { ico:'🗺️', lbl:'রুট রিপোর্ট', desc:'রুট ভিত্তিক', page:'report', sub:'route' },
              { ico:'💸', lbl:'খরচ রিপোর্ট', desc:'ব্যয়ের বিশ্লেষণ', page:'report', sub:'exp' },
              { ico:'📅', lbl:'দৈনিক রিপোর্ট', desc:'দিনের সারসংক্ষেপ', page:'folders', sub:'daily' },
              { ico:'📆', lbl:'মাসিক রিপোর্ট', desc:'মাসের সারসংক্ষেপ', page:'folders', sub:'monthly' },
            ]
          }
        },
        { ico:'📢', lbl:'নোটিশ', page:'notice', r:['admin','manager'] },
        { ico:'📋', lbl:'টাস্ক', page:'tasks', r:['worker','manager','admin'] },
        { ico:'💬', lbl:'চ্যাট', page:'chat', r:['worker','manager','admin'] },
      ]
    },
    // ── গ্রুপ ৫: সিস্টেম (Admin only)
    {
      sectionTitle: '⚙️ সিস্টেম',
      items: [
        {
          ico:'⚙️', lbl:'সেটিংস', r:['admin'],
          sub: {
            title:'⚙️ সেটিংস',
            items: [
              { ico:'🔧', lbl:'অ্যাডমিন', desc:'সিস্টেম সেটিংস', page:'admin' },
              { ico:'🗂️', lbl:'ফোল্ডার', desc:'ফাইল ম্যানেজার', page:'folders' },
            ]
          }
        },
      ]
    },
  ];

  // সব item flat list বানাই — index tracking এর জন্য
  const allVisible = [];
  drawerSections.forEach(sec => {
    sec.items.filter(g => !g.r || g.r.includes(window.CR)).forEach(g => allVisible.push(g));
  });
  window._drawerGroups = allVisible;

  // Drawer রেন্ডার — section header সহ
  const grid = window.$('drawerGrid');
  if (!grid) return;

  let html = '';
  let globalIdx = 0;
  drawerSections.forEach(sec => {
    const secItems = sec.items.filter(g => !g.r || g.r.includes(window.CR));
    if (!secItems.length) return;

    // Section header
    html += `<div style="
      grid-column:1/-1;
      font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
      color:var(--muted);padding:10px 2px 4px;
      border-top:1px solid var(--border);margin-top:2px;
    ">${sec.sectionTitle}</div>`;

    // Items
    secItems.forEach(g => {
      const idx = globalIdx++;
      const hasSub = !!g.sub;
      html += `<div class="drawer-item${hasSub?' has-sub':''}" id="ditem-${idx}"
        onclick="${hasSub ? `openSubMenu(${idx})` : `navTo('${g.page}');closeDrawer()`}"
      >
        <span class="di-ico">window.${g.ico}</span>
        <span class="di-lbl">window.${g.lbl}window.${hasSub?'<br><span style="font-size:9px;opacity:.5">▾</span>':''}</span>
      </div>`;
    });
  });

  grid.innerHTML = html;
}

// Drawer খোলা/বন্ধ
window.toggleDrawer = function() {
  const drawer = window.$('navDrawer');
  const overlay = window.$('drawerOverlay');
  const isOpen = drawer.classList.contains('open');
  if (isOpen) closeDrawer();
  else {
    closeSubMenu();
    drawer.classList.add('open');
    overlay.classList.add('open');
  }
};
window.closeDrawer = function() {
  window.$('navDrawer')?.classList.remove('open');
  window.$('drawerOverlay')?.classList.remove('open');
  setTimeout(closeSubMenu, 320);
};

// সাব-মেনু খোলা
window.openSubMenu = function(idx) {
  const group = window._drawerGroups[idx];
  if (!group?.sub) return;

  // active state
  document.querySelectorAll('.drawer-item').forEach(el => el.classList.remove('active'));
  document.getElementById('ditem-' + idx)?.classList.add('active');

  // sub panel
  const panel = window.$('subMenuPanel');
  const title = window.$('subMenuTitle');
  const sgrid = window.$('subMenuGrid');
  if (!panel || !title || !sgrid) return;

  title.textContent = group.sub.title;
  sgrid.innerHTML = group.sub.items.map(item => `
    <div class="sub-item" onclick="navToSub('${item.page}','${item.sub||''}');closeDrawer()">
      <span class="sub-ico">window.${item.ico}</span>
      <div class="sub-info">
        <div class="sub-lbl">window.${item.lbl}</div>
        <div class="sub-desc">window.${item.desc}</div>
      </div>
    </div>
  `).join('');

  panel.classList.add('open');
  // Drawer scroll to sub
  setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
};

window.closeSubMenu = function() {
  window.$('subMenuPanel')?.classList.remove('open');
  document.querySelectorAll('.drawer-item').forEach(el => el.classList.remove('active'));
};

// Page navigate
window.navTo = function(page) {
  // features.js page গুলো inject হওয়ার আগে div না থাকলে retry করি
  const pg = document.getElementById('page-'+page);
  if(!pg && (page==='order'||page==='tasks'||page==='chat')) {
    // features.js এখনো inject করেনি — ৫০০ms পরে retry
    if(typeof injectFeaturesIfNeeded==='function') injectFeaturesIfNeeded();
    setTimeout(()=>{ showPage(page); setActiveTab(page); }, 500);
    return;
  }
  showPage(page);
  setActiveTab(page);
};
window.navToSub = function(page, sub) {
  showPage(page);
  setActiveTab(page);
  // Sub-section scroll করি
  if (sub) {
    setTimeout(() => {
      const sectionMap = {
        sales: 'workerReport', shop: 'shopReport', prod: 'prodReport',
        route: 'routeReport', exp: 'expReport',
        daily: () => { if(typeof renderFolderTab==='function') renderFolderTab('daily'); },
        monthly: () => { if(typeof renderFolderTab==='function') renderFolderTab('monthly'); },
      };
      const target = sectionMap[sub];
      if (typeof target === 'function') { target(); return; }
      if (target) {
        const el = window.$(target);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 350);
  }
};

// Bottom tab active state
window.setActiveTab = function(page) {
  document.querySelectorAll('.bnav-btn').forEach(b => b.classList.remove('active'));
  const tabMap = {
    dash:'bnav-dash', sale:'bnav-sale', due:'bnav-due', profile:'bnav-profile'
  };
  // ✅ "আরো" মেনু থেকে যাওয়া সব page
  const morePages = ['cust','route','stock','exp','att','salary','teams','allow',
    'report','notice','tasks','order','chat','ledger','admin','folders',
    'enterprise','archive','hr','commissions'];

  const btnId = tabMap[page];
  if (btnId) {
    window.$(btnId)?.classList.add('active');
  } else if (morePages.includes(page)) {
    window.$('bnav-more')?.classList.add('active');
  }
};

// ✅ Page History — Back বাটনের জন্য
let _pageHistory = ['dash'];
let _currentPage = 'dash';

window.goBack = function() {
  if (_pageHistory.length > 1) {
    _pageHistory.pop();
    const prev = _pageHistory[_pageHistory.length - 1];
    showPage(prev, true);
  } else {
    showPage('dash', true);
  }
};

window.showPage=function(id, isBack){
  const restricted={
    'report':['admin','manager'],
    'admin':['admin'],
    'folders':['admin','manager'],
    'salary':['admin','manager'],
    'teams':['admin','manager'],
    'allow':['admin','manager'],
    'enterprise':['admin','manager'],
    'notice':['admin','manager'],
  };
  if(restricted[id]&&!restricted[id].includes(window.CR)){
    window.showToast('এই পেজ দেখার অনুমতি নেই!',true);
    id='dash';
  }
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  window.$('page-'+id)?.classList.add('active');
  document.querySelector(`[data-page="${id}"]`)?.classList.add('active');
  // ✅ History tracking (isBack parameter via window flag)
  isBack = isBack || false;
  if (!isBack) {
    if (_pageHistory[_pageHistory.length-1] !== id) _pageHistory.push(id);
    if (_pageHistory.length > 20) _pageHistory.shift();
  }
  _currentPage = id;
  const backBtn = document.getElementById('globalBackBtn');
  if (backBtn) backBtn.style.display = (_pageHistory.length > 1) ? 'flex' : 'none';
  // Bottom tab active
  if(typeof setActiveTab==='function') setActiveTab(id);
  if(id==='report'){
    renderReport();
    // ✅ Chart retry — analytics.js লোড না হলে বারবার চেষ্টা করে
    let _chartRetry = 0;
    function _tryDrawCharts() {
      if (typeof drawSalesTrendChart === 'function' &&
          typeof drawTopProductsChart === 'function' &&
          typeof drawTopShopsChart === 'function') {
        drawSalesTrendChart();
        drawTopProductsChart();
        drawTopShopsChart();
        if(typeof refreshPL==='function') refreshPL();
      } else if (_chartRetry < 10) {
        _chartRetry++;
        setTimeout(_tryDrawCharts, 300);
      }
    }
    setTimeout(_tryDrawCharts, 400);
  }
  if(id==='enterprise'&&typeof window.renderEnterpriseDashboard==='function'){
    setTimeout(window.renderEnterpriseDashboard,300);
    setTimeout(()=>{if(typeof window.renderAIManager==='function')window.renderAIManager();},500);
  }
  if(id==='dash') {
    setTimeout(refreshDash, 100);
    // ✅ Dashboard charts
    let _dcRetry=0;
    function _tryDashCharts(){
      if(typeof window.drawDashboardCharts==='function') window.drawDashboardCharts();
      else if(_dcRetry<8){_dcRetry++;setTimeout(_tryDashCharts,400);}
    }
    setTimeout(_tryDashCharts,300);
  }
  if(id==='salary')renderSalary();
  if(id==='ledger'){setTimeout(()=>{window.setLedgerPeriod('month');},200);}
  if(id==='profile')renderProfile();
  if(id==='folders')renderFolderTab('workers');
  if(id==='att')renderAttendance();
  if(id==='teams')renderTeams();
  // ✅ Sale page — customer select refresh (route filter)
  if(id==='sale') setTimeout(loadCustomerSelect, 100);
  // ✅ Route page — worker status দেখাও
  if(id==='route') { renderVisitList(); if(window.CR!=='worker') renderWorkerRouteStatus(); }
  // ✅ FIX: Order page — customer ও product select load
  if(id==='order'){
    // customers ready কিনা check করে load করি
    const _loadOrder = ()=>{
      if(typeof window.ftLoadOrderSelects==='function') window.ftLoadOrderSelects();
      if(typeof window.ftRenderOrders==='function') window.ftRenderOrders();
    };
    if(Object.keys(window.allCustomers||{}).length > 0){
      setTimeout(_loadOrder, 100);
    } else {
      // data না থাকলে ১ সেকেন্ড অপেক্ষা করি
      setTimeout(_loadOrder, 1000);
    }
  }
  if(id==='tasks'){
    const _loadTasks = ()=>{
      if(typeof window.ftLoadWorkerSelects==='function') window.ftLoadWorkerSelects();
      if(typeof window.ftRenderTasks==='function') window.ftRenderTasks();
    };
    if(Object.keys(window.allUsers||{}).length > 0){
      setTimeout(_loadTasks, 100);
    } else {
      setTimeout(_loadTasks, 1000);
    }
  }
  // ✅ FIX: Chat page — conversation list load
  if(id==='chat'){
    setTimeout(()=>{
      if(typeof window.ftRenderConvList==='function') window.ftRenderConvList();
    },300);
  }
  if(id==='notice'){
    // notice পেজ নেই — admin পেজের notice section-এ scroll করি
    setTimeout(()=>{
      const el=document.getElementById('noticeTitle');
      if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.focus();}
    },400);
  }
};

window.setFilter=(f,btn)=>{
  filterMode=f;
  document.querySelectorAll('#page-dash .fb').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');refreshDash();
};

// ══ Nav functions → window expose ══
window.buildNav    = buildNav;
window.setActiveTab = setActiveTab;
