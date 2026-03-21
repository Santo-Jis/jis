// ═══════════════════════════════════════════════════════════
//  মাসিক রিসেট — বেতন, কমিশন, উপস্থিতি, ছুটি, বিক্রয়, বাকি
// ═══════════════════════════════════════════════════════════
window.resetMonthlyAll = async () => {
  if (window.CR !== 'admin') { window.showToast('শুধু Admin করতে পারবে!', true); return; }

  const monthLabel = new Date().toLocaleDateString('bn-BD', { year: 'numeric', month: 'long' });
  const archiveKey = new Date().toISOString().slice(0, 7); // e.g. 2026-03

  const counts = {
    sales:      Object.keys(window.allSales || {}).length,
    expenses:   Object.keys(window.allExpenses || {}).length,
    attendance: Object.keys(window.allAttendance || {}).length,
    leaves:     Object.keys(window.allLeaves || {}).length,
    salaries:   Object.keys(window.allSalaries || {}).length,
  };

  showResetConfirm({
    title: '🗓️ মাসিক সম্পূর্ণ রিসেট',
    body: `<b style="color:var(--accent)">${monthLabel}</b> এর সব ডেটা Archive হয়ে রিসেট হবে:<br><br>
      🛍️ বিক্রয়: <b style="color:#fff">window.${counts.sales}টি</b><br>
      💸 খরচ: <b style="color:#fff">window.${counts.expenses}টি</b><br>
      ⏰ উপস্থিতি: <b style="color:#fff">window.${counts.attendance}টি</b><br>
      🏖️ ছুটি: <b style="color:#fff">window.${counts.leaves}টি</b><br>
      💰 বেতন: <b style="color:#fff">window.${counts.salaries}টি</b><br><br>
      <span style="color:var(--green);font-size:11px">✅ সব ডেটা Archive এ সংরক্ষিত থাকবে</span>`,
    onConfirm: async () => {
      try {
        window.loader(true);
        const ts = Date.now();
        const archivePath = 'monthlyArchive/' + archiveKey;

        // ✅ সব ডেটা archive করি
        await window._set(window._ref(window._db, archivePath), {
          archivedAt: ts,
          archivedBy: window.CN,
          month: archiveKey,
          monthLabel,
          sales:      window.allSales || {},
          expenses:   window.allExpenses || {},
          attendance: window.allAttendance || {},
          leaves:     window.allLeaves || {},
          salaries:   window.allSalaries || {},
          customers:  window.allCustomers || {},
          users:      window.allUsers || {},
        });

        // ✅ মূল ডেটা মুছি
        await window._remove(window._ref(window._db, 'sales'));
        await window._remove(window._ref(window._db, 'expenses'));
        await window._remove(window._ref(window._db, 'attendance'));
        await window._remove(window._ref(window._db, 'leaves'));
        await window._remove(window._ref(window._db, 'salaries'));

        // ✅ Customer এর due ০ করি (বাকি রিসেট)
        const custUpdates = {};
        Object.keys(window.allCustomers || {}).forEach(cid => {
          custUpdates['customers/' + cid + '/due'] = 0;
        });
        if (Object.keys(custUpdates).length > 0) {
          const { window._update: fbUpdate } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js');
          await fbUpdate(window._ref(window._db, '/'), custUpdates);
        }

        if (typeof window.auditLog === 'function')
          window.auditLog('monthly_reset', `মাসিক রিসেট: ${archiveKey} — ${window.CN} কর্তৃক`);

        window.loader(false);
        window.showToast('✅ মাসিক রিসেট সম্পন্ন! Archive এ সংরক্ষিত।');
      } catch(e) {
        window.loader(false);
        window.showToast('❌ রিসেট ব্যর্থ: ' + e.message, true);
      }
    }
  });
};

// বেতন/কমিশন শুধু রিসেট
window.resetSalaryOnly = async () => {
  if (window.CR !== 'admin') { window.showToast('শুধু Admin করতে পারবে!', true); return; }
  const archiveKey = new Date().toISOString().slice(0, 7);
  showResetConfirm({
    title: '💰 বেতন ও কমিশন রিসেট',
    body: `মোট <b style="color:#fff">${Object.keys(window.allSalaries||{}).length}টি</b> বেতন রেকর্ড মুছে যাবে।<br>Archive এ সংরক্ষিত থাকবে।`,
    onConfirm: async () => {
      try {
        window.loader(true);
        await window._set(window._ref(window._db, 'monthlyArchive/' + archiveKey + '/salaries'), window.allSalaries || {});
        await window._remove(window._ref(window._db, 'salaries'));
        if (typeof window.auditLog === 'function')
          window.auditLog('reset_salary', `বেতন রিসেট: ${archiveKey}`);
        window.loader(false);
        window.showToast('✅ বেতন রিসেট সম্পন্ন!');
      } catch(e) { window.loader(false); window.showToast('❌ ' + e.message, true); }
    }
  });
};

// উপস্থিতি শুধু রিসেট
window.resetAttendanceOnly = async () => {
  if (window.CR !== 'admin') { window.showToast('শুধু Admin করতে পারবে!', true); return; }
  const archiveKey = new Date().toISOString().slice(0, 7);
  showResetConfirm({
    title: '⏰ উপস্থিতি রিসেট',
    body: `মোট <b style="color:#fff">${Object.keys(window.allAttendance||{}).length}টি</b> উপস্থিতি রেকর্ড মুছে যাবে।`,
    onConfirm: async () => {
      try {
        window.loader(true);
        await window._set(window._ref(window._db, 'monthlyArchive/' + archiveKey + '/attendance'), window.allAttendance || {});
        await window._set(window._ref(window._db, 'monthlyArchive/' + archiveKey + '/leaves'), window.allLeaves || {});
        await window._remove(window._ref(window._db, 'attendance'));
        await window._remove(window._ref(window._db, 'leaves'));
        if (typeof window.auditLog === 'function')
          window.auditLog('reset_attendance', `উপস্থিতি রিসেট: ${archiveKey}`);
        window.loader(false);
        window.showToast('✅ উপস্থিতি রিসেট সম্পন্ন!');
      } catch(e) { window.loader(false); window.showToast('❌ ' + e.message, true); }
    }
  });
};

window.openMo=id=>window.$(id).classList.add('open');
window.closeMo=id=>window.$(id).classList.remove('open');

// ══ ENTERPRISE DASHBOARD PRINT ══
window.printEnterpriseDashboard=()=>{
  const el=document.getElementById('enterpriseDashboard');
  if(!el||!el.innerHTML.trim()){window.showToast('আগে ড্যাশবোর্ড লোড করুন!',true);return;}
  const w=window.open('','_blank');
  if(!w)return;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>NovaTEch BD — Enterprise Report</title>
  <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body{font-family:'Hind Siliguri',Arial,sans-serif;padding:24px;color:#1a202c;max-width:900px;margin:0 auto;}
    h1{color:#1E3A8A;font-size:20px;margin-bottom:4px;}
    .sub{color:#64748b;font-size:12px;margin-bottom:20px;}
    .sec{font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin:18px 0 8px;}
    .form-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:10px;}
    .sum-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;}
    .sum-card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:13px;}
    .lbl{font-size:11px;color:#64748b;margin-bottom:4px;}
    .val{font-size:20px;font-weight:700;}
    canvas{max-width:100%;}
    .rb{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:7px;}
    .ai-card{background:linear-gradient(135deg,#EFF6FF,#F5F3FF);border:1px solid #BFDBFE;border-radius:10px;padding:16px;}
    @media print{body{padding:10px;}button{display:none!important;}}
  </style></head><body>
  <h1>🏢 NovaTEch BD — Enterprise Analytics Report</h1>
  <div class="sub">তৈরির তারিখ: window.${new Date().toLocaleDateString('bn-BD',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
  window.${el.innerHTML}
  </body></html>`);
  w.document.close();
  setTimeout(()=>w.print(),800);
};

// ══ DRIVE CONFIG ══
window.saveDriveConfig=async()=>{
  const apiKey=window.$('driveApiKey')?.value.trim(),folderId=window.$('driveFolderId')?.value.trim();
  if(!apiKey||!folderId){window.showToast('API Key ও Folder ID দিন!',true);return;}
  await window._set(window._ref(window._db,'driveConfig'),{apiKey,folderId,updatedBy:window.CN,ts:Date.now()});
  window.showToast('Google Drive কনফিগ সেভ ✓');
  loadDriveConfig();
};
function loadDriveConfig(){
  window._get(window._ref(window._db,'driveConfig')).then(snap=>{
    if(!snap.exists())return;
    const d=snap.val();
    const el=window.$('driveApiKey');const el2=window.$('driveFolderId');
    if(el&&d.apiKey)el.value=d.apiKey;
    if(el2&&d.folderId)el2.value=d.folderId;
    const status=window.$('driveConfigStatus');
    if(status)status.innerHTML=`<div style="font-size:11px;color:var(--green);margin-top:6px">✅ সংরক্ষিত আছে · শেষ আপডেট: ${d.updatedBy||'–'}</div>`;
  });
}
// AI Debug log helper
function aiLog(msg, type='info') {
  const log=window.$('aiDebugLog');
  if(!log)return;
  const colors={info:'#7c8099',ok:'#2ecc8a',err:'#e85d4a',warn:'#f5a623'};
  const time=new Date().toLocaleTimeString('bn-BD',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  log.innerHTML+=`<div style="color:${colors[type]||colors.info};margin-bottom:2px">[${time}] ${msg}</div>`;
  log.scrollTop=log.scrollHeight;
}

function aiProgress(pct, text) {
  const bar=window.$('aiProgressBar'),txt=window.$('aiProgressText'),wrap=window.$('aiSaveProgress');
  if(wrap)wrap.style.display='block';
  if(bar)bar.style.width=pct+'%';
  if(txt)txt.textContent=text;
}

function aiStatus(msg, type='ok') {
  const el=window.$('aiConfigStatus');
  if(!el)return;
  const configs={
    ok:{bg:'rgba(46,204,138,.1)',border:'var(--green)',color:'var(--green)',icon:'✅'},
    err:{bg:'rgba(232,93,74,.1)',border:'var(--red)',color:'var(--red)',icon:'❌'},
    warn:{bg:'rgba(245,166,35,.1)',border:'var(--accent)',color:'var(--accent)',icon:'⚠️'},
    info:{bg:'rgba(74,158,255,.1)',border:'var(--blue)',color:'var(--blue)',icon:'ℹ️'},
  };
  const c=configs[type]||configs.info;
  el.innerHTML=`<div style="background:${c.bg};border:1px solid ${c.border};border-radius:8px;padding:10px;font-size:12px;color:${c.color}">${c.icon} ${msg}</div>`;
}

window.toggleAIKeyVisibility=()=>{
  const inp=window.$('anthropicApiKey'),btn=window.$('aiKeyToggle');
  if(!inp)return;
  inp.type=inp.type==='password'?'text':'password';
  if(btn)btn.textContent=inp.type==='password'?'👁':'🙈';
};

window.toggleAIDebug=()=>{
  const log=window.$('aiDebugLog');
  if(log)log.style.display=log.style.display==='none'?'block':'none';
};

window.saveAIConfig=window.saveAIConfigDebug=async()=>{
  const apiKey=(window.$('anthropicApiKey')?.value||'').trim();

  // Debug log রিসেট
  const log=window.$('aiDebugLog');if(log){log.innerHTML='';log.style.display='block';}
  aiLog('শুরু হচ্ছে...');

  // ১. Validation
  if(!apiKey){
    aiStatus('API Key দিন! Input ফাঁকা আছে।','err');
    aiLog('❌ API Key ফাঁকা','err');
    window.showToast('API Key দিন!',true);
    return;
  }
  aiLog(`Key পাওয়া গেছে: ${apiKey.slice(0,15)}...`,'ok');
  aiProgress(20,'Key যাচাই করা হচ্ছে...');

  if(!apiKey.startsWith('sk-ant-')){
    aiStatus('API Key সঠিক নয়! "sk-ant-" দিয়ে শুরু হওয়া উচিত।','err');
    aiLog('❌ Key format ভুল — sk-ant- দিয়ে শুরু হওয়া উচিত','err');
    window.showToast('⚠️ API Key সঠিক নয়!',true);
    return;
  }
  aiLog('✅ Key format সঠিক','ok');
  aiProgress(40,'Firebase এ সেভ হচ্ছে...');

  // ২. Firebase সেভ
  try{
    await window._set(window._ref(window._db,'aiConfig'),{
      apiKey,
      anthropicApiKey:apiKey,
      updatedBy:window.CN||'admin',
      ts:Date.now()
    });
    // ✅ window বা localStorage-এ key রাখি না
    window._ntAIReady=true;
    aiLog('✅ Firebase এ সেভ হয়েছে','ok');
    aiProgress(60,'Claude API পরীক্ষা করা হচ্ছে...');
    // ✅ Input masked করি সেভের পরে
    const inp=window.$('anthropicApiKey');
    if(inp) inp.value='•'.repeat(Math.min(apiKey.length,20));
  }catch(e){
    aiStatus(`Firebase সেভ ব্যর্থ: ${e.message}`,'err');
    aiLog('❌ Firebase error: '+e.message,'err');
    window.showToast('Firebase সেভ ব্যর্থ!',true);
    return;
  }

  // ৩. Claude API Test
  try{
    aiLog('Claude API call করছি...');
    const resp=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'x-api-key':apiKey,
        'anthropic-version':'2023-06-01',
        'anthropic-dangerous-direct-browser-access':'true'
      },
      body:JSON.stringify({
        model:'claude-haiku-4-5-20251001',
        max_tokens:20,
        messages:[{role:'user',content:'বাংলায় বলো: কাজ করছি'}]
      })
    });

    aiLog(`HTTP Status: ${resp.status}`);
    const data=await resp.json();
    aiLog('Response: '+JSON.stringify(data).slice(0,100));
    aiProgress(100,'সম্পন্ন!');

    if(data.content?.[0]?.text){
      const reply=data.content[0].text;
      aiLog('✅ Claude বলছে: '+reply,'ok');
      aiStatus(`সংরক্ষিত ও সক্রিয়! Claude বলছে: "${reply}"`, 'ok');
      window.showToast('✅ Claude AI সংযুক্ত!');
      // Auto engine শুরু
      if(typeof window.startAIAutoEngine==='function')window.startAIAutoEngine();
    } else if(data.error) {
      aiLog('❌ API Error: '+data.error.message,'err');
      aiStatus(`Key সেভ হয়েছে কিন্তু API Error: ${data.error.message}`, 'warn');
      window.showToast('Key সেভ — API Error: '+data.error.message,true);
    } else {
      aiLog('⚠️ অজানা response: '+JSON.stringify(data),'warn');
      aiStatus('Key সেভ হয়েছে কিন্তু response অস্বাভাবিক', 'warn');
    }
  }catch(e){
    aiLog('❌ Network error: '+e.message,'err');
    aiStatus(`Key সেভ হয়েছে। নেটওয়ার্ক সমস্যায় test করা যায়নি: ${e.message}`, 'warn');
    window.showToast('Key সেভ হয়েছে (test ব্যর্থ)',true);
  }

  setTimeout(()=>{
    const wrap=window.$('aiSaveProgress');
    if(wrap)wrap.style.display='none';
  },3000);
};

