// ══════════════════════════════════════════════
// ✅ মাসিক সতর্কতা সিস্টেম — Admin only
// ══════════════════════════════════════════════
function checkMonthlyAlerts() {
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth(); // 0-11
  const year = now.getFullYear();
  const monthKey = `${year}-${String(month+1).padStart(2,'0')}`;
  const lastDayOfMonth = new Date(year, month+1, 0).getDate();
  const daysLeft = lastDayOfMonth - day;

  // ── চেক কী কী করা হয়েছে এই মাসে
  // ✅ বেতন দেওয়া হয়েছে কিনা — localStorage flag
  const salaryPaid = !!localStorage.getItem(`nt-salary-paid-${monthKey}`);
  const hasSales   = Object.values(window.allSales||{}).some(s => s.date?.startsWith(monthKey));

  // ── নতুন মাসের শুরুতে checklist (১-৩ তারিখ)
  const lastMonthKey = (() => {
    const lm = new Date(year, month-1, 1);
    return `${lm.getFullYear()}-${String(lm.getMonth()+1).padStart(2,'0')}`;
  })();
  const shownKey = `nt-monthly-checklist-${lastMonthKey}`;

  if (day <= 3 && !localStorage.getItem(shownKey)) {
    const lmSales = Object.values(window.allSales||{}).filter(s => s.date?.startsWith(lastMonthKey));
    const lmTotal = lmSales.reduce((a,b) => a+(b.total||0), 0);
    const lmDue   = Object.values(window.allSales||{}).filter(s => s.due > 0).reduce((a,b) => a+(b.due||0), 0);
    // ✅ বেতন দেওয়া হয়েছে কিনা — Admin নিজে mark করেছে কিনা দেখি
    const lmSalaryPaid = !!localStorage.getItem(`nt-salary-paid-${lastMonthKey}`);
    showMonthlyChecklist(lastMonthKey, lmTotal, lmDue, lmSalaryPaid, shownKey);
    return;
  }

  // ── মাস শেষের সতর্কতা (শেষ ৩ দিন)
  if (daysLeft <= 2) {
    showMonthEndBanner(daysLeft, salaryPaid, hasSales);
  }
}

// ── মাস শেষের banner
function showMonthEndBanner(daysLeft, salaryPaid, hasSales) {
  // আগে আছে কিনা দেখি
  if (document.getElementById('monthEndBanner')) return;

  const banner = document.createElement('div');
  banner.id = 'monthEndBanner';
  banner.style.cssText = `
    position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
    width:calc(100% - 28px);max-width:402px;
    background:linear-gradient(135deg,#92400e,#d97706);
    color:#fff;border-radius:14px;padding:14px 16px;
    z-index:300;box-shadow:0 8px 32px rgba(0,0,0,.4);
    animation:slideUp .3s ease;
  `;
  banner.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:10px;">
      <div style="font-size:22px;flex-shrink:0;">⚠️</div>
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:700;margin-bottom:4px;">
          মাস শেষ হচ্ছে! window.${daysLeft===0?'আজই শেষ দিন':daysLeft+' দিন বাকি'}
        </div>
        <div style="font-size:11px;opacity:.85;line-height:1.6;">
          window.${!salaryPaid?'💰 বেতন এখনো দেওয়া হয়নি<br>':'✅ বেতন প্রস্তুত<br>'}
          📊 মাসিক রিপোর্ট নামিয়ে রাখুন<br>
          🏦 বাকি আদায়ের চেষ্টা করুন
        </div>
        <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">
          <button onclick="showPage('salary');setActiveTab('salary');document.getElementById('monthEndBanner').remove()"
            style="padding:5px 10px;font-size:11px;font-weight:700;border-radius:7px;cursor:pointer;
              background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.4);color:#fff;font-family:inherit;">
            💰 বেতন
          </button>
          <button onclick="showPage('report');setActiveTab('report');document.getElementById('monthEndBanner').remove()"
            style="padding:5px 10px;font-size:11px;font-weight:700;border-radius:7px;cursor:pointer;
              background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.4);color:#fff;font-family:inherit;">
            📊 রিপোর্ট
          </button>
          <button onclick="document.getElementById('monthEndBanner').remove()"
            style="padding:5px 10px;font-size:11px;font-weight:700;border-radius:7px;cursor:pointer;
              background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.2);color:#fff;font-family:inherit;">
            ✕ বন্ধ
          </button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(banner);
  // ৮ সেকেন্ড পরে auto hide
  setTimeout(() => banner?.remove(), 8000);
}

// ── নতুন মাসের checklist modal
function showMonthlyChecklist(lastMonthKey, lmTotal, lmDue, lmSalaryPaid, storageKey) {
  const mo = document.createElement('div');
  mo.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:400;
    display:flex;align-items:flex-end;justify-content:center;
    backdrop-filter:blur(3px);
  `;
  mo.innerHTML = `
    <div style="background:var(--surface);border-radius:20px 20px 0 0;padding:22px;
      width:100%;max-width:430px;box-shadow:0 -8px 40px rgba(0,0,0,.5);
      animation:slideUp .3s ease;">

      <!-- Header -->
      <div style="text-align:center;margin-bottom:18px;">
        <div style="font-size:32px;margin-bottom:6px;">🗓️</div>
        <div style="font-size:16px;font-weight:800;color:var(--text);">নতুন মাস শুরু!</div>
        <div style="font-size:12px;color:var(--muted);margin-top:3px;">
          গত মাসের কাজ সম্পন্ন হয়েছে কি?
        </div>
      </div>

      <!-- গত মাসের সারসংক্ষেপ -->
      <div style="background:var(--card);border-radius:12px;padding:12px;margin-bottom:14px;
        border:1px solid var(--border-l);">
        <div style="font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase;
          letter-spacing:.5px;margin-bottom:8px;">📊 গত মাসের সারসংক্ষেপ</div>
        <div style="display:flex;gap:8px;">
          <div style="flex:1;text-align:center;background:var(--surface);border-radius:8px;padding:8px;">
            <div style="font-size:14px;font-weight:800;color:var(--blue);">৳window.${Math.round(lmTotal/1000)}K</div>
            <div style="font-size:9px;color:var(--muted);">মোট বিক্রয়</div>
          </div>
          <div style="flex:1;text-align:center;background:var(--surface);border-radius:8px;padding:8px;">
            <div style="font-size:14px;font-weight:800;color:${lmDue>0?'var(--red)':'var(--green)'};">৳window.${Math.round(lmDue/1000)}K</div>
            <div style="font-size:9px;color:var(--muted);">বাকি</div>
          </div>
        </div>
      </div>

      <!-- Checklist -->
      <div style="margin-bottom:16px;">
        <div style="font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase;
          letter-spacing:.5px;margin-bottom:8px;">✅ চেকলিস্ট</div>
        window.${[
          {done: lmSalaryPaid, label: 'কর্মীদের বেতন দেওয়া হয়েছে', icon: '💰',
           action: lmSalaryPaid ? '' : `localStorage.setItem('nt-salary-paid-${lastMonthKey}','1');document.getElementById('monthlyChecklistModal').remove();showPage('salary');setActiveTab('salary')`},
          {done: false, label: 'মাসিক রিপোর্ট PDF নামানো হয়েছে', icon: '📊',
           action: `showPage('report');setActiveTab('report');document.getElementById('monthlyChecklistModal').remove()`},
          {done: lmDue===0, label: 'সব বাকি আদায় হয়েছে', icon: '🏦',
           action: lmDue>0 ? `showPage('due');setActiveTab('due');document.getElementById('monthlyChecklistModal').remove()` : ''},
        ].map(item => `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;
            background:var(--card);border-radius:10px;margin-bottom:6px;
            border:1px solid var(--border-l);cursor:pointer;"
            onclick="${item.action||''}">
            <div style="width:28px;height:28px;border-radius:8px;display:flex;align-items:center;
              justify-content:center;font-size:14px;
              background:window.${item.done?'rgba(16,185,129,.15)':'rgba(245,158,11,.1)'};">
              window.${item.icon}
            </div>
            <div style="flex:1;font-size:13px;color:var(--text);">window.${item.label}</div>
            <div style="font-size:14px;color:${item.done?'var(--green)':'var(--accent)'};">
              window.${item.done?'✅':'→'}
            </div>
          </div>`).join('')}
      </div>

      <!-- বাটন -->
      <button onclick="localStorage.setItem('${storageKey}','1');document.getElementById('monthlyChecklistModal').remove()"
        style="width:100%;padding:13px;background:linear-gradient(135deg,var(--accent),var(--accent-l));
          border:none;border-radius:12px;color:#1a1200;font-family:inherit;font-size:14px;
          font-weight:700;cursor:pointer;">
        ✅ বুঝেছি, শুরু করি নতুন মাস
      </button>
    </div>`;
  mo.id = 'monthlyChecklistModal';
  document.body.appendChild(mo);
}


// updateLowStockBanner
function updateLowStockBanner(){
  const banner=window.$('lowStockBanner');if(!banner)return;
  const pm={};
  Object.values(window.allStock).forEach(s=>{pm[s.prodName]=(pm[s.prodName]||0)+s.qty;});
  Object.values(window.allStockAssign).forEach(s=>{pm[s.prodName]=(pm[s.prodName]||0)-s.qty;});
  const low=Object.entries(pm).filter(([,q])=>q<=5&&q>=0);
  if(low.length){
    banner.style.display='block';
    banner.innerHTML='⚠️ কম স্টক: '+low.map(([n,q])=>'<b>'+n+'</b> ('+q+' পিস)').join(', ');
  }else{banner.style.display='none';}
}

// exportSalaryPDF
window.exportSalaryPDF=()=>{
  const now=new Date().toLocaleDateString('bn-BD',{month:'long',year:'numeric'});
  const workers=Object.entries(window.allUsers).filter(([,u])=>u.role==='worker'||u.role==='manager');
  const nowD=new Date();
  const html='<html><head><meta charset="UTF-8"><style>body{font-family:Arial;padding:20px;}h1{color:#1E3A8A;}table{width:100%;border-collapse:collapse;margin:16px 0;}th,td{border:1px solid #ddd;padding:8px;font-size:12px;}th{background:#1E3A8A;color:#fff;}</style></head><body>'
    +'<h1>NovaTEch BD — বেতন বিবরণী</h1><p>'+now+'</p>'
    +'<table><tr><th>নাম</th><th>ভূমিকা</th><th>মূল বেতন</th><th>উপস্থিতি</th><th>বিক্রয়</th><th>কমিশন</th><th>ভাতা</th><th>নেট বেতন</th></tr>'
    +workers.map(([uid,u])=>{
      const sal=window.allSalaries[uid],basic=sal?.basic||0,shiftH=parseFloat(sal?.shiftHours)||8;
      const att=Object.values(window.allAttendance).filter(a=>{const d=new Date(a.date);return a.uid===uid&&d.getMonth()===nowD.getMonth()&&d.getFullYear()===nowD.getFullYear();}).length;
      const sale=Object.values(window.allSales).filter(s=>{const d=new Date(s.date);return s.uid===uid&&d.getMonth()===nowD.getMonth()&&d.getFullYear()===nowD.getFullYear()&&s.payStatus==='paid';}).reduce((a,b)=>a+(b.total||0),0);
      const dailyMap={};
      Object.values(window.allSales).filter(s=>{const d=new Date(s.date);return s.uid===uid&&d.getMonth()===nowD.getMonth()&&d.getFullYear()===nowD.getFullYear()&&s.payStatus==='paid';}).forEach(s=>{dailyMap[s.date]=(dailyMap[s.date]||0)+s.total;});
      const comm=Object.values(dailyMap).reduce((a,v)=>a+calcCommission(v,window.allCommConfig||getDefaultSlabs()),0);
      const allow=Object.values(window.allAllowances).filter(a=>{const t=window.today();return a.uid===uid&&a.from<=t&&a.to>=t;}).reduce((a,b)=>a+(b.amount||0),0);
      const earnedBasic=(basic/26)*att;
      const net=earnedBasic+comm+allow;
      return '<tr><td>'+u.name+'</td><td>'+u.role+'</td><td>'+Math.round(basic).toLocaleString()+'</td><td>'+att+' দিন</td><td>'+Math.round(sale).toLocaleString()+'</td><td>'+Math.round(comm).toLocaleString()+'</td><td>'+Math.round(allow).toLocaleString()+'</td><td><b>'+Math.round(net).toLocaleString()+'</b></td></tr>';
    }).join('')
    +'</table></body></html>';
  const w=window.open('','_blank');if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);}
};

// ══ AI CHAT ══
window.sendAIChat=async()=>{
  const input=document.getElementById('aiChatInput');
  const msgs=document.getElementById('aiChatMessages');
  if(!input||!msgs)return;
  const msg=input.value.trim();if(!msg)return;
  input.value='';
  msgs.innerHTML+='<div style="background:var(--blue);color:#fff;border-radius:12px 12px 2px 12px;padding:8px 12px;font-size:13px;max-width:80%;align-self:flex-end;margin-left:auto;margin-bottom:6px">'+msg+'</div>';
  msgs.scrollTop=msgs.scrollHeight;
  const tid='t'+Date.now();
  msgs.innerHTML+='<div id="'+tid+'" style="background:var(--card);border-radius:2px 12px 12px 12px;padding:8px 12px;font-size:13px;max-width:80%;margin-bottom:6px">🤖 ভাবছি...</div>';
  msgs.scrollTop=msgs.scrollHeight;
  const apiKey=window._ntAIKey||localStorage.getItem('nt-ai-key')||'';
  if(!apiKey){document.getElementById(tid).textContent='❌ Admin → AI Config এ API Key দিন।';return;}
  try{
    const ctx='ব্যবসার ডেটা: বিক্রয়='+Object.values(window.allSales||{}).length+'টি, কর্মী='+Object.keys(window.allUsers||{}).length+'জন। প্রশ্ন: '+msg;
    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:600,messages:[{role:'user',content:ctx}]})
    });
    const data=await res.json();
    const reply=data.content?.[0]?.text||'উত্তর পাওয়া যায়নি';
    const el=document.getElementById(tid);
    if(el)el.innerHTML='<span style="color:var(--accent);font-weight:600">🤖 AI:</span> '+reply.replace(/\n/g,'<br>');
  }catch(e){const el=document.getElementById(tid);if(el)el.textContent='❌ সমস্যা: '+e.message;}
  msgs.scrollTop=msgs.scrollHeight;
};

// ✅ FIX: switchFolderTab duplicate removed — original at line ~1904 is used


