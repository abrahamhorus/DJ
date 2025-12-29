// ==========================================
// 1. CONFIGURACIÓN FIREBASE (DATOS DE ABRAHAM HORUS)
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyBiDImq0GMse8SOePAH-3amtmopBRO8wGA",
    authDomain: "abrahamhorus1996.firebaseapp.com",
    databaseURL: "https://abrahamhorus1996-default-rtdb.firebaseio.com",
    projectId: "abrahamhorus1996",
    storageBucket: "abrahamhorus1996.firebasestorage.app",
    messagingSenderId: "1002882996128",
    appId: "1:1002882996128:web:231c5eb841f3bec4a336c5",
    measurementId: "G-PEYW3V3GSB"
};

// Inicializar
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// ==========================================
// 2. CONFIGURACIÓN ADMIN
// ==========================================
const ADMIN_EMAIL = "abrahorus@gmail.com"; 
const soundTortuga = new Audio("assets/tortuga.mp3"); // Asegúrate de tener el archivo
let currentUser = null;
let currentVideoId = null;

// ==========================================
// 3. AUTH Y PERFIL
// ==========================================
auth.onAuthStateChanged(user => {
    currentUser = user;
    document.body.classList.toggle('is-vip', !!user);
    
    // Elementos UI
    const nameEl = document.getElementById('display-name');
    const photoEl = document.getElementById('profile-preview');
    const uidEl = document.getElementById('user-uid');
    const rankEl = document.getElementById('user-rank');
    const loginBtn = document.getElementById('btn-login-profile');
    const logoutBtn = document.getElementById('btn-logout-profile');

    if (user) {
        // --- LOGUEADO ---
        if(nameEl) nameEl.innerText = user.displayName ? user.displayName.toUpperCase() : "USUARIO";
        if(photoEl) photoEl.src = user.photoURL || "https://via.placeholder.com/100";
        if(uidEl) uidEl.innerText = user.uid.substring(0, 10) + "...";
        if(loginBtn) loginBtn.style.display = 'none';
        if(logoutBtn) logoutBtn.style.display = 'block';

        // MODO DIOS (Admin)
        if(user.email === ADMIN_EMAIL) {
            if(rankEl) {
                rankEl.innerText = "👑 MODO ARTISTA";
                rankEl.style.color = "#ff00ff";
                rankEl.style.textShadow = "0 0 5px #ff00ff";
            }
            // Crear Botón Sistema
            const nav = document.getElementById('main-nav');
            if(nav && !document.getElementById('nav-admin-btn')){
                const div = document.createElement('div');
                div.id = 'nav-admin-btn';
                div.className = "v-item";
                div.style.color = "#ff00ff";
                div.innerHTML = `<span class="v-icon">⚡</span> SISTEMA`;
                div.onclick = () => window.showPage('p-admin', div);
                nav.appendChild(div);
            }
        } else {
            if(rankEl) {
                rankEl.innerText = "VERIFIED USER";
                rankEl.style.color = "#fff";
            }
        }
        checkSubscription(user.uid);
    } else {
        // --- INVITADO ---
        if(nameEl) nameEl.innerText = "INVITADO";
        if(photoEl) photoEl.src = "https://via.placeholder.com/100";
        if(uidEl) uidEl.innerText = "NO_AUTH";
        if(rankEl) rankEl.innerText = "GUEST";
        if(loginBtn) loginBtn.style.display = 'block';
        if(logoutBtn) logoutBtn.style.display = 'none';
        
        // Quitar botón sistema
        const btnAdmin = document.getElementById('nav-admin-btn');
        if(btnAdmin) btnAdmin.remove();
        
        resetSubscriptionUI();
    }
});

window.loginGoogle = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
window.cerrarSesion = () => auth.signOut().then(() => location.reload());

// ==========================================
// 4. SUSCRIPCIONES
// ==========================================
db.ref('stats/general/subscribers').on('value', snapshot => {
    const count = snapshot.val() || 0;
    const el = document.getElementById('global-subs-count');
    if(el) el.innerText = count.toLocaleString();
});

function checkSubscription(uid) {
    db.ref(`users/${uid}/isSubscribed`).on('value', snap => {
        const btn = document.getElementById('btn-subscribe');
        if(!btn) return;
        if (snap.val() === true) {
            btn.innerText = "SUSCRITO";
            btn.classList.add('subscribed');
        } else {
            btn.innerText = "SUSCRIBIRSE";
            btn.classList.remove('subscribed');
        }
    });
}

function resetSubscriptionUI() {
    const btn = document.getElementById('btn-subscribe');
    if(btn) {
        btn.innerText = "SUSCRIBIRSE";
        btn.classList.remove('subscribed');
    }
}

window.toggleSub = () => {
    if (!currentUser) return alert("⚠️ Inicia sesión para suscribirte.");
    const userSubRef = db.ref(`users/${currentUser.uid}/isSubscribed`);
    const globalCountRef = db.ref('stats/general/subscribers');
    userSubRef.once('value', snapshot => {
        const isSubscribed = snapshot.val();
        if (isSubscribed) {
            userSubRef.set(false);
            globalCountRef.transaction(c => (c || 0) - 1);
        } else {
            userSubRef.set(true);
            globalCountRef.transaction(c => (c || 0) + 1);
        }
    });
};

// ==========================================
// 5. RED SOCIAL (CARGA DINÁMICA)
// ==========================================
function initApp() {
    // 1. VIDEOS (Carga desde social/videos)
    db.ref('social/videos').on('value', snap => {
        const grid = document.getElementById('videos-grid');
        if(!grid) return;
        grid.innerHTML = "";
        
        const data = snap.val();
        
        if(!data) {
             grid.innerHTML = "<p style='padding:20px; color:#666;'>Esperando contenido del Artista...</p>";
             return;
        }
        
        const entries = Object.entries(data).reverse(); 
        entries.forEach(([key, v], index) => {
            const card = document.createElement('div');
            card.className = "code-card";
            card.onclick = () => window.loadVideo(v, key);
            card.innerHTML = `
                <div class="card-thumb"><img src="${v.poster}" onerror="this.src='assets/logo192.png'"></div>
                <div class="card-text"><h4>${v.title}</h4></div>
            `;
            grid.appendChild(card);
            
            // Cargar primer video si no hay selección
            if(index === 0 && !currentVideoId) window.loadVideo(v, key);
        });
    });

    // 2. MÚSICA
    db.ref('social/music').on('value', snap => {
        const list = document.getElementById('music-list');
        if(!list) return;
        list.innerHTML = "";
        const data = snap.val();
        if(data) {
            Object.values(data).reverse().forEach(m => {
                const div = document.createElement('div');
                div.style = "padding:15px; background:#252526; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; border-radius:4px;";
                div.innerHTML = `<span>${m.title}</span> <button onclick="new Audio('${m.url}').play()" class="btn-subscribe" style="background:var(--accent); color:#000;">PLAY</button>`;
                list.appendChild(div);
            });
        }
    });

    // 3. EVENTOS
    db.ref('social/events').on('value', snap => {
        const list = document.getElementById('events-list');
        if(!list) return;
        list.innerHTML = "";
        const data = snap.val();
        if(data) {
            Object.values(data).forEach(e => {
                const div = document.createElement('div');
                div.className = 'event-card';
                div.innerHTML = `
                    <div class="event-date-box"><span class="event-day">${e.day}</span><span class="event-month">${e.month}</span></div>
                    <div class="event-info"><h3>${e.title}</h3><p>📍 ${e.loc}</p></div>
                    <button class="btn-ticket">TICKETS</button>
                `;
                list.appendChild(div);
            });
        }
    });
}

// ==========================================
// 6. VIDEO PLAYER
// ==========================================
window.loadVideo = (v, id) => {
    currentVideoId = id;
    const vid = document.getElementById('main-video');
    const titleEl = document.getElementById('current-title');
    const descEl = document.getElementById('video-description');
    const srcEl = document.getElementById('video-source');

    if(vid && srcEl) {
        srcEl.src = v.url;
        titleEl.innerText = v.title;
        descEl.innerText = v.desc || "";
        vid.load();
        vid.play().catch(e => console.log("Autoplay bloqueado"));
    }
    
    // Stats
    db.ref(`stats/${id}/views`).transaction(c => (c || 0) + 1);
    db.ref(`stats/${id}/likes`).on('value', s => {
        const el = document.getElementById('likes-count');
        if(el) el.innerText = s.val() || 0;
    });
    db.ref(`stats/${id}/views`).on('value', s => {
        const el = document.getElementById('total-views');
        if(el) el.innerText = s.val() || 0;
    });

    loadComments(id);
};

function loadComments(vidId) {
    db.ref(`comments/${vidId}`).on('value', s => {
        const list = document.getElementById('comments-list');
        if(!list) return;
        
        list.innerHTML = "";
        const data = s.val();
        
        if(document.getElementById('comments-count-btn')) {
            document.getElementById('comments-count-btn').innerText = s.numChildren();
        }
        
        if(data){
            Object.entries(data).reverse().forEach(([key, val]) => {
                const div = document.createElement('div');
                div.className = 'comment-block';
                const userName = val.user || 'Anónimo';
                
                let repliesHTML = "";
                if (val.replies) {
                    Object.values(val.replies).forEach(r => {
                        repliesHTML += `<div class="sub-reply"><span style="color:#00ff88">${r.user}:</span> ${r.text}</div>`;
                    });
                }
                
                div.innerHTML = `
                    <div style="margin-bottom:5px;">
                        <span class="user-tag">${userName}</span>
                        <span style="color:#ddd">${val.text}</span>
                    </div>
                    <div class="comment-actions-row">
                        <button class="btn-comment-action" onclick="window.darLikeComentario('${key}')">❤️ ${val.likes || 0}</button>
                        <button class="btn-comment-action" onclick="window.mostrarCajaRespuesta('${key}')">Responder</button>
                    </div>
                    <div class="replies-container">
                        ${repliesHTML}
                        <div id="reply-box-${key}" class="reply-input-box" style="display:none;">
                            <input type="text" id="input-${key}" placeholder="Responder...">
                            <button onclick="window.enviarRespuesta('${key}')">></button>
                        </div>
                    </div>`;
                list.appendChild(div);
            });
        }
    });
}

window.toggleComments = () => {
    const box = document.getElementById('comments-wrapper');
    if(box) box.style.display = (box.style.display === 'none') ? 'block' : 'none';
};

window.darLike = () => {
    if(!currentVideoId) return;
    db.ref(`stats/${currentVideoId}/likes`).transaction(c => (c || 0) + 1);
};

window.enviarComentario = () => {
    const txtEl = document.getElementById('comment-text');
    const txt = txtEl.value.trim();
    if(!currentUser) return alert("⚠️ Inicia sesión para comentar.");
    if(!txt) return;
    db.ref(`comments/${currentVideoId}`).push({ text: txt, user: currentUser.displayName, uid: currentUser.uid, likes: 0 });
    txtEl.value = "";
};

window.mostrarCajaRespuesta = (id) => {
    const box = document.getElementById(`reply-box-${id}`);
    if(box) box.style.display = (box.style.display === 'none') ? 'flex' : 'none';
};

window.enviarRespuesta = (commentId) => {
    const input = document.getElementById(`input-${commentId}`);
    const text = input.value.trim();
    if(!currentUser) return alert("Inicia sesión.");
    if(!text) return;
    db.ref(`comments/${currentVideoId}/${commentId}/replies`).push({ text: text, user: currentUser.displayName });
    input.value = "";
};

window.darLikeComentario = (id) => {
    if(!currentUser) return alert("Inicia sesión.");
    db.ref(`comments/${currentVideoId}/${id}/likes`).transaction(c => (c || 0) + 1);
};

// ==========================================
// 7. ADMIN DASHBOARD
// ==========================================
window.adminUpload = async (type) => {
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) return;

    let data = {};
    if (type === 'video') {
        data = {
            title: document.getElementById('adm-v-title').value,
            desc: document.getElementById('adm-v-desc').value,
            url: document.getElementById('adm-v-url').value,
            poster: document.getElementById('adm-v-thumb').value,
            timestamp: Date.now()
        };
    } else if (type === 'music') {
        data = {
            title: document.getElementById('adm-m-title').value,
            url: document.getElementById('adm-m-url').value,
            timestamp: Date.now()
        };
    } else if (type === 'event') {
        data = {
            title: document.getElementById('adm-e-title').value,
            day: document.getElementById('adm-e-day').value,
            month: document.getElementById('adm-e-month').value,
            loc: document.getElementById('adm-e-loc').value
        };
    }

    if (!data.title) return alert("⚠️ Error: Faltan datos (Título o URL).");

    try {
        await db.ref(`social/${type}s`).push(data);
        alert("✅ ¡Contenido publicado!");
        document.querySelectorAll('.admin-input').forEach(i => i.value = "");
    } catch (e) {
        alert("Error: " + e.message);
    }
};

// ==========================================
// 8. CHAT GLOBAL LIBRE
// ==========================================
window.toggleLiveChat = () => {
    const w = document.getElementById('live-chat-window');
    if(w) {
        w.style.display = (w.style.display === 'flex') ? 'none' : 'flex';
        if(w.style.display === 'flex'){
            const body = document.getElementById('chat-global-msgs');
            body.scrollTop = body.scrollHeight;
        }
    }
};

window.enviarMensajeChat = () => {
    const input = document.getElementById('chat-input-msg');
    const txt = input.value.trim();
    if(!txt) return;
    
    let userName = "Invitado";
    let userEmail = "anonimo";
    let isArtist = false;

    if (currentUser) {
        userName = currentUser.displayName;
        userEmail = currentUser.email;
        isArtist = (currentUser.email === ADMIN_EMAIL);
    }
    
    db.ref('chat_global').push({ 
        text: txt, 
        user: userName, 
        email: userEmail,
        isAdmin: isArtist,
        timestamp: Date.now() 
    });
    input.value = "";
};

db.ref('chat_global').limitToLast(50).on('child_added', snapshot => {
    const m = snapshot.val();
    const chatBody = document.getElementById('chat-global-msgs');
    if(!chatBody) return;

    const div = document.createElement('div');
    div.className = "msg-bubble";
    
    // ADMIN (Rainbow)
    if (m.isAdmin === true || m.email === ADMIN_EMAIL) {
        div.classList.add('msg-artist');
        div.innerHTML = `<span class="msg-user-name">${m.user}</span>${m.text}`;
        if (Date.now() - m.timestamp < 10000) soundTortuga.play().catch(()=>{});

    // INVITADO (Gris)
    } else if (m.email === "anonimo") {
        div.style.backgroundColor = "#2a2a2a"; 
        div.style.borderLeft = "3px solid #666";
        div.style.color = "#ccc";
        div.innerHTML = `<span class="msg-user-name" style="color:#aaa;">👻 ${m.user}</span>${m.text}`;

    // FAN (Neón)
    } else {
        const colors = ['#1a1a2e', '#16213e', '#1f4068', '#2d1b2e', '#2c003e', '#0f3057'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        div.style.backgroundColor = randomColor;
        div.style.borderLeft = "3px solid #00ff88"; 
        div.innerHTML = `<span class="msg-user-name" style="color:#00ff88;">${m.user}</span>${m.text}`;
    }
    
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
});

// NAVEGACIÓN
window.showPage = (id, el) => {
    document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.v-item').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if(el) el.classList.add('active');
    if(window.innerWidth <= 768) window.toggleMenu();
};

window.toggleMenu = () => {
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('mobile-overlay');
    if(sb) sb.classList.toggle('open');
    if(ov) ov.classList.toggle('open');
};

// INICIO
window.onload = initApp;