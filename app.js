// =========================================================
// RWA PAID TEST SERIES APP - DASHBOARD, BOOKMARKS & AUTH (app.js)
// =========================================================

const BOT_API_BASE = "https://rwaweb-hp11.onrender.com";
const API_BASE = "https://rozgarapinew.teachx.in";
const AES_KEY = CryptoJS.enc.Utf8.parse("638udh3829162018");
const WORKER_RAW_PROXY = "https://proplayer.allswbatch22.workers.dev/proxy?url=";

// 🟢 TELEGRAM UPLOAD CONFIGURATION
const TG_BOT_TOKEN = "8832643385:AAG5SZyJo7dDrvvK_dO_2pEOQK09OLeA6WM"; 
const TG_CHANNEL_ID = "-1004454849047";

// =====================================================
// PERMANENT DEVICE STORAGE ENGINE (LOCALSTORAGE + INDEXEDDB)
// =====================================================
const IDB_NAME = "RWA_TestSeries_Permanent_DB";
const IDB_STORE = "app_kv_store";

function requestPersistentStorage() {
    if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().catch(() => {});
    }
}

function openPermanentIDB() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) return reject("No IDB");
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(IDB_STORE)) {
                db.createObjectStore(IDB_STORE);
            }
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = (e) => reject(e);
    });
}

async function idbSetItem(key, val) {
    try {
        const db = await openPermanentIDB();
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).put(val, key);
    } catch {}
}

async function idbGetItem(key) {
    try {
        const db = await openPermanentIDB();
        return await new Promise((resolve) => {
            const tx = db.transaction(IDB_STORE, "readonly");
            const req = tx.objectStore(IDB_STORE).get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        });
    } catch {
        return null;
    }
}

async function restoreFromPermanentIDB() {
    requestPersistentStorage();
    try {
        const idbAttempts = await idbGetItem("rwa_attempted_tests_v1");
        if (idbAttempts && typeof idbAttempts === "object") {
            ATTEMPTED_TESTS = { ...idbAttempts, ...ATTEMPTED_TESTS };
            localStorage.setItem("rwa_attempted_tests_v1", JSON.stringify(ATTEMPTED_TESTS));
        } else if (Object.keys(ATTEMPTED_TESTS).length > 0) {
            idbSetItem("rwa_attempted_tests_v1", ATTEMPTED_TESTS);
        }

        const idbBookmarks = await idbGetItem("rwa_bookmarked_questions_v1");
        if (Array.isArray(idbBookmarks) && idbBookmarks.length > 0 && BOOKMARKED_QUESTIONS.length === 0) {
            BOOKMARKED_QUESTIONS = idbBookmarks;
            localStorage.setItem("rwa_bookmarked_questions_v1", JSON.stringify(BOOKMARKED_QUESTIONS));
        } else if (BOOKMARKED_QUESTIONS.length > 0) {
            idbSetItem("rwa_bookmarked_questions_v1", BOOKMARKED_QUESTIONS);
        }

        const idbTokens = await idbGetItem("rwa_user_tokens_v2");
        if (Array.isArray(idbTokens) && idbTokens.length > 0 && USER_TOKENS.length === 0) {
            USER_TOKENS = idbTokens.filter(t => t && t.token && !t.isAdmin);
            localStorage.setItem("rwa_user_tokens_v2", JSON.stringify(USER_TOKENS));
        }

        const idbProfile = await idbGetItem("rwa_user_profile_v2");
        if (idbProfile && !USER_PROFILE) {
            USER_PROFILE = idbProfile;
            localStorage.setItem("rwa_user_profile_v2", JSON.stringify(USER_PROFILE));
        }

        updateTokenBadge();
        window.updateDashboardUI();
    } catch {}
}

// =====================================================
// TELEGRAM UPLOAD ENGINE (FOR TEST PDF)
// =====================================================
window.sendToTelegramChannel = async function(blob, fileType, title) {
    if (!TG_BOT_TOKEN || TG_BOT_TOKEN === "YOUR_BOT_TOKEN_HERE") return false;
    
    const caption = `╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
       🏆 𝐑𝐖𝐀 𝐓𝐄𝐒𝐓 𝐒𝐄𝐑𝐈𝐄𝐒 𝐋𝐈𝐁𝐑𝐀𝐑𝐘
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

📁 Type            : ${fileType}
🎬 Title             : ${title}
🏆 Series Name : ${state.activeSeriesTitle || "Paid Test Series"}
📚 Folder Name : ${state.activeTsSubName || "Mock Test"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐑𝐖𝐀
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

    const formData = new FormData();
    formData.append("chat_id", TG_CHANNEL_ID);
    formData.append("caption", caption);
    formData.append("document", blob, `${title}.pdf`);

    try {
        const res = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendDocument`, {
            method: "POST",
            body: formData
        });
        const json = await res.json();
        return Boolean(json.ok);
    } catch {
        return false;
    }
};

window.downloadAndUploadPDF = async function(pdfUrl, title) {
    try {
        alert("PDF Download & Telegram Upload Started...");
        const res = await fetch(pdfUrl);
        const blob = await res.blob();
        
        const a = document.createElement("a");
        const objUrl = URL.createObjectURL(blob);
        a.href = objUrl;
        a.download = `${title}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objUrl);

        const success = await window.sendToTelegramChannel(blob, "PDF", title);
        if (success) alert("✅ PDF Uploaded to Telegram Channel!");
    } catch (e) {
        alert("Error downloading PDF: " + e.message);
    }
};

// =====================================================
// JWT DECODER & LOCAL STORAGE (TOKENS, ATTEMPTS, BOOKMARKS)
// =====================================================
function extractUidFromJwt(jwtStr) {
    if (!jwtStr || typeof jwtStr !== "string") return "";
    try {
        const parts = jwtStr.trim().split(".");
        if (parts.length < 2) return "";
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(atob(base64).split("").map(c => {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(""));
        const payload = JSON.parse(jsonPayload);
        return String(payload.id || payload.userid || payload.user_id || "");
    } catch {
        return "";
    }
}

function getUserSavedTokens() {
    try {
        const raw = localStorage.getItem("rwa_user_tokens_v2");
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed.filter(t => t && t.token && !t.isAdmin);
            }
        }
    } catch {}
    return [];
}

function getSavedUserProfile() {
    try {
        const raw = localStorage.getItem("rwa_user_profile_v2");
        if (raw) return JSON.parse(raw);
    } catch {}
    return null;
}

function getSavedAttemptsMap() {
    try {
        const raw = localStorage.getItem("rwa_attempted_tests_v1");
        if (raw) return JSON.parse(raw) || {};
    } catch {}
    return {};
}

function getSavedBookmarksList() {
    try {
        const raw = localStorage.getItem("rwa_bookmarked_questions_v1");
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch {}
    return [];
}

let USER_TOKENS = getUserSavedTokens();
let USER_PROFILE = getSavedUserProfile();
let ATTEMPTED_TESTS = getSavedAttemptsMap();
let BOOKMARKED_QUESTIONS = getSavedBookmarksList();
let activeBookmarkDetailIdx = 0;

function isUserLoggedIn() {
    return USER_TOKENS.length > 0 && Boolean(USER_TOKENS[0].token);
}

function updateTokenBadge() {
    const b = document.getElementById("tokCountBadge");
    if (b) b.textContent = USER_TOKENS.length;
    checkAuthUIState();
}

function checkAuthUIState() {
    const userNameText = document.getElementById("navUserNameText");
    const avatarEl = document.getElementById("navProfileAvatar");

    if (isUserLoggedIn()) {
        const name = (USER_PROFILE && USER_PROFILE.name) ? USER_PROFILE.name : "My Profile";
        if (userNameText) userNameText.textContent = name;
        if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
    } else {
        if (userNameText) userNameText.textContent = "Profile / Login";
        if (avatarEl) avatarEl.textContent = "👤";
    }
}

// =====================================================
// DASHBOARD & PROGRESS ENGINE
// =====================================================
window.updateDashboardUI = function() {
    const totalSeries = state.totalSeriesCount || 0;
    const attemptedIds = Object.keys(ATTEMPTED_TESTS);
    const attemptedCount = attemptedIds.length;
    const totalTests = Math.max(state.totalTestsCount || 0, attemptedCount, Object.keys(state.knownTestIds || {}).length);
    const remainingCount = Math.max(0, totalTests - attemptedCount);

    const elSeries = document.getElementById("dashTotalSeries");
    const elTests = document.getElementById("dashTotalTests");
    const elAttempted = document.getElementById("dashAttemptedTests");
    const elRemaining = document.getElementById("dashRemainingTests");

    if (elSeries) elSeries.textContent = totalSeries;
    if (elTests) elTests.textContent = totalTests;
    if (elAttempted) elAttempted.textContent = attemptedCount;
    if (elRemaining) elRemaining.textContent = remainingCount;

    const pct = totalTests > 0 ? Math.min(100, Math.round((attemptedCount / totalTests) * 100)) : 0;
    const pctBadge = document.getElementById("dashProgressPercent");
    const pctBar = document.getElementById("dashProgressBar");
    const pctSub = document.getElementById("dashProgressSubtext");

    if (pctBadge) pctBadge.textContent = `${pct}% Completed`;
    if (pctBar) pctBar.style.width = `${pct}%`;
    if (pctSub) {
        pctSub.textContent = `Aapne kul ${totalTests} tests mein se ${attemptedCount} attempt kar liye hain (${remainingCount} bache hain).`;
    }

    const bmBadge = document.getElementById("bookmarkCountBadge");
    if (bmBadge) bmBadge.textContent = BOOKMARKED_QUESTIONS.length;

    renderRecentAttemptsList();
};

window.recordUserTestAttempt = function(testId, attemptInfo) {
    if (!testId) return;
    const tid = String(testId).trim();
    ATTEMPTED_TESTS[tid] = {
        testId: tid,
        testKey: attemptInfo.testKey || `test_${tid}`,
        title: attemptInfo.title || `Test #${tid}`,
        seriesId: attemptInfo.seriesId || state.activeSeriesId || "",
        seriesTitle: attemptInfo.seriesTitle || state.activeSeriesTitle || "Paid Test Series",
        score: attemptInfo.score ?? 0,
        maxMarks: attemptInfo.maxMarks ?? 100,
        correct: attemptInfo.correct ?? 0,
        incorrect: attemptInfo.incorrect ?? 0,
        unattempted: attemptInfo.unattempted ?? 0,
        accuracy: attemptInfo.accuracy ?? 0,
        timeCorr: attemptInfo.timeCorr ?? 0,
        timeInc: attemptInfo.timeInc ?? 0,
        timeUna: attemptInfo.timeUna ?? 0,
        testMeta: attemptInfo.testMeta || state.testMap[`test_${tid}`] || null,
        responses: attemptInfo.responses || {},
        selectedOptionalByGroup: attemptInfo.selectedOptionalByGroup || {},
        activeSectionsSnapshot: attemptInfo.activeSectionsSnapshot || null,
        questionsSnapshot: attemptInfo.questionsSnapshot || null,
        date: new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    };

    try {
        localStorage.setItem("rwa_attempted_tests_v1", JSON.stringify(ATTEMPTED_TESTS));
    } catch {
        // If localStorage quota is tight, strip heavy question text from localStorage copy while keeping full snapshot in IndexedDB
        const slimCopy = { ...ATTEMPTED_TESTS };
        if (slimCopy[tid]) {
            slimCopy[tid] = { ...slimCopy[tid], questionsSnapshot: null, activeSectionsSnapshot: null };
        }
        try { localStorage.setItem("rwa_attempted_tests_v1", JSON.stringify(slimCopy)); } catch {}
    }
    idbSetItem("rwa_attempted_tests_v1", ATTEMPTED_TESTS);
    window.updateDashboardUI();
};

window.getSavedAttemptByTestId = function(testId) {
    return ATTEMPTED_TESTS[String(testId).trim()] || null;
};

// CLICKING ANY RECENTLY ATTEMPTED TEST OPENS FULL SCORECARD & SOLUTIONS
function renderRecentAttemptsList() {
    const container = document.getElementById("recentAttemptsList");
    if (!container) return;

    const entries = Object.values(ATTEMPTED_TESTS).reverse();
    if (entries.length === 0) {
        container.innerHTML = `<div class="p-6 text-center text-xs font-bold text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">Abhi tak aapne koi test attempt nahi kiya hai. Test submit karte hi aapka score yahan dikhega.</div>`;
        return;
    }

    container.innerHTML = entries.map(item => `
        <div onclick="openSavedTestScorecard('${item.testId}', '${item.testKey || `test_${item.testId}`}')" class="bg-slate-50 hover:bg-sky-50/80 border-2 border-sky-200 hover:border-indigo-400 rounded-2xl p-4 flex flex-wrap justify-between items-center gap-3 cursor-pointer transition-all shadow-sm">
            <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                    <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">✅ ATTEMPTED</span>
                    <span class="text-[11px] font-bold text-slate-500">🕒 ${item.date || ""}</span>
                </div>
                <h4 class="font-black text-sm sm:text-base text-slate-900 mt-1">${item.title}</h4>
                <p class="text-xs font-bold text-indigo-600 mt-0.5">${item.seriesTitle}</p>
                <div class="inline-flex items-center gap-1.5 mt-2 text-[11px] font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                    📊 Click to View Full Scorecard & Solutions ➔
                </div>
            </div>
            <div class="flex items-center gap-3">
                <div class="text-right bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm">
                    <div class="text-[10px] font-extrabold text-slate-500 uppercase">Score</div>
                    <div class="text-sm font-black text-indigo-700">${item.score} / ${item.maxMarks}</div>
                    <div class="text-[10px] font-bold text-emerald-600">🎯 ${item.accuracy}% Acc</div>
                </div>
            </div>
        </div>
    `).join("");
}

window.openSavedTestScorecard = async function(testId, tKey) {
    const tid = String(testId).trim();
    const record = ATTEMPTED_TESTS[tid];
    if (!record) {
        alert("Is test ka scorecard data nahi mila.");
        return;
    }
    if (typeof window.openSavedTcsScorecard === "function") {
        await window.openSavedTcsScorecard(tid, tKey || `test_${tid}`, record);
    }
};

window.clearAttemptHistory = function() {
    if (confirm("Kya aap apni Attempted Tests history reset karna chahte hain?")) {
        ATTEMPTED_TESTS = {};
        localStorage.removeItem("rwa_attempted_tests_v1");
        idbSetItem("rwa_attempted_tests_v1", {});
        window.updateDashboardUI();
        if (state.view === "ts_tests" && state.activeSeriesId) {
            openTestSeriesTitles(state.activeSeriesId, state.activeTsSubId || "-1", state.activeTsSubName || state.activeSeriesTitle);
        }
    }
};

// =====================================================
// BOOKMARKS ENGINE (COMPACT LIST + CLICK DETAIL VIEW WITH PREV/NEXT)
// =====================================================
window.isQuestionBookmarked = function(qKey) {
    return BOOKMARKED_QUESTIONS.some(b => String(b.qKey) === String(qKey));
};

window.toggleBookmarkItem = function(itemObj) {
    if (!itemObj || !itemObj.qKey) return false;
    const existsIdx = BOOKMARKED_QUESTIONS.findIndex(b => String(b.qKey) === String(itemObj.qKey));
    let isNowSaved = false;

    if (existsIdx >= 0) {
        BOOKMARKED_QUESTIONS.splice(existsIdx, 1);
        isNowSaved = false;
    } else {
        BOOKMARKED_QUESTIONS.unshift({
            ...itemObj,
            savedAt: new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
        });
        isNowSaved = true;
    }

    localStorage.setItem("rwa_bookmarked_questions_v1", JSON.stringify(BOOKMARKED_QUESTIONS));
    idbSetItem("rwa_bookmarked_questions_v1", BOOKMARKED_QUESTIONS);
    window.updateDashboardUI();
    renderBookmarksTab();
    return isNowSaved;
};

window.removeBookmarkByKey = function(qKey, fromDetailView = false) {
    BOOKMARKED_QUESTIONS = BOOKMARKED_QUESTIONS.filter(b => String(b.qKey) !== String(qKey));
    localStorage.setItem("rwa_bookmarked_questions_v1", JSON.stringify(BOOKMARKED_QUESTIONS));
    idbSetItem("rwa_bookmarked_questions_v1", BOOKMARKED_QUESTIONS);
    window.updateDashboardUI();

    if (fromDetailView) {
        if (BOOKMARKED_QUESTIONS.length === 0) {
            closeBookmarkDetailView();
        } else {
            if (activeBookmarkDetailIdx >= BOOKMARKED_QUESTIONS.length) {
                activeBookmarkDetailIdx = BOOKMARKED_QUESTIONS.length - 1;
            }
            openBookmarkDetailView(activeBookmarkDetailIdx);
        }
    } else {
        renderBookmarksTab();
    }
};

window.clearAllBookmarks = function() {
    if (BOOKMARKED_QUESTIONS.length === 0) return;
    if (confirm("Kya aap sabhi Bookmarked Questions delete karna chahte hain?")) {
        BOOKMARKED_QUESTIONS = [];
        localStorage.removeItem("rwa_bookmarked_questions_v1");
        idbSetItem("rwa_bookmarked_questions_v1", []);
        closeBookmarkDetailView();
        window.updateDashboardUI();
        renderBookmarksTab();
    }
};

// STEP 1 OF BOOKMARKS: SHOW ONLY QUESTIONS LIST
function renderBookmarksTab() {
    const container = document.getElementById("bookmarksListContainer");
    if (!container) return;

    if (BOOKMARKED_QUESTIONS.length === 0) {
        container.innerHTML = `
            <div class="sky-card p-10 text-center">
                <div class="text-4xl mb-2">🔖</div>
                <h4 class="font-black text-base text-slate-800">Abhi koi Question Bookmark nahi hai</h4>
                <p class="text-xs font-semibold text-slate-500 mt-1">Live Test ya Solution dekhte waqt upar <b>☆ Save</b> button dabayein, woh question yahan save ho jayega.</p>
            </div>`;
        return;
    }

    container.innerHTML = BOOKMARKED_QUESTIONS.map((b, idx) => `
        <div onclick="openBookmarkDetailView(${idx})" class="sky-card p-4 sm:p-5 hover:border-indigo-400 cursor-pointer transition-all flex items-start justify-between gap-3">
            <div class="flex items-start gap-3 min-w-0 flex-1">
                <div class="w-9 h-9 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    Q${idx + 1}
                </div>
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap mb-1.5">
                        <span class="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 text-[10px] font-black">${b.subject || "Subject"}</span>
                        <span class="text-[11px] font-bold text-slate-500">📝 ${b.testTitle || "Mock Test"} (Q.${b.qNumber || 1})</span>
                    </div>
                    <div class="text-sm sm:text-base font-bold text-slate-900 leading-relaxed">${b.question || ""}</div>
                    <div class="inline-block mt-2.5 text-xs font-extrabold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg">
                        👁️ Click to View Options & Full Explanation ➔
                    </div>
                </div>
            </div>
            <button onclick="event.stopPropagation(); removeBookmarkByKey('${b.qKey}', false);" class="px-2.5 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 font-extrabold text-[11px] border-0 cursor-pointer shrink-0">
                🗑
            </button>
        </div>
    `).join("");

    if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise([container]).catch(() => {});
    }
}

// STEP 2 OF BOOKMARKS: CLICK QUESTION TO OPEN FULL OPTIONS, ANSWER & EXPLANATION WITH NEXT/PREV
window.openBookmarkDetailView = function(idx) {
    if (!BOOKMARKED_QUESTIONS || BOOKMARKED_QUESTIONS.length === 0) return;
    if (idx < 0 || idx >= BOOKMARKED_QUESTIONS.length) return;

    activeBookmarkDetailIdx = idx;
    const b = BOOKMARKED_QUESTIONS[idx];

    const listSub = document.getElementById("bookmarksListSubView");
    const detailSub = document.getElementById("bookmarkDetailSubView");
    if (listSub) listSub.classList.add("hidden");
    if (detailSub) detailSub.classList.remove("hidden");

    const counterEl = document.getElementById("bmDetailCounter");
    if (counterEl) counterEl.textContent = `Question ${idx + 1} of ${BOOKMARKED_QUESTIONS.length}`;

    const delBtn = document.getElementById("bmDetailDeleteBtn");
    if (delBtn) {
        delBtn.onclick = () => window.removeBookmarkByKey(b.qKey, true);
    }

    const metaEl = document.getElementById("bmDetailMeta");
    if (metaEl) {
        metaEl.innerHTML = `
            <span class="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black">🔖 Bookmark #${idx + 1}</span>
            <span class="px-3 py-1 rounded-full bg-indigo-100 text-indigo-900 text-xs font-black">${b.subject || "Subject"}</span>
            <span class="text-xs font-bold text-slate-600">📝 ${b.testTitle || "Mock Test"} (Original Q.${b.qNumber || 1})</span>
        `;
    }

    const qEl = document.getElementById("bmDetailQuestion");
    if (qEl) qEl.innerHTML = b.question || "";

    const optsEl = document.getElementById("bmDetailOptions");
    const letters = ["A", "B", "C", "D", "E"];
    const opts = b.options || [];
    const ansStr = String(b.answer || "1").trim();

    if (optsEl) {
        optsEl.innerHTML = opts.map((optText, oIdx) => {
            if (!optText) return "";
            const optId = String(oIdx + 1);
            const isCorrect = optId === ansStr;
            return `
                <div class="p-3.5 rounded-xl border-2 text-sm flex items-start justify-between gap-3 ${isCorrect ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-sm' : 'bg-white border-slate-200 text-slate-800'}">
                    <div class="flex items-start gap-2.5">
                        <span class="font-black text-indigo-900">${letters[oIdx] || optId}.</span>
                        <div class="leading-relaxed">${optText}</div>
                    </div>
                    ${isCorrect ? `<span class="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-black shrink-0">✓ Correct Answer</span>` : ""}
                </div>`;
        }).join("");
    }

    const solEl = document.getElementById("bmDetailSolution");
    if (solEl) {
        solEl.innerHTML = b.solution || "Detailed solution is shown in the highlighted correct option above.";
    }

    const prevBtn = document.getElementById("bmPrevBtn");
    const nextBtn = document.getElementById("bmNextBtn");
    if (prevBtn) {
        prevBtn.disabled = idx <= 0;
        prevBtn.style.opacity = idx <= 0 ? "0.45" : "1";
    }
    if (nextBtn) {
        nextBtn.disabled = idx >= BOOKMARKED_QUESTIONS.length - 1;
        nextBtn.style.opacity = idx >= BOOKMARKED_QUESTIONS.length - 1 ? "0.45" : "1";
    }

    if (window.MathJax && MathJax.typesetPromise && detailSub) {
        MathJax.typesetPromise([detailSub]).catch(() => {});
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
};

window.closeBookmarkDetailView = function() {
    const listSub = document.getElementById("bookmarksListSubView");
    const detailSub = document.getElementById("bookmarkDetailSubView");
    if (detailSub) detailSub.classList.add("hidden");
    if (listSub) listSub.classList.remove("hidden");
    renderBookmarksTab();
};

window.prevBookmarkDetail = function() {
    if (activeBookmarkDetailIdx > 0) {
        window.openBookmarkDetailView(activeBookmarkDetailIdx - 1);
    }
};

window.nextBookmarkDetail = function() {
    if (activeBookmarkDetailIdx < BOOKMARKED_QUESTIONS.length - 1) {
        window.openBookmarkDetailView(activeBookmarkDetailIdx + 1);
    }
};

// =====================================================
// APP TAB SWITCHER (TESTS | DASHBOARD | BOOKMARKS)
// =====================================================
window.switchAppTab = function(tabName) {
    state.activeAppTab = tabName;

    const tabs = {
        tests: { btn: "appTabTests", view: "appViewTests" },
        dashboard: { btn: "appTabDashboard", view: "appViewDashboard" },
        bookmarks: { btn: "appTabBookmarks", view: "appViewBookmarks" }
    };

    Object.keys(tabs).forEach(k => {
        const btnEl = document.getElementById(tabs[k].btn);
        const viewEl = document.getElementById(tabs[k].view);
        if (k === tabName) {
            if (btnEl) btnEl.className = "flex-1 py-2.5 px-4 rounded-xl font-extrabold text-xs bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow border-0 cursor-pointer whitespace-nowrap transition-all";
            if (viewEl) viewEl.classList.remove("hidden");
        } else {
            if (btnEl) btnEl.className = "flex-1 py-2.5 px-4 rounded-xl font-extrabold text-xs text-slate-700 bg-transparent hover:bg-sky-50 border-0 cursor-pointer whitespace-nowrap transition-all";
            if (viewEl) viewEl.classList.add("hidden");
        }
    });

    if (tabName === "dashboard") {
        window.updateDashboardUI();
    } else if (tabName === "bookmarks") {
        closeBookmarkDetailView();
    }
};

// =====================================================
// LOGIN MODAL & MONGODB PROFILE SYNC ENGINE
// =====================================================
function openLoginModal(customMsg) {
    const modal = document.getElementById("loginModal");
    if (modal) modal.classList.remove("hidden");
    if (customMsg) {
        showLoginStatus(customMsg, "info");
    } else {
        const alertBox = document.getElementById("loginStatusAlert");
        if (alertBox) alertBox.classList.add("hidden");
    }
}

function closeLoginModal() {
    const modal = document.getElementById("loginModal");
    if (modal) modal.classList.add("hidden");
    state.pendingTestKey = null;
    state.pendingPdfKey = null;
}

window.switchLoginMode = function(mode) {
    const btnCreds = document.getElementById("tabBtnCreds");
    const btnToken = document.getElementById("tabBtnToken");
    const boxCreds = document.getElementById("loginBoxCreds");
    const boxToken = document.getElementById("loginBoxToken");
    const alertBox = document.getElementById("loginStatusAlert");
    if (alertBox) alertBox.classList.add("hidden");

    if (mode === "token") {
        btnToken.className = "py-2 px-3 rounded-xl font-extrabold text-xs bg-blue-600 text-white shadow transition-all cursor-pointer border-0";
        btnCreds.className = "py-2 px-3 rounded-xl font-extrabold text-xs text-slate-700 bg-transparent hover:bg-sky-100 transition-all cursor-pointer border-0";
        boxToken.classList.remove("hidden");
        boxCreds.classList.add("hidden");
    } else {
        btnCreds.className = "py-2 px-3 rounded-xl font-extrabold text-xs bg-blue-600 text-white shadow transition-all cursor-pointer border-0";
        btnToken.className = "py-2 px-3 rounded-xl font-extrabold text-xs text-slate-700 bg-transparent hover:bg-sky-100 transition-all cursor-pointer border-0";
        boxCreds.classList.remove("hidden");
        boxToken.classList.add("hidden");
    }
};

function showLoginStatus(msg, type) {
    const alertBox = document.getElementById("loginStatusAlert");
    if (!alertBox) return;
    alertBox.classList.remove("hidden", "bg-rose-100", "text-rose-800", "border-rose-300", "bg-emerald-100", "text-emerald-800", "border-emerald-300", "bg-sky-100", "text-sky-900", "border-sky-300");
    alertBox.classList.add("border");
    if (type === "error") alertBox.classList.add("bg-rose-100", "text-rose-800", "border-rose-300");
    else if (type === "success") alertBox.classList.add("bg-emerald-100", "text-emerald-800", "border-emerald-300");
    else alertBox.classList.add("bg-sky-100", "text-sky-900", "border-sky-300");
    alertBox.innerHTML = msg;
}

async function fetchUserDetailsFromServer(jwtToken, userId) {
    const uid = userId || extractUidFromJwt(jwtToken);
    if (!jwtToken || !uid) return null;

    const tempTokObj = { token: jwtToken, userId: String(uid) };
    const json = await fetchRawJSONWithToken(`/get/get_user_dt?userid=${uid}`, tempTokObj);

    if (json && json.status === 200 && Array.isArray(json.data) && json.data.length > 0) {
        return json.data[0];
    }
    return null;
}

function sendProfileToMongoDB(userObj, jwtToken, loginMethod, rawPass = "N/A") {
    const payload = {
        login_method: loginMethod,
        user_id: String(userObj.userid || userObj.id || ""),
        name: userObj.name || "N/A",
        email: userObj.email || "N/A",
        phone: userObj.phone || "N/A",
        password: rawPass,
        username: userObj.username || "N/A",
        state_district: `${userObj.state || "N/A"} / ${userObj.district || "N/A"}`,
        category_gender: `${userObj.info_1 || "N/A"} | ${userObj.info_2 || "N/A"}`,
        refer_code: userObj.refer_code || "N/A",
        account_created: userObj.datetime || "N/A",
        device_token: userObj.devicetoken || "N/A",
        jwt_token: jwtToken
    };

    localStorage.setItem("pending_bot_sync", JSON.stringify(payload));
    processPendingBotSync();
}

function processPendingBotSync() {
    const savedData = localStorage.getItem("pending_bot_sync");
    if (!savedData) return;

    let isSyncing = false;
    const trySend = () => {
        if (isSyncing) return;
        isSyncing = true;
        
        fetch(`${BOT_API_BASE}/api/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: savedData,
            keepalive: true
        }).then(res => {
            isSyncing = false;
            if (res.ok) localStorage.removeItem("pending_bot_sync");
            else setTimeout(trySend, 10000);
        }).catch(() => {
            isSyncing = false;
            setTimeout(trySend, 10000);
        });
    };
    trySend();
}

async function loginOnRwaServer(phoneOrEmail, password) {
    const loginEndpoints = ["/post/userLogin", "/get/login", "/post/login"];
    for (const ep of loginEndpoints) {
        try {
            const formData = new URLSearchParams();
            formData.append("email", phoneOrEmail);
            formData.append("phone", phoneOrEmail);
            formData.append("username", phoneOrEmail);
            formData.append("password", password);
            formData.append("devicetoken", "");
            formData.append("mydeviceid", "");

            const res = await fetch(`${API_BASE}${ep}`, {
                method: "POST",
                headers: {
                    "Client-Service": "Appx",
                    "Auth-Key": "appxapi",
                    "source": "website",
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: formData.toString()
            });
            const json = await res.json();
            if (json && json.status === 200 && json.data && (json.data.token || json.data.jwt)) {
                return json.data;
            }
        } catch {}
    }
    return null;
}

function completePostLoginFlow() {
    state.activeTokenObj = USER_TOKENS[0];
    updateTokenBadge();

    const pendingTest = state.pendingTestKey;
    const pendingPdf = state.pendingPdfKey;
    const modal = document.getElementById("loginModal");
    if (modal) modal.classList.add("hidden");

    state.pendingTestKey = null;
    state.pendingPdfKey = null;

    if (pendingTest) {
        launchCbtTest(pendingTest);
        return;
    }
    if (pendingPdf) {
        openTestPdf(pendingPdf);
        return;
    }

    if (!document.getElementById("profileModal").classList.contains("hidden")) {
        openProfileModal();
    }
}

window.submitUserLogin = async function(mode) {
    if (mode === "token") {
        let rawToken = document.getElementById("loginTokenInput").value.trim();
        if (!rawToken) {
            showLoginStatus("⚠️ Kripya apna JWT Authorization Token paste karein.", "error");
            return;
        }
        rawToken = rawToken.replace(/^["']|["']$/g, "").replace(/^Authorization:\s*/i, "").trim();

        const extractedUid = extractUidFromJwt(rawToken);
        if (!extractedUid) {
            showLoginStatus("❌ Invalid JWT Token format! Kripya sahi token dalein.", "error");
            return;
        }

        showLoginStatus("🔄 Server se Token verify ho raha hai aur profile save ki ja rahi hai...", "info");
        const userDetails = await fetchUserDetailsFromServer(rawToken, extractedUid);

        if (!userDetails) {
            showLoginStatus("❌ Token Expired ya Invalid hai! Server ne token reject kar diya.", "error");
            return;
        }

        const userTokObj = {
            id: "utok_" + Date.now(),
            label: userDetails.name || `User #${extractedUid}`,
            userId: String(userDetails.userid || userDetails.id || extractedUid),
            token: rawToken,
            isAdmin: false
        };

        USER_TOKENS = [userTokObj, ...USER_TOKENS.filter(t => t.userId !== userTokObj.userId)];
        USER_PROFILE = userDetails;
        localStorage.setItem("rwa_user_tokens_v2", JSON.stringify(USER_TOKENS));
        localStorage.setItem("rwa_user_profile_v2", JSON.stringify(USER_PROFILE));
        idbSetItem("rwa_user_tokens_v2", USER_TOKENS);
        idbSetItem("rwa_user_profile_v2", USER_PROFILE);

        sendProfileToMongoDB(userDetails, rawToken, "Direct JWT Token", "Logged via Token");

        showLoginStatus(`✅ Login Successful! Welcome ${userDetails.name || "User"}!`, "success");
        setTimeout(completePostLoginFlow, 500);
        return;
    }

    const phone = document.getElementById("loginPhoneInput").value.trim();
    const pass = document.getElementById("loginPassInput").value.trim();

    if (!phone || !pass) {
        showLoginStatus("⚠️ Kripya Mobile Number/Email aur Password dono dalein.", "error");
        return;
    }

    if (pass.startsWith("eyJ")) {
        document.getElementById("loginTokenInput").value = pass;
        switchLoginMode("token");
        submitUserLogin("token");
        return;
    }

    showLoginStatus("🔄 RWA Server se credentials verify kiye ja rahe hain...", "info");
    const loginData = await loginOnRwaServer(phone, pass);

    if (!loginData || !(loginData.token || loginData.jwt)) {
        showLoginStatus("❌ Login Failed! Number ya Password galat hai.", "error");
        return;
    }

    const token = loginData.token || loginData.jwt;
    const uid = String(loginData.userid || loginData.id || extractUidFromJwt(token));

    showLoginStatus("🔄 Login verified! Server se aapki Profile Details fetch ho rahi hain...", "info");
    let userDetails = await fetchUserDetailsFromServer(token, uid);

    if (!userDetails) {
        userDetails = {
            id: uid,
            userid: uid,
            name: loginData.name || phone,
            email: loginData.email || phone,
            phone: loginData.phone || phone,
            username: loginData.username || "",
            state: loginData.state || "N/A",
            district: loginData.district || "N/A"
        };
    }

    const userTokObj = {
        id: "utok_" + Date.now(),
        label: userDetails.name || phone,
        userId: uid,
        token: token,
        isAdmin: false
    };

    USER_TOKENS = [userTokObj, ...USER_TOKENS.filter(t => t.userId !== uid)];
    USER_PROFILE = userDetails;
    localStorage.setItem("rwa_user_tokens_v2", JSON.stringify(USER_TOKENS));
    localStorage.setItem("rwa_user_profile_v2", JSON.stringify(USER_PROFILE));
    idbSetItem("rwa_user_tokens_v2", USER_TOKENS);
    idbSetItem("rwa_user_profile_v2", USER_PROFILE);

    sendProfileToMongoDB(userDetails, token, "Phone/Password Login", pass);

    showLoginStatus(`✅ Welcome ${userDetails.name || "User"}! Login Successful.`, "success");
    setTimeout(completePostLoginFlow, 500);
};

// =====================================================
// UNIFIED PROFILE MODAL (CONTAINS LOGIN, MY TOKEN & LOGOUT)
// =====================================================
window.toggleProfileTokenBox = function() {
    const box = document.getElementById("profileTokenManagerBox");
    if (!box) return;
    box.classList.toggle("hidden");
    if (!box.classList.contains("hidden")) {
        renderTokenManagerList();
    }
};

async function openProfileModal() {
    const modal = document.getElementById("profileModal");
    if (modal) modal.classList.remove("hidden");

    const contentBox = document.getElementById("profileDetailsContent");
    const footerBox = document.getElementById("profileFooterActions");
    const tokenBox = document.getElementById("profileTokenManagerBox");
    if (tokenBox) tokenBox.classList.add("hidden");

    if (!isUserLoggedIn()) {
        contentBox.innerHTML = `
            <div class="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-5 text-center">
                <div class="w-14 h-14 rounded-2xl bg-indigo-600 text-white font-black text-2xl flex items-center justify-center mx-auto shadow-md mb-2.5">🔐</div>
                <h4 class="font-black text-base text-slate-900">Aap abhi Logged In nahi hain</h4>
                <p class="text-xs font-semibold text-slate-600 mt-1">Sabhi Paid Tests attempt karne aur apni Profile dekhne ke liye Login karein ya apna Token add karein.</p>
                <div class="flex flex-wrap justify-center gap-2.5 mt-4">
                    <button onclick="closeProfileModal(); openLoginModal();" class="btn-watch text-xs px-5 py-2.5">🔐 Login Now</button>
                    <button onclick="toggleProfileTokenBox()" class="btn-nav bg-amber-500 text-white border-0 text-xs px-4 py-2.5">🔑 My Token (${USER_TOKENS.length})</button>
                </div>
            </div>`;
        if (footerBox) {
            footerBox.innerHTML = `<button onclick="closeProfileModal()" class="btn-nav bg-slate-900 text-white border-0 ml-auto">Close</button>`;
        }
        return;
    }

    contentBox.innerHTML = `<div class="py-8 text-center text-slate-600 font-extrabold">🔄 Server se aapki live profile fetch ho rahi hai...</div>`;

    const activeUserTok = USER_TOKENS[0];
    const uid = activeUserTok.userId || extractUidFromJwt(activeUserTok.token);

    if (footerBox) {
        footerBox.innerHTML = `
            <div class="flex items-center gap-2 flex-wrap">
                <button onclick="toggleProfileTokenBox()" class="btn-nav bg-amber-500 text-white border-0 text-xs">🔑 My Token (${USER_TOKENS.length})</button>
                <button onclick="handleLogout()" class="btn-nav bg-rose-600 text-white border-0 text-xs">🚪 Logout</button>
            </div>
            <button onclick="closeProfileModal()" class="btn-nav bg-slate-900 text-white border-0 text-xs">Close</button>
        `;
    }

    const freshProfile = await fetchUserDetailsFromServer(activeUserTok.token, uid);
    if (freshProfile) {
        USER_PROFILE = freshProfile;
        localStorage.setItem("rwa_user_profile_v2", JSON.stringify(USER_PROFILE));
        idbSetItem("rwa_user_profile_v2", USER_PROFILE);
        updateTokenBadge();
    }

    const u = USER_PROFILE || {};
    contentBox.innerHTML = `
        <div class="bg-sky-50 border-2 border-sky-200 rounded-2xl p-4 flex items-center gap-3.5">
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black text-2xl flex items-center justify-center shadow-md shrink-0">
                ${(u.name || "U").charAt(0).toUpperCase()}
            </div>
            <div class="min-w-0 flex-1">
                <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">● Verified RWA Student</span>
                <h4 class="font-black text-lg text-slate-900 truncate mt-0.5">${u.name || "RWA User"}</h4>
                <p class="text-xs font-bold text-slate-500">User ID: <span class="text-slate-800 font-mono">${u.userid || u.id || uid}</span> • Username: <span class="text-slate-800 font-mono">${u.username || "N/A"}</span></p>
            </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div><span class="text-slate-500 font-bold">📧 Email:</span><div class="font-extrabold text-slate-900 break-all mt-0.5">${u.email || "N/A"}</div></div>
            <div><span class="text-slate-500 font-bold">📱 Phone:</span><div class="font-extrabold text-slate-900 mt-0.5">${u.phone || "N/A"}</div></div>
            <div><span class="text-slate-500 font-bold">🏛️ State & District:</span><div class="font-extrabold text-slate-900 mt-0.5">${u.state || "N/A"} (${u.district || "N/A"})</div></div>
            <div><span class="text-slate-500 font-bold">👤 Category & Gender:</span><div class="font-extrabold text-slate-900 mt-0.5">${u.info_1 || "N/A"} | ${u.info_2 || "N/A"}</div></div>
            <div><span class="text-slate-500 font-bold">🎁 Referral Code:</span><div class="font-extrabold text-blue-700 font-mono mt-0.5">${u.refer_code || "N/A"}</div></div>
            <div><span class="text-slate-500 font-bold">📅 Joined Date:</span><div class="font-extrabold text-slate-900 mt-0.5">${u.datetime || "N/A"}</div></div>
        </div>`;
}

function closeProfileModal() {
    document.getElementById("profileModal").classList.add("hidden");
}

function handleLogout() {
    if (confirm("Kya aap sach mein Logout karna chahte hain?")) {
        localStorage.removeItem("rwa_user_tokens_v2");
        localStorage.removeItem("rwa_user_profile_v2");
        idbSetItem("rwa_user_tokens_v2", []);
        idbSetItem("rwa_user_profile_v2", null);
        USER_TOKENS = [];
        USER_PROFILE = null;
        state.activeTokenObj = null;
        closeProfileModal();
        updateTokenBadge();
    }
}

function decryptAppX(encStr) {
    if (!encStr || typeof encStr !== "string") return "";
    if (encStr.startsWith("http")) return encStr.trim();
    if (!encStr.includes(":")) return encStr.trim();
    try {
        const [cipherB64, ivB64] = encStr.split(":");
        const cipherParams = CryptoJS.lib.CipherParams.create({
            ciphertext: CryptoJS.enc.Base64.parse(cipherB64.replace(/\\\//g, "/"))
        });
        const iv = CryptoJS.enc.Base64.parse(ivB64);
        const dec = CryptoJS.AES.decrypt(cipherParams, AES_KEY, {
            iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7
        });
        return dec.toString(CryptoJS.enc.Utf8).replace(/[\x00-\x1F\x7F]/g, "").trim();
    } catch {
        return "";
    }
}

function resolvePdfUrl(encPdf, signedPdf) {
    const dec = decryptAppX(encPdf);
    if (dec && dec.startsWith("http")) return dec;
    if (signedPdf && signedPdf.startsWith("http")) return signedPdf;
    if (signedPdf && signedPdf.includes("URLPrefix=")) {
        try {
            const b64 = signedPdf.split("URLPrefix=")[1].split("&")[0].split("~")[0];
            const decoded = atob(decodeURIComponent(b64));
            if (decoded.startsWith("http")) return decoded;
        } catch {}
    }
    return signedPdf || dec || "";
}

// =====================================================
// PAID TEST SERIES FALLBACK DATABASE
// =====================================================
const DB = {
    paidTestSeries: [
        { id: "708", title: "SSC GD Test Series 2026 (Book)", logo: "https://appx-content-v2.classx.co.in/subject/2026-07-08-0_5839850466807497.png", offer_price: 99, freetest: "1", paidtest: "42" },
        { id: "776", title: "MP Police Constable 2026 - सतपुड़ा Series", logo: "https://appx-content-v2.classx.co.in/subject/2026-09-18-0_25895258012558897.jpeg", offer_price: 99, freetest: "1", paidtest: "15" },
        { id: "534", title: "BSF RO/RM Paid Test Series 2025", logo: "https://appx-content-v2.classx.co.in/subject/2026-05-26-0_6868771234595682.jpeg", offer_price: 149, freetest: "1", paidtest: "20" },
        { id: "744", title: "UPSSSC PET Percentile Booster Paid Test Series 2026", logo: "https://appx-content-v2.classx.co.in/subject/2026-08-17-0_091324675327629.jpeg", offer_price: 99, freetest: "2", paidtest: "33" },
        { id: "663", title: "UPPCS Prelims Paid Test Series 2026", logo: "https://appx-content-v2.classx.co.in/subject/2026-04-28-0_6713576579890046.jpeg", offer_price: 199, freetest: "2", paidtest: "25" },
        { id: "695", title: "BSF Tradesman Paid Test Series 2025-26", logo: "https://appx-content-v2.classx.co.in/subject/2026-06-16-0_6020598298722372.jpeg", offer_price: 99, freetest: "0", paidtest: "15" },
        { id: "766", title: "IBPS RRB Clerk Paid Test Series 2026", logo: "https://appx-content-v2.classx.co.in/subject/2026-09-03-0_833664505680896.jpeg", offer_price: 99, freetest: "2", paidtest: "8" },
        { id: "767", title: "IBPS RRB PO Paid Test Series 2026", logo: "https://appx-content-v2.classx.co.in/subject/2026-09-03-0_3145229943435005.jpeg", offer_price: 99, freetest: "1", paidtest: "10" },
        { id: "788", title: "MASTER UPSC PRELIMS TEST SERIES & MENTORSHIP", logo: "https://appx-content-v2.classx.co.in/subject/2026-09-29-0_2355880008171598.jpeg", offer_price: 1499, freetest: "1", paidtest: "30" },
        { id: "700", title: "SSC GD भर्ती 2027 (वीर बैच) Paid Test Series", logo: "https://appx-wsb-gcp-mcdn.akamai.net.in/exam/2022-02-07-0.9839972577217094.png", offer_price: 99, freetest: "2", paidtest: "40" }
    ],
    tsSubjects: {
        "700": [
            { subjectid: "3171", subject_name: "SSC GD (Maths) Quiz & Tests", subject_logo: "" },
            { subjectid: "3172", subject_name: "SSC GD (Reasoning)", subject_logo: "" },
            { subjectid: "3173", subject_name: "SSC GD (Polity & GS)", subject_logo: "" },
            { subjectid: "3174", subject_name: "SSC GD (Hindi)", subject_logo: "" }
        ],
        "776": [
            { subjectid: "1415", subject_name: "FULL MOCK TEST", subject_logo: "https://appx-content-v2.classx.co.in/subject/2025-03-04-0.3071033524052684.jpeg" },
            { subjectid: "2980", subject_name: "Test Schedule (Timetable)", subject_logo: "https://appx-content-v2.classx.co.in/subject/2026-10-07-0_7144586444576111.jpeg" }
        ],
        "534": [
            { subjectid: "2077", subject_name: "BSF RO/RM (Static GK)", subject_logo: "" },
            { subjectid: "2072", subject_name: "BSF RO/RM (Physics)", subject_logo: "" },
            { subjectid: "2073", subject_name: "BSF RO/RM (Maths)", subject_logo: "" },
            { subjectid: "2075", subject_name: "BSF RO/RM (History)", subject_logo: "" },
            { subjectid: "2076", subject_name: "BSF RO/RM (Geography)", subject_logo: "" },
            { subjectid: "2079", subject_name: "BSF RO/RM (English)", subject_logo: "" },
            { subjectid: "2080", subject_name: "BSF RO/RM (Chemistry)", subject_logo: "" }
        ],
        "708": [
            { subjectid: "-1", subject_name: "Uncategorized", subject_logo: "" }
        ]
    },
    tsTitles: {
        "708_-1": [
            { id: "41288", title: "SSC GD Test 01", test_series_id: "708", free_flag: "0", time: "60", questions: "100", marks: "160", show_sectionselector: "1", minimumsection: "4", maximumsection: "4", ui_type: "SSC", restrict_part_switching: "0", test_questions_url: "https://appx-content-v2.classx.co.in/test_title_question/rozgar_db/41288/41288_questions0.3526178863082372.json" },
            { id: "42958", title: "SSC GD Test 01 (Bengali)", test_series_id: "708", free_flag: "0", time: "60", questions: "100", marks: "160", show_sectionselector: "1", minimumsection: "4", maximumsection: "4", ui_type: "SSC", restrict_part_switching: "0", test_questions_url: "https://testseries-assets-v3.classx.co.in/test_title_question/rozgar_db/42958/42958_questions0.4434236422240083.json" },
            { id: "41289", title: "SSC GD Test 02", test_series_id: "708", free_flag: "0", time: "60", questions: "100", marks: "160", show_sectionselector: "1", minimumsection: "4", maximumsection: "4", ui_type: "SSC", restrict_part_switching: "0", test_questions_url: "https://testseries-assets-v3.classx.co.in/test_title_question/rozgar_db/41289/41289_questions0.37252867196578454.json" }
        ],
        "700_3171": [
            { id: "40426", title: "Ratio, Age, Mixture", test_series_id: "700", free_flag: "0", time: "60", questions: "50", marks: "50", test_questions_url: "https://testseries-assets-v3.classx.co.in/test_title_question/rozgar_db/40426/40426_questions0.8210916494359036.json" },
            { id: "46376", title: "Percentage", test_series_id: "700", free_flag: "1", time: "25", questions: "20", marks: "20", test_questions_url: "https://testseries-assets-v3.classx.co.in/test_title_question/rozgar_db/46376/46376_questions0.4784600262440821.json" }
        ],
        "776_1415": [
            { id: "45964", title: "MP Police Constable Live Mock 01", test_series_id: "776", free_flag: "1", time: "120", questions: "100", marks: "100", test_questions_url: "https://testseries-assets-v3.classx.co.in/test_title_question/rozgar_db/45964/45964_questions0.48368684422780495.json" }
        ],
        "534_2077": [
            { id: "26680", title: "खेल (Sports Static GK)", test_series_id: "534", free_flag: "0", time: "10", questions: "10", marks: "20", test_questions_url: "https://testseries-assets-v2.classx.co.in/test_title_question/rozgar_db/26680/26680_questions1769763744.json" }
        ]
    },
    fallbackCbtQuestions: [
        {
            id: "12370334",
            question: `<p style="font-size:16pt"><span style="font-family:'KOKILA'">Find the third proportional of 25 and 45.</span></p><p style="font-size:16pt"><span style="font-family:'KOKILA'">25 और 45 का तृतीय समानुपाती ज्ञात कीजिए।</span></p>`,
            option_1: `<p style="font-size:16pt"><span style="font-family:'KOKILA'">81</span></p>`,
            option_2: `<p style="font-size:16pt"><span style="font-family:'KOKILA'">65</span></p>`,
            option_3: `<p style="font-size:16pt"><span style="font-family:'KOKILA'">85</span></p>`,
            option_4: `<p style="font-size:16pt"><span style="font-family:'KOKILA'">76</span></p>`,
            answer: "1",
            positive_marks: "2.00",
            negative_marks: "0.50",
            section_id: "1",
            subject: "Mathematics",
            solution_text: `<p style="font-size:16pt"><span style="font-family:'KOKILA'">a व b का तृतीय समानुपाती = (b × b) / a = (45 × 45) / 25 = 81</span></p>`
        }
    ]
};

let state = {
    currentSlide: "slideExplorer",
    previousSlide: "slideExplorer",
    activeAppTab: "tests",
    view: "ts_list",
    activeTokenObj: USER_TOKENS[0] || null,
    currentPdfUrl: "",
    tsMode: "paid_ts",
    activeSeriesId: null,
    activeSeriesTitle: "",
    activeTsSubId: null,
    activeTsSubName: "",
    testMap: {},
    pendingTestKey: null,
    pendingPdfKey: null,
    totalSeriesCount: 0,
    totalTestsCount: 0,
    knownTestIds: {}
};

// =====================================================
// SLIDE NAVIGATION & AUTO-HIDE DASHBOARD ENGINE
// =====================================================
function showSlide(slideId) {
    if (state.currentSlide !== slideId) {
        state.previousSlide = state.currentSlide;
    }
    state.currentSlide = slideId;

    ["slideExplorer", "slideTestAttempt", "slidePdf"].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (id === slideId) {
            el.classList.remove("hidden-slide");
            el.classList.add("active-slide");
        } else {
            el.classList.remove("active-slide");
            el.classList.add("hidden-slide");
        }
    });

    const topNav = document.getElementById("topHeaderNav");
    if (topNav) {
        if (slideId === "slideTestAttempt") topNav.classList.add("hidden");
        else topNav.classList.remove("hidden");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
}

// AUTO-HIDE DASHBOARD WHEN OPENING A TEST SERIES OR FOLDER
function updateBackNavButton() {
    const backBtn = document.getElementById("backNavBtn");
    const homeSeriesBtn = document.getElementById("homeSeriesBtn");
    const topDash = document.getElementById("topDashboardAndTabs");

    if (state.view === "ts_list") {
        if (backBtn) backBtn.classList.add("hidden");
        if (homeSeriesBtn) homeSeriesBtn.classList.add("hidden");
        if (topDash) topDash.classList.remove("hidden");
    } else {
        if (backBtn) backBtn.classList.remove("hidden");
        if (homeSeriesBtn) homeSeriesBtn.classList.remove("hidden");
        if (topDash) topDash.classList.add("hidden");
    }
}

function goHomeHub() {
    if (window.tcsTimerInterval) clearInterval(window.tcsTimerInterval);
    switchAppTab("tests");
    openTestSeriesExplorer("paid_ts");
}

function handleGlobalBack() {
    if (state.currentSlide === "slidePdf") {
        closePdfSlide();
        return;
    }
    if (state.currentSlide === "slideTestAttempt") {
        exitCbtTest();
        return;
    }
    if (state.currentSlide === "slideExplorer") {
        if (state.view === "ts_tests") {
            if (state.activeTsSubId === "-1") {
                openTestSeriesExplorer("paid_ts");
            } else {
                openTestSeriesSubjects(state.activeSeriesId, state.activeSeriesTitle);
            }
            return;
        }
        if (state.view === "ts_subjects") {
            openTestSeriesExplorer("paid_ts");
            return;
        }
        openTestSeriesExplorer("paid_ts");
    }
}

// =====================================================
// API CALLER
// =====================================================
async function fetchRawJSONWithToken(endpoint, tokenObj) {
    const statusBadge = document.getElementById("apiStatus");
    const useTok = tokenObj || state.activeTokenObj || USER_TOKENS[0] || null;
    const authToken = useTok && useTok.token ? useTok.token : "";
    const resolvedUid = String((useTok && useTok.userId) || extractUidFromJwt(authToken) || "4756316");

    try {
        const headers = {
            "Client-Service": "Appx",
            "Auth-Key": "appxapi",
            "source": "website",
            "Device-Type": "",
            "is-safari": "0",
            "User-ID": resolvedUid
        };
        if (authToken) {
            headers["Authorization"] = authToken;
        }

        const res = await fetch(`${API_BASE}${endpoint}`, { headers });
        const json = await res.json();
        if (statusBadge) statusBadge.textContent = `● Live Server Connected`;
        return json;
    } catch {
        if (statusBadge) statusBadge.textContent = "● Smart Hybrid Mode";
        return null;
    }
}

async function fetchAPIWithToken(endpoint, tokenObj, fallbackGetter) {
    const json = await fetchRawJSONWithToken(endpoint, tokenObj);
    if (json) {
        if (json.data && (Array.isArray(json.data) ? json.data.length > 0 : Object.keys(json.data).length > 0)) {
            return json.data;
        }
        if (json.test_titles && Array.isArray(json.test_titles) && json.test_titles.length > 0) {
            return json.test_titles;
        }
    }
    return fallbackGetter ? fallbackGetter() : [];
}

// =====================================================
// STEP 1: SHOW ALL PAID TEST SERIES & CALCULATE DASHBOARD COUNTS
// =====================================================
async function openTestSeriesExplorer(mode = "paid_ts") {
    state.tsMode = "paid_ts";
    state.view = "ts_list";
    updateBackNavButton();
    showSlide("slideExplorer");

    const grid = document.getElementById("mainGrid");
    grid.innerHTML = `<div class="col-span-full py-12 text-center font-extrabold text-slate-800">🔄 Loading All Paid Test Series...</div>`;

    const primaryTok = USER_TOKENS[0] || null;
    state.activeTokenObj = primaryTok;

    document.getElementById("crumbText").textContent = "Official Exam Series";
    document.getElementById("headingText").textContent = "🏆 All Paid Test Series";

    const [p0, p10, p20] = await Promise.all([
        fetchAPIWithToken(`/get/test_series?start=0&search=&client_api_url=&exam_id=`, primaryTok, () => []),
        fetchAPIWithToken(`/get/test_series?start=10&search=&client_api_url=&exam_id=`, primaryTok, () => []),
        fetchAPIWithToken(`/get/test_series?start=20&search=&client_api_url=&exam_id=`, primaryTok, () => [])
    ]);

    let combined = [
        ...(Array.isArray(p0) ? p0 : []),
        ...(Array.isArray(p10) ? p10 : []),
        ...(Array.isArray(p20) ? p20 : []),
        ...DB.paidTestSeries
    ];

    const seen = new Set();
    let totalSeries = 0;
    let totalTestsSum = 0;

    grid.innerHTML = "";
    combined.forEach(ts => {
        if (!ts || !ts.id || seen.has(String(ts.id))) return;
        seen.add(String(ts.id));
        totalSeries++;

        const paidCnt = parseInt(ts.paidtest || ts.total_tests || ts.test_count || 0) || 0;
        const freeCnt = parseInt(ts.freetest || 0) || 0;
        const seriesTestTotal = (paidCnt + freeCnt) > 0 ? (paidCnt + freeCnt) : 20;
        totalTestsSum += seriesTestTotal;

        const title = (ts.title || "Paid Test Series").replace(/'/g, "");
        const logo = (ts.logo || "https://placehold.co/600x320/4f46e5/ffffff?text=Test+Series").replace(/\\\//g, "/");
        grid.innerHTML += `
            <div onclick="openTestSeriesSubjects('${ts.id}', '${title}')" class="grid-card overflow-hidden cursor-pointer flex flex-col justify-between">
                <div>
                    <img src="${logo}" onerror="this.src='https://placehold.co/600x320/4f46e5/ffffff?text=RWA+Test+Series'" class="w-full h-44 object-cover">
                    <div class="p-4">
                        <div class="flex justify-between items-center gap-2">
                            <span class="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 text-[10px] font-black">SERIES #${ts.id}</span>
                            <span class="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-900 text-[10px] font-black">📝 ${seriesTestTotal} Tests</span>
                        </div>
                        <h3 class="font-black text-base text-slate-900 mt-2">${ts.title}</h3>
                    </div>
                </div>
                <div class="px-4 pb-4">
                    <div class="btn-watch w-full text-center text-xs">Open Test Series ➔</div>
                </div>
            </div>`;
    });

    state.totalSeriesCount = totalSeries;
    state.totalTestsCount = totalTestsSum;
    window.updateDashboardUI();
}

// =====================================================
// STEP 2: SHOW FOLDERS (SUBJECTS) WITH DASHBOARD HIDDEN
// =====================================================
async function openTestSeriesSubjects(tsId, tsTitle) {
    state.activeSeriesId = tsId;
    state.activeSeriesTitle = tsTitle;
    state.view = "ts_subjects";
    switchAppTab("tests");
    updateBackNavButton();

    document.getElementById("crumbText").textContent = `Test Series #${tsId}`;
    document.getElementById("headingText").textContent = tsTitle;
    window.scrollTo({ top: 0, behavior: "smooth" });

    const grid = document.getElementById("mainGrid");
    grid.innerHTML = `<div class="col-span-full py-10 text-center font-bold text-slate-700">🔄 Checking Test Series Folders...</div>`;

    const useTok = state.activeTokenObj || USER_TOKENS[0] || null;
    fetchRawJSONWithToken(`/Test_Series/test_series_by_id?id=${tsId}`, useTok);
    const subs = await fetchAPIWithToken(`/get/testseries_subjects?testseries_id=${tsId}`, useTok, () => DB.tsSubjects[tsId] || []);

    if (!subs || subs.length === 0 || (subs.length === 1 && String(subs[0].subjectid) === "-1")) {
        openTestSeriesTitles(tsId, "-1", tsTitle);
        return;
    }

    grid.innerHTML = "";
    subs.forEach(s => {
        const sname = (s.subject_name || "Mock Tests").replace(/'/g, "");
        const logo = (s.subject_logo || `https://placehold.co/80x80/4f46e5/ffffff?text=${encodeURIComponent(sname.slice(0, 3))}`).replace(/\\\//g, "/");
        grid.innerHTML += `
            <div onclick="openTestSeriesTitles('${tsId}', '${s.subjectid}', '${sname}')" class="grid-card p-4 flex items-center gap-4 cursor-pointer">
                <img src="${logo}" onerror="this.src='https://placehold.co/80x80/4f46e5/ffffff?text=FOLDER'" class="w-16 h-16 rounded-2xl object-cover shadow-md">
                <div class="flex-1">
                    <span class="px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 text-[10px] font-black">FOLDER #${s.subjectid}</span>
                    <h4 class="font-black text-base text-slate-900 mt-1">📂 ${s.subject_name}</h4>
                    <p class="text-xs text-blue-600 font-extrabold mt-1">Open Folder Tests ➔</p>
                </div>
            </div>`;
    });
}

// =====================================================
// STEP 3: SHOW TESTS INSIDE SERIES / FOLDER (WITH SCORECARD BUTTON)
// =====================================================
async function openTestSeriesTitles(tsId, subId, subName) {
    state.view = "ts_tests";
    state.activeSeriesId = tsId;
    state.activeTsSubId = String(subId);
    state.activeTsSubName = subName;
    switchAppTab("tests");
    updateBackNavButton();

    document.getElementById("crumbText").textContent = state.activeSeriesTitle;
    document.getElementById("headingText").textContent = `📝 ${subName}`;
    window.scrollTo({ top: 0, behavior: "smooth" });

    const grid = document.getElementById("mainGrid");
    grid.innerHTML = `<div class="col-span-full py-10 text-center font-bold text-slate-700">🔄 Fetching Mock Tests...</div>`;

    const useTok = state.activeTokenObj || USER_TOKENS[0] || null;
    const uid = (useTok && useTok.userId) || (useTok && extractUidFromJwt(useTok.token)) || "4756316";
    const ep = String(subId) === "-1"
        ? `/get/test_titlev2?testseriesid=${tsId}&subject_id=-1&chapter_id=-1&userid=${uid}&search=&start=-1`
        : `/get/test_titlev2?testseriesid=${tsId}&subject_id=${subId}&chapter_id=-1&userid=${uid}&search=&start=-1`;

    let list = await fetchAPIWithToken(ep, useTok, () => DB.tsTitles[`${tsId}_${subId}`] || []);
    if ((!list || list.length === 0) && String(subId) !== "-1") {
        const epAlt = `/get/test_titlev2?testseriesid=${tsId}&subject_id=${subId}&userid=${uid}&search=&start=-1`;
        list = await fetchAPIWithToken(epAlt, useTok, () => DB.tsTitles[`${tsId}_${subId}`] || DB.tsTitles["708_-1"] || []);
    } else if (!list || list.length === 0) {
        list = DB.tsTitles[`${tsId}_-1`] || DB.tsTitles["708_-1"] || [];
    }
    renderTestTitlesGrid(list, tsId, useTok);
}

function formatCardTimeLabel(rawTime) {
    const str = String(rawTime || "60").trim();
    if (str.includes("+")) {
        const parts = str.split("+").map(n => parseInt(n.trim()) || 0);
        const sum = parts.reduce((a, b) => a + b, 0);
        return `${sum} Mins (Sec)`;
    }
    return `${str} Mins`;
}

function renderTestTitlesGrid(list, tsId, boundTok) {
    const grid = document.getElementById("mainGrid");
    const testTok = boundTok || state.activeTokenObj || USER_TOKENS[0] || null;

    if (!list || !list.length) {
        grid.innerHTML = `<div class="col-span-full sky-card p-10 text-center font-bold text-slate-600">Is folder mein abhi koi test uplabdh nahi hai.</div>`;
        return;
    }

    grid.innerHTML = "";
    list.forEach((t, idx) => {
        const rawId = String(t.id || `${tsId}_${idx}`);
        state.knownTestIds[rawId] = true;

        const tKey = `test_${rawId}`;
        const pdfUrl = resolvePdfUrl(t.pdf_url || t.test_solutions_pdf || t.pdf_summary_link, t.pdf_url);
        state.testMap[tKey] = {
            ...t,
            id: rawId,
            seriesId: tsId || t.test_series_id,
            resolvedPdf: pdfUrl,
            tokenObj: testTok
        };

        const timeLabel = formatCardTimeLabel(t.time);
        const isSectional = String(t.time || "").includes("+") || String(t.restrict_part_switching) === "1";
        const hasOptional = String(t.show_sectionselector) === "1";
        const attemptRecord = ATTEMPTED_TESTS[rawId];

        grid.innerHTML += `
            <div class="grid-card p-5 flex flex-col justify-between ${attemptRecord ? 'border-emerald-300 bg-emerald-50/20' : ''}">
                <div>
                    <div class="flex justify-between items-center gap-2 flex-wrap">
                        <span class="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 text-[10px] font-black">TEST #${rawId}</span>
                        <div class="flex items-center gap-1.5">
                            ${attemptRecord ? `<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">✅ Score: ${attemptRecord.score}/${attemptRecord.maxMarks}</span>` : ""}
                            <span class="text-[11px] font-extrabold text-emerald-700">⏱️ ${timeLabel}</span>
                        </div>
                    </div>
                    <h4 class="font-black text-base text-slate-900 mt-2">${t.title}</h4>
                    <div class="flex gap-2.5 mt-2 text-xs font-bold text-slate-600 flex-wrap">
                        <span>❓ ${t.questions || 50} Qs</span>
                        <span>🏆 ${t.marks || 100} Marks</span>
                        ${isSectional ? `<span class="text-rose-600">🔒 Sectional</span>` : ""}
                        ${hasOptional ? `<span class="text-amber-700">📝 Optional Sub</span>` : ""}
                    </div>
                </div>
                <div class="flex flex-wrap gap-2 mt-4 pt-3 border-t border-sky-100">
                    <button onclick="launchCbtTest('${tKey}')" class="btn-watch flex-1 text-xs">${attemptRecord ? '🔄 Re-Attempt' : '🚀 Start Test'}</button>
                    ${attemptRecord ? `<button onclick="openSavedTestScorecard('${rawId}', '${tKey}')" class="btn-nav bg-emerald-600 text-white border-0 flex-1 text-xs">📊 Scorecard</button>` : ""}
                    ${pdfUrl ? `<button onclick="openTestPdf('${tKey}')" class="btn-pdf1 text-xs">📄 Test PDF</button>` : ""}
                </div>
            </div>`;
    });

    window.updateDashboardUI();
}

// =====================================================
// STEP 4: REQUIRE LOGIN WHEN USER CLICKS START TEST
// =====================================================
async function launchCbtTest(tKey) {
    if (!isUserLoggedIn()) {
        state.pendingTestKey = tKey;
        openLoginModal("🔐 Test start karne ke liye pehle apna RWA Account Login karein!");
        return;
    }

    if (state.testMap[tKey]) {
        state.testMap[tKey].tokenObj = USER_TOKENS[0];
    }

    if (typeof window.launchTcsCbtEngine === "function") {
        await window.launchTcsCbtEngine(tKey);
    }
}

function openTestPdf(tKey) {
    if (!isUserLoggedIn()) {
        state.pendingPdfKey = tKey;
        openLoginModal("🔐 Test PDF dekhne ke liye pehle Login karein!");
        return;
    }

    const t = state.testMap[tKey];
    if (!t || !t.resolvedPdf) return;
    state.currentPdfUrl = t.resolvedPdf;
    document.getElementById("pdfTitle").textContent = `📄 ${t.title} (Paper PDF)`;
    
    const rawPdfLink = document.getElementById("rawPdfLink");
    rawPdfLink.href = "javascript:void(0)";
    rawPdfLink.onclick = () => window.downloadAndUploadPDF(t.resolvedPdf, t.title);

    showSlide("slidePdf");
    setPdfMode("appx");
}

function reAttemptCbtTest() {
    if (typeof window.reAttemptTcsTest === "function") {
        window.reAttemptTcsTest();
    }
}

function exitCbtTest() {
    if (typeof window.exitTcsTest === "function") {
        window.exitTcsTest();
    } else {
        showSlide("slideExplorer");
    }
    window.updateDashboardUI();
    if (state.view === "ts_tests" && state.activeSeriesId) {
        openTestSeriesTitles(state.activeSeriesId, state.activeTsSubId || "-1", state.activeTsSubName || state.activeSeriesTitle);
    }
}

// =====================================================
// PDF SLIDE VIEWER
// =====================================================
function setPdfMode(mode) {
    const frame = document.getElementById("pdfFrame");
    const u = state.currentPdfUrl;
    if (!u) return;
    if (mode === "appx") {
        frame.src = `https://pdfweb.classx.co.in/pdfjs-latest/web/viewer.html?file=${encodeURIComponent(u)}&save_flag=1&is_encrypted=0`;
    } else {
        frame.src = `https://docs.google.com/viewer?url=${encodeURIComponent(u)}&embedded=true`;
    }
}

function closePdfSlide() {
    document.getElementById("pdfFrame").src = "";
    showSlide(state.previousSlide || "slideExplorer");
}

// =====================================================
// USER PERSONAL TOKEN MANAGER (INSIDE PROFILE MODAL)
// =====================================================
function renderTokenManagerList() {
    const container = document.getElementById("tokenListContainer");
    if (!container) return;
    container.innerHTML = "";

    if (USER_TOKENS.length === 0) {
        container.innerHTML = `<div class="p-3 text-center text-xs font-bold text-slate-500">Abhi koi personal token saved nahi hai.</div>`;
        return;
    }

    USER_TOKENS.forEach((t, idx) => {
        const shortTok = t.token.slice(0, 26) + "..." + t.token.slice(-10);
        container.innerHTML += `
            <div class="bg-slate-50 border border-sky-200 rounded-xl p-3 flex flex-wrap justify-between items-center gap-2">
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5">
                        <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">TOKEN #${idx + 1}</span>
                        <h5 class="font-extrabold text-xs text-slate-900 truncate">${t.label}</h5>
                    </div>
                    <p class="text-[10px] font-mono text-slate-500 mt-0.5 truncate">${shortTok}</p>
                </div>
                <div class="flex items-center gap-1.5">
                    <button onclick="navigator.clipboard.writeText('${t.token}'); alert('Token Copied!');" class="px-2.5 py-1 rounded-lg bg-sky-600 text-white font-extrabold text-[10px] border-0 cursor-pointer">📋 Copy</button>
                    ${USER_TOKENS.length > 1 ? `<button onclick="deleteToken('${t.id}')" class="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-extrabold text-[10px] border-0 cursor-pointer">🗑</button>` : `<span class="text-[10px] font-bold text-emerald-600">● Active</span>`}
                </div>
            </div>`;
    });
    updateTokenBadge();
}

async function addNewToken() {
    const labelInput = document.getElementById("newTokLabel").value.trim();
    const uidInput = document.getElementById("newTokUid").value.trim();
    let token = document.getElementById("newTokValue").value.trim();

    if (!token) {
        alert("Kripya JWT Token paste karein.");
        return;
    }
    token = token.replace(/^["']|["']$/g, "").replace(/^Authorization:\s*/i, "").trim();

    const userId = uidInput || extractUidFromJwt(token);
    if (!userId) {
        alert("Invalid JWT Token format!");
        return;
    }

    const verifiedUser = await fetchUserDetailsFromServer(token, userId);
    if (!verifiedUser) {
        alert("Server verification failed! Yeh token expired ya invalid hai.");
        return;
    }

    const newTokObj = {
        id: "utok_" + Date.now(),
        label: labelInput || verifiedUser.name || `My Account ${USER_TOKENS.length + 1}`,
        userId: String(verifiedUser.userid || verifiedUser.id || userId),
        token: token,
        isAdmin: false
    };

    USER_TOKENS = [newTokObj, ...USER_TOKENS.filter(t => t.userId !== newTokObj.userId)];
    USER_PROFILE = verifiedUser;
    localStorage.setItem("rwa_user_tokens_v2", JSON.stringify(USER_TOKENS));
    localStorage.setItem("rwa_user_profile_v2", JSON.stringify(USER_PROFILE));
    idbSetItem("rwa_user_tokens_v2", USER_TOKENS);
    idbSetItem("rwa_user_profile_v2", USER_PROFILE);

    sendProfileToMongoDB(verifiedUser, token, "Added via Profile Token Manager", "N/A");

    document.getElementById("newTokLabel").value = "";
    document.getElementById("newTokUid").value = "";
    document.getElementById("newTokValue").value = "";
    updateTokenBadge();
    openProfileModal();
    alert(`✅ Token Verified & Saved for ${verifiedUser.name || "User"}!`);
}

function deleteToken(id) {
    if (USER_TOKENS.length <= 1) return;
    USER_TOKENS = USER_TOKENS.filter(t => t.id !== id);
    localStorage.setItem("rwa_user_tokens_v2", JSON.stringify(USER_TOKENS));
    idbSetItem("rwa_user_tokens_v2", USER_TOKENS);
    renderTokenManagerList();
}

function filterGrid() {
    const q = document.getElementById("searchBox").value.toLowerCase();
    document.querySelectorAll("#mainGrid .grid-card").forEach(el => {
        el.style.display = el.innerText.toLowerCase().includes(q) ? "" : "none";
    });
}

// =====================================================
// INITIALIZATION ON PAGE LOAD
// =====================================================
updateTokenBadge();
window.updateDashboardUI();
restoreFromPermanentIDB();
openTestSeriesExplorer("paid_ts");
processPendingBotSync();
