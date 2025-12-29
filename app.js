// ==========================================
// 1. CONFIGURACIÓN E INICIO
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

// Inicializar solo si no existe
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

const ADMIN_EMAIL = "abrahorus@gmail.com";
const audioGlobal = new Audio(); // Un solo audio para todo el sitio
let currentSongUrl = "";
let progressInterval = null;
let currentUser = null;
let currentVideoId = null;

// Playlist "Salvavidas" (Local)
const globalPlaylist = [{ 
    id: "video_init", 
    title: "DESPIERTO (Oficial)", 
    desc: "Video Oficial - Horus OS.", 
    url: "https://res.cloudinary.com/dmwxi5gkf/video/upload/v1766804153/video_web_pro_fgjwjs.mp4", 
    poster: "assets/shot 1.jpeg" 
}];

// Esperar a que el HTML cargue
window.addEventListener('DOMContentLoaded', () => {
    // 1. Cargar video por defecto
    renderFeed(globalPlaylist);
    loadVideo(globalPlaylist[0]);

    // 2. Iniciar conexión Firebase
    initFirebase();
});

// ==========================================
// 2. CONEXIÓN FIREBASE (LISTENERS)
// ==========================================
function initFirebase() {
    // Videos
    db.ref('social/videos').on('value', snap => {
        const data = snap.val();
        if (data) {
            const fbVideos = Object.entries(data).map(([key, v]) => ({ id: key, ...v }));
            renderFeed([...fbVideos.reverse(), ...globalPlaylist]);
        }
    });

    // Música (Con barra de progreso)
    db.ref('social/musics').on('value', snap => {
        const list = document.getElementById('music-list');
        if (!list) return;
        list.innerHTML = ""; // Limpiar lista
        
        const data = snap.val();
        if (data) {
            Object.entries(data).reverse().forEach(([key, m]) => {
                const bId = `btn-m-${key}`;
                const pId = `bar-m-${key}`;
                const tId = `time-m-${key}`;
                
                const div = document.createElement('div');
                div.className = "music-item-pro";
                div.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <span style="display:block; font-weight:bold; color:#fff;">${m.title}</span>
                            <small style="color:#666;">High Quality Audio</small>
                        </div>
                        <button id="${bId}" onclick="window.controlAudio('${m.url}','${bId}','${pId}','${tId}')" class="btn-code">▶ PLAY</button>
                    </div>
                    <div class="progress-container">
                        <div id="${pId}" class="progress-bar-fill"></div>
                    </div>
                    <span id="${tId}" class="time-display">0:00 / 0:00</span>
                `;
                list.appendChild(div);
            });
        }
    });

    // Chat
    db.ref('chat_global').limitToLast(20).on('child_added', snap => {
        const m = snap.val();
        const box = document.getElementById('chat-global-msgs');
        if(box) {
            const div = document.createElement('div');
            div.className = "msg-bubble";
            div.innerHTML = `<small style="color:var(--accent); font-weight:bold;">${m.user}</small><br>${m.text}`;
            box.appendChild(div);
            box.scrollTop = box.scrollHeight;
        }
    });

    // Suscriptores
    db.ref('stats/general/subscribers').on('value', s => {
        const el = document.getElementById('global-subs-count');
        if(el) el.innerText = (s.val() || 0).toLocaleString();
    });
}

// ==========================================
// 3. REPRODUCTOR DE VIDEO (LÓGICA)
// ==========================================
window.loadVideo = (v) => {
    // 1. Limpiar listeners del video anterior
    if(currentVideoId) {
        db.ref(`stats/${currentVideoId}/likes`).off();
        db.ref(`stats/${currentVideoId}/views`).off();
        db.ref(`comments/${currentVideoId}`).off();
    }

    currentVideoId = v.id || "default_id";
    
    // 2. Cargar en el DOM
    const videoEl = document.getElementById('main-video');
    const sourceEl = document.getElementById('video-source');
    
    if(videoEl && sourceEl) {
        sourceEl.src = v.url;
        document.getElementById('current-title').innerText = v.title;
        document.getElementById('video-description').innerText = v.desc || "Sin descripción.";
        videoEl.load();
        videoEl.play().catch(() => {}); // Evitar error autoplay
    }

    // 3. Conectar Stats del Nuevo Video
    db.ref(`stats/${currentVideoId}/views`).transaction(c => (c || 0) + 1);
    
    db.ref(`stats/${currentVideoId}/likes`).on('value', s => {
        document.getElementById('likes-count').innerText = s.val() || 0;
    });
    db.ref(`stats/${currentVideoId}/views`).on('value', s => {
        document.getElementById('total-views').innerText = s.val() || 0;
    });

    loadComments(currentVideoId);
};

function renderFeed(vids) {
    const grid = document.getElementById('videos-grid');
    if (!grid) return;
    grid.innerHTML = "";
    vids.forEach(v => {
        const card = document.createElement('div');
        card.className = "code-card";
        card.onclick = () => window.loadVideo(v);
        card.innerHTML = `
            <div class="card-thumb"><img src="${v.poster}" onerror="this.src='assets/logo192.png'"></div>
            <div class="card-text">${v.title}</div>
        `;
        grid.appendChild(card);
    });
}

// ==========================================
// 4. CONTROL DE AUDIO (INTELIGENTE)
// ==========================================
window.controlAudio = (url, btnId, barId, timeId) => {
    const btn = document.getElementById(btnId);
    const bar = document.getElementById(barId);
    const txt = document.getElementById(timeId);

    // Formateador de tiempo
    const fmt = (s) => {
        const m = Math.floor(s/60);
        const sec = Math.floor(s%60);
        return `${m}:${sec<10?'0':''}${sec}`;
    };

    // Actualizador UI
    const tick = () => {
        if(audioGlobal.duration) {
            const pct = (audioGlobal.currentTime / audioGlobal.duration) * 100;
            if(bar) bar.style.width = pct + "%";
            if(txt) txt.innerText = `${fmt(audioGlobal.currentTime)} / ${fmt(audioGlobal.duration)}`;
        }
    };

    // Lógica Play/Pause
    if (currentSongUrl === url) {
        // Misma canción: Pausar/Reanudar
        if (!audioGlobal.paused) {
            audioGlobal.pause();
            btn.innerText = "▶ PLAY";
            btn.style.borderColor = "#333";
            clearInterval(progressInterval);
        } else {
            audioGlobal.play();
            btn.innerText = "⏸ PAUSA";
            btn.style.borderColor = "var(--accent)";
            progressInterval = setInterval(tick, 500);
        }
        return;
    }

    // Nueva canción: Resetear todo
    clearInterval(progressInterval);
    document.querySelectorAll('[id^="btn-m-"]').forEach(b => {
        b.innerText = "▶ PLAY";
        b.style.borderColor = "#333";
    });
    document.querySelectorAll('.progress-bar-fill').forEach(b => b.style.width = "0%");

    audioGlobal.src = url;
    audioGlobal.play();
    currentSongUrl = url;
    
    btn.innerText = "⏸ PAUSA";
    btn.style.borderColor = "var(--accent)";
    progressInterval = setInterval(tick, 500);

    // Al terminar
    audioGlobal.onended = () => {
        btn.innerText = "▶ PLAY";
        if(bar) bar.style.width = "0%";
        clearInterval(progressInterval);
    };
};

// ==========================================
// 5. AUTH Y SISTEMA
// ==========================================
auth.onAuthStateChanged(user => {
    currentUser = user;
    document.body.classList.toggle('is-vip', !!user); // CLASE MÁGICA DEL VIP
    
    const loginBtn = document.getElementById('btn-login-profile');
    const logoutBtn = document.getElementById('btn-logout-profile');

    if (user) {
        document.getElementById('display-name').innerText = user.displayName.toUpperCase();
        if(loginBtn) loginBtn.style.display = 'none';
        if(logoutBtn) logoutBtn.style.display = 'block';

        if (user.email === ADMIN_EMAIL) {
            document.getElementById('user-rank').innerText = "👑 ADMIN";
            const nav = document.getElementById('main-nav');
            if (!document.getElementById('nav-admin')) {
                const d = document.createElement('div');
                d.id = "nav-admin"; d.className = "v-item"; d.style.color = "#ff00ff";
                d.innerHTML = "<span>⚡</span> SISTEMA";
                d.onclick = () => window.showPage('p-admin', d);
                nav.appendChild(d);
            }
        } else {
            document.getElementById('user-rank').innerText = "MIEMBRO VIP";
        }
    } else {
        document.getElementById('display-name').innerText = "INVITADO";
        if(loginBtn) loginBtn.style.display = 'block';
        if(logoutBtn) logoutBtn.style.display = 'none';
    }
});

// Botones de Auth
window.loginGoogle = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
window.cerrarSesion = () => auth.signOut().then(() => location.reload());

// Admin Upload
window.adminUpload = (type) => {
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) return;
    
    const title = document.getElementById('adm-v-title').value;
    const desc = document.getElementById('adm-v-desc').value;
    const url = document.getElementById('adm-v-url').value;
    const thumb = document.getElementById('adm-v-thumb').value;

    if (!title || !url) return alert("Faltan datos");

    const path = (type === 'video') ? 'social/videos' : 'social/musics';
    
    db.ref(path).push({ 
        title, 
        desc, 
        url, 
        poster: thumb, 
        timestamp: Date.now() 
    }).then(() => {
        alert("Contenido Publicado");
        document.querySelectorAll('.admin-input').forEach(i => i.value = "");
    });
};

// ==========================================
// 6. UTILIDADES Y NAVEGACIÓN
// ==========================================
window.showPage = (id, el) => {
    document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.v-item').forEach(v => v.classList.remove('active'));
    
    document.getElementById(id).classList.add('active');
    if (el) el.classList.add('active');
    
    // Cerrar menú móvil si está abierto
    if (window.innerWidth < 768) {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('mobile-overlay').classList.remove('open');
    }
};

window.toggleMenu = () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('mobile-overlay').classList.toggle('open');
};

window.toggleComments = () => {
    const c = document.getElementById('comments-wrapper');
    c.style.display = (c.style.display === 'none') ? 'block' : 'none';
};

window.toggleLiveChat = () => {
    const w = document.getElementById('live-chat-window');
    w.style.display = (w.style.display === 'flex') ? 'none' : 'flex';
};

// Comentarios y Chat
function loadComments(vidId) {
    const list = document.getElementById('comments-list');
    db.ref(`comments/${vidId}`).on('value', s => {
        if(!list) return;
        list.innerHTML = "";
        document.getElementById('comments-count-btn').innerText = s.numChildren();
        
        if(s.val()) {
            Object.entries(s.val()).reverse().forEach(([k, v]) => {
                const d = document.createElement('div');
                d.style.marginBottom = "8px";
                d.style.borderBottom = "1px solid #222";
                d.style.paddingBottom = "5px";
                d.innerHTML = `<b style="color:var(--accent); font-size:0.8rem;">${v.user}:</b> <span style="font-size:0.9rem; color:#ccc;">${v.text}</span>`;
                list.appendChild(d);
            });
        }
    });
}

window.enviarComentario = () => {
    const input = document.getElementById('comment-text');
    if(!currentUser || !input.value.trim()) return alert("Inicia sesión.");
    db.ref(`comments/${currentVideoId}`).push({ user: currentUser.displayName, text: input.value });
    input.value = "";
};

window.enviarMensajeChat = () => {
    const input = document.getElementById('chat-input-msg');
    if(!input.value.trim()) return;
    const user = currentUser ? currentUser.displayName : "Invitado";
    db.ref('chat_global').push({ user, text: input.value });
    input.value = "";
};

window.darLike = () => {
    if(currentVideoId) db.ref(`stats/${currentVideoId}/likes`).transaction(c => (c||0)+1);
};