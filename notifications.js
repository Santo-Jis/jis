// ════════════════════════════════════════════════════════════
// ✅ FEATURE 1: IN-APP NOTIFICATION SYSTEM
//    Firebase Realtime Database listener দিয়ে
//    Spark (Free) plan-এ সম্পূর্ণ কাজ করে
// ════════════════════════════════════════════════════════════
let _fcmMessaging = null;
let _lastNotifTs = Date.now(); // শুধু নতুন notification দেখাই

async function initFCMPushNotification() {
  try {
    if (!window.CU?.uid) return;

    // ✅ Firebase Database-এ নিজের notification path listen করি
    window._onValue(window._ref(window._db, 'notifications/' + window.CU.uid), snap => {
      const data = snap.val();
      if (!data) return;

      // সব notification loop করি
      Object.entries(data).forEach(([id, notif]) => {
        // পুরানো notification skip করি
        if (!notif || notif.ts < _lastNotifTs) return;
        if (notif.read) return;

        // ✅ In-app notification দেখাই
        showInAppNotification(notif.title, notif.body, notif.page || 'dash');

        // ✅ Browser Push Notification (অ্যাপ background-এ থাকলে)
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(notif.title || 'NovaTEch BD 📒', {
            body: notif.body || '',
            icon: '/icons/icon-192.png',
            badge: '/icons/badge-72.png',
            tag: 'novatech-' + id,
          });
        }

        // Read mark করি
        window._update(window._ref(window._db, 'notifications/' + window.CU.uid + '/' + id), { read: true });
      });
    });

    // ✅ Browser notification permission চাই
    if ('Notification' in window && Notification.permission === 'default') {
      setTimeout(async () => {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') window.showToast('🔔 Notification চালু হয়েছে');
      }, 3000);
    }

    console.log('✅ In-app Notification সক্রিয়');
  } catch(e) { console.warn('Notification init error:', e.message); }
}

// ── In-app notification banner
function showInAppNotification(title, body, page) {
  const banner = document.createElement('div');
  banner.style.cssText = `
    position:fixed;top:60px;left:50%;transform:translateX(-50%) translateY(-20px);
    background:var(--card);border:1px solid var(--accent);border-radius:14px;
    padding:13px 16px;z-index:999;max-width:360px;width:90%;
    box-shadow:0 8px 32px rgba(0,0,0,.5);
    opacity:0;transition:all .3s ease;cursor:pointer;
  `;
  banner.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:10px;">
      <div style="font-size:22px;flex-shrink:0;">🔔</div>
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:700;color:var(--accent);">window.${title || 'NovaTEch BD'}</div>
        <div style="font-size:12px;color:var(--text);margin-top:3px;">window.${body || ''}</div>
      </div>
      <button onclick="this.parentElement.parentElement.remove()"
        style="background:none;border:none;color:var(--muted);font-size:18px;cursor:pointer;flex-shrink:0;padding:0;">✕</button>
    </div>`;
  banner.onclick = (e) => {
    if (e.target.tagName === 'BUTTON') return;
    if (page && typeof showPage === 'function') { showPage(page); setActiveTab(page); }
    banner.remove();
  };
  document.body.appendChild(banner);
  // Animate in
  requestAnimationFrame(() => {
    banner.style.opacity = '1';
    banner.style.transform = 'translateX(-50%) translateY(0)';
  });
  // Auto remove
  setTimeout(() => {
    banner.style.opacity = '0';
    setTimeout(() => banner.remove(), 300);
  }, 5000);
}
window.showInAppNotification = showInAppNotification;

// ✅ Notification পাঠানোর ফাংশন — যেকোনো user-কে
window.sendNotificationTo = async function(uid, title, body, page = 'dash') {
  if (!uid) return;
  try {
    await window._push(window._ref(window._db, 'notifications/' + uid), {
      title, body, page,
      from: window.CN, fromUid: window.CU.uid,
      ts: Date.now(), read: false
    });
  } catch(e) { console.warn('Send notification error:', e.message); }
};

// ✅ সবাইকে বা role অনুযায়ী notification
window.sendNotificationToRole = async function(role, title, body, page = 'dash') {
  const targets = Object.entries(window.allUsers || {})
    .filter(([uid, u]) => (role === 'all' || u.role === role) && uid !== window.CU.uid);
  for (const [uid] of targets) {
    await window.sendNotificationTo(uid, title, body, page);
  }
};

// ✅ পুরানো sendPushToWorker compat
window.sendPushToWorker = async function(uid, title, body, page = 'dash') {
  await window.sendNotificationTo(uid, title, body, page);
  window.showToast('✅ Notification পাঠানো হয়েছে');
};

