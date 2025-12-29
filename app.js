// ==========================================
// 1. FIREBASE CONFIG
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyBiDImq0GMse8SOePAH-3amtmopBRO8wGA",
    authDomain: "abrahamhorus1996.firebaseapp.com",
    databaseURL: "https://abrahamhorus1996-default-rtdb.firebaseio.com",
    projectId: "abrahamhorus1996",
    storageBucket: "abrahamhorus1996.firebasestorage.app",
    messagingSenderId: "1002882996128",
    appId: "1:1002882996128:web:231c5eb841f3bec4a336c5"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// ==========================================
// 2. GLOBAL STATE
// ==========================================
const ADMIN_EMAIL = "abrahorus@gmail.com";
const soundTortuga = new Audio("assets/tortuga.mp3");

let currentUser = null;
let currentVideoId = null;

// Firebase listeners activos
let statsLikesRef = null;
let statsViewsRef = null;
let commentsRef = null;

// Chat anti-spam
let lastChatTime = 0;

console.log("🔥 Horus OS v4.1 PRO iniciado");

// ==========================================
// 3. HELPERS
// ==========================================
function escapeHTML(str = "") {
    return str.replace(/[&<>"']/g, m =>
        ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])
    );
}

function safe(el, value) {
    if (el) el.innerText = value;
}

// ==========================================
// 4. AUTH
// ==========================================
auth.onAuthStateChanged(user => {
    currentUser = user;
    document.body.classList.toggle('is-vip', !!user);

    const nameEl = document.getElementById('display-name');
    const photoEl = document.getElementById('profile-preview');
    const uidEl = document.getElementById('user-uid');
    const rankEl = document.getElementById('user-rank');
    const loginBtn = document.getElementById('btn-login-profile');
    const logoutBtn = document.getElementById('btn-logout-profile');

    if (user) {
        safe(nameEl, user.displayName?.toUpperCase() || "USUARIO");
        if (photoEl) photoEl.src = user.photoURL || "https://via.placeholder.com/100";
        safe(uidEl, user.uid.slice(0, 10) + "...");
        loginBtn && (loginBtn.style.display = 'none');
        logoutBtn && (logoutBtn.style.display = 'block');

        if (user.email === ADMIN_EMAIL) {
            safe(rankEl, "👑 MODO ARTISTA");
            rankEl.style.color = "#ff00ff";
            addAdminButton();
        } else {
            safe(rankEl, "VERIFIED USER");
        }

        checkSubscription(user.uid);
    } else {
        safe(nameEl, "INVITADO");
        if (photoEl) photoEl.src = "https://via.placeholder.com/100";
        safe(uidEl, "NO_AUTH");
        safe(rankEl, "GUEST");
        loginBtn && (loginBtn.style.display = 'block');
        logoutBtn && (logoutBtn.style.display = 'none');
        document.getElementById('nav-admin-btn')?.remove();
        resetSubscriptionUI();
    }
});

window.loginGoogle = () =>
    auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());

window.cerrarSesion = () =>
    auth.signOut().then(() => location.reload());

// ==========================================
// 5. SUBSCRIPCIONES
// ==========================================
db.ref('stats/general/subscribers').on('value', s => {
    const el = document.getElementById('global-subs-count');
    el && (el.innerText = (s.val() || 0).toLocaleString());
});

function checkSubscription(uid) {
    db.ref(`users/${uid}/isSubscribed`).on('value', s => {
        const btn = document.getElementById('btn-subscribe');
        if (!btn) return;
        btn.innerText = s.val() ? "SUSCRITO" : "SUSCRIBIRSE";
        btn.classList.toggle('subscribed', !!s.val());
    });
}

function resetSubscriptionUI() {
    const btn = document.getElementById('btn-subscribe');
    btn && (btn.innerText = "SUSCRIBIRSE", btn.classList.remove('subscribed'));
}

window.toggleSub = () => {
    if (!currentUser) return alert("Inicia sesión");
    const userRef = db.ref(`users/${currentUser.uid}/isSubscribed`);
    const globalRef = db.ref('stats/general/subscribers');

    userRef.once('value', s => {
        if (s.val()) {
            userRef.set(false);
            globalRef.transaction(c => Math.max((c || 1) - 1, 0));
        } else {
            userRef.set(true);
            globalRef.transaction(c => (c || 0) + 1);
        }
    });
};

// ==========================================
// 6. VIDEOS
// ==========================================
window.loadVideo = (v, id) => {
    statsLikesRef?.off();
    statsViewsRef?.off();
    commentsRef?.off();

    currentVideoId = id;

    document.getElementById('video-source').src = v.url;
    safe(document.getElementById('current-title'), v.title);
    safe(document.getElementById('video-description'), v.desc || "");
    const vid = document.getElementById('main-video');
    vid.load();
    vid.play().catch(()=>{});

    statsLikesRef = db.ref(`stats/${id}/likes`);
    statsViewsRef = db.ref(`stats/${id}/views`);
    commentsRef = db.ref(`comments/${id}`);

    statsViewsRef.transaction(c => (c || 0) + 1);

    statsLikesRef.on('value', s =>
        safe(document.getElementById('likes-count'), s.val() || 0)
    );

    statsViewsRef.on('value', s =>
        safe(document.getElementById('total-views'), s.val() || 0)
    );

    loadComments(id);
};

window.darLike = () => {
    if (!currentUser || !currentVideoId) return alert("Inicia sesión");
    const ref = db.ref(`video_likes/${currentVideoId}/${currentUser.uid}`);

    ref.once('value', s => {
        if (s.exists()) return alert("Ya diste like");
        ref.set(true);
        db.ref(`stats/${currentVideoId}/likes`)
          .transaction(c => (c || 0) + 1);
    });
};

// ==========================================
// 7. COMENTARIOS
// ==========================================
function loadComments(id) {
    commentsRef.on('value', s => {
        const list = document.getElementById('comments-list');
        if (!list) return;
        list.innerHTML = "";

        document.getElementById('comments-count-btn').innerText = s.numChildren();

        s.forEach(c => {
            const v = c.val();
            const div = document.createElement('div');
            div.className = "comment-block";
            div.innerHTML = `
                <span class="user-tag">${escapeHTML(v.user)}</span>
                <span>${escapeHTML(v.text)}</span>
            `;
            list.prepend(div);
        });
    });
}

window.enviarComentario = () => {
    const txt = document.getElementById('comment-text').value.trim();
    if (!currentUser || !txt) return;

    db.ref(`comments/${currentVideoId}`).push({
        text: txt,
        user: currentUser.displayName,
        uid: currentUser.uid,
        timestamp: Date.now()
    });

    document.getElementById('comment-text').value = "";
};

// ==========================================
// 8. CHAT GLOBAL
// ==========================================
window.enviarMensajeChat = () => {
    const now = Date.now();
    if (now - lastChatTime < 2000) return alert("Muy rápido");
    lastChatTime = now;

    const txt = document.getElementById('chat-input-msg').value.trim();
    if (!txt) return;

    db.ref('chat_global').push({
        text: escapeHTML(txt),
        user: currentUser?.displayName || "Invitado",
        email: currentUser?.email || "anonimo",
        isAdmin: currentUser?.email === ADMIN_EMAIL,
        timestamp: now
    });

    document.getElementById('chat-input-msg').value = "";
};

// ==========================================
// 9. ADMIN
// ==========================================
function addAdminButton() {
    const nav = document.getElementById('main-nav');
    if (!nav || document.getElementById('nav-admin-btn')) return;

    const div = document.createElement('div');
    div.id = 'nav-admin-btn';
    div.className = "v-item";
    div.style.color = "#ff00ff";
    div.innerHTML = "⚡ SISTEMA";
    div.onclick = () => window.showPage('p-admin', div);
    nav.appendChild(div);
}

// ==========================================
// 10. INIT
// ==========================================
function initApp() {
    db.ref('social/videos').on('value', s => {
        const grid = document.getElementById('videos-grid');
        if (!grid) return;
        grid.innerHTML = "";

        const data = s.val();
        if (!data) return;

        Object.entries(data).reverse().forEach(([k, v], i) => {
            const card = document.createElement('div');
            card.className = "code-card";
            card.onclick = () => loadVideo(v, k);
            card.innerHTML = `
                <div class="card-thumb"><img src="${v.poster}"></div>
                <div class="card-text"><h4>${escapeHTML(v.title)}</h4></div>
            `;
            grid.appendChild(card);
            if (i === 0 && !currentVideoId) loadVideo(v, k);
        });
    });
}

window.addEventListener('load', initApp);
