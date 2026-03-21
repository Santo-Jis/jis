// ══════════════════════════════════════════════════
//  NovaTEch BD — App Engine v4.1 (Modular)
//  Entry Point — সব module এখান থেকে লোড হয়
// ══════════════════════════════════════════════════

// ✅ Load order গুরুত্বপূর্ণ — firebase আগে, তারপর core, তারপর বাকি সব
import './firebase-config.js';   // Firebase init → window._db, window._auth etc
import './core.js';               // Global state + auth + initApp → window.showToast etc
import './notifications.js';      // FCM push + in-app notifications
import './gps.js';                // Live GPS tracking
import './offline-sync.js';       // IndexedDB offline sync
import './nav.js';                // Navigation + drawer menu
import './dashboard.js';          // Dashboard render functions
import './sales.js';              // বিক্রয়, বাকি, payment management
import './admin.js';              // Admin panel, monthly reset
import './search-theme.js';       // Global search + theme switcher
import './reports.js';            // Print, P&L, invoice, reports
import './folders.js';            // Folder/report system
import './alerts-ai.js';          // Monthly alerts + AI chat
import './archive.js';            // Archive viewer
import './ledger.js';             // Complete ledger
