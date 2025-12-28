// ==========================================
// 1. CONFIGURACIÓN (Pon tus llaves reales)
// ==========================================
const firebaseConfig = {
    apiKey: "TU_API_KEY", 
    authDomain: "abrahamhorus1996.firebaseapp.com",
    databaseURL: "https://abrahamhorus1996-default-rtdb.firebaseio.com",
    projectId: "abrahamhorus1996",
    appId: "1:1002882996128:web:231c5eb841f3bec4a336c5"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// ==========================================
// 2. DATA (Descripción Épica Restaurada)
// ==========================================
const playlist = [
    { 
        id: "despierto", 
        title: "DESPIERTO (Video Oficial)", 
        desc: "DESPIERTO: el primer video oficial del artista Abraham Horus. El video trata de la superación de una crisis, llegando a la muerte y renaciendo con una fuerza de voluntad inquebrantable logrando la iluminación de cuerpo y alma. 👑",
        url: "https://res.cloudinary.com/dmwxi5gkf/video/upload/v1766804153/video_web_pro_fgjwjs.mp4",
        poster: "assets/shot 1.jpeg"
    },
    { 
        id: "v2", 
        title: "PRÓXIMAMENTE", 
        desc: "Cargando assets del sistema...", 
        url: "", 
        poster: "assets/shot 2.jpeg" 
    }
];

let currentUser = null;
let currentIdx = 0;

// --- AUTH ---
auth.onAuthStateChanged(user => {
    currentUser = user;
    document.body.classList.toggle('is-vip', !!user);
    if(document.getElementById('display-name')) document.getElementById('display-name').innerText = user ? user.displayName : "Invitado";
    if(document.getElementById('profile-preview') && user) document.getElementById('profile-preview').src = user.photoURL;
});

window.loginGoogle = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
window.cerrarSesion = () => auth.signOut().then(() => location.reload());

// --- NAVEGACIÓN ---
window.showPage = (id, el) => {
    document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.v-item').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if(el) el.classList.add('active');
};

// --- VIDEO PLAYER ---
window.loadVideo = (index) => {
    currentIdx = index;
    const v = playlist[index];
    if(!v.url) return alert("Pronto disponible");
    
    // 1. Cargar Video
    const vid = document.getElementById('main-video');
    document.getElementById('video-source').src = v.url;
    document.getElementById('current-title').innerText = v.title;
    document.getElementById('video-description').innerText = v.desc;
    
    // 2. Reiniciar reproductor
    vid.load();
    vid.play().catch(() => {});
    
    // 3. Ocultar comentarios (reinicio)
    document.getElementById('comments-wrapper').style.display = 'none';
    
    // 4. Firebase View
    db.ref(`stats/${v.id}/views`).transaction(c => (c || 0) + 1);
    
    // 5. Cargar datos
    vincularDatos(v.id);
};

function vincularDatos(vidId) {
    db.ref(`stats/${vidId}/likes`).on('value', s => document.getElementById('likes-count').innerText = s.val() || 0);
    db.ref(`stats/${vidId}/views`).on('value', s => document.getElementById('total-views').innerText = s.val() || 0);

    // Escuchar comentarios
    db.ref(`comments/${vidId}`).on('value', s => {
        const list = document.getElementById('comments-list');
        list.innerHTML = "";
        const data = s.val();
        
        // Actualizar contador del botón
        if(document.getElementById('comments-count-btn')) document.getElementById('comments-count-btn').innerText = s.numChildren();
        
        if(data){
            Object.entries(data).reverse().forEach(([key, val]) => {
                const div = document.createElement('div');
                div.className = 'comment-block';
                div.innerHTML = `<span class="user-tag">[${val.user}]</span>: <span style="color:#ddd">${val.text}</span>
                    <div class="comment-actions-row">
                        <button class="btn-reply" onclick="window.darLikeComentario('${key}')">❤️ ${val.likes || 0}</button>
                    </div>`;
                list.appendChild(div);
            });
        }
    });
}

// --- INTERACCIONES ---
window.toggleComments = () => {
    const box = document.getElementById('comments-wrapper');
    // Alternar visibilidad
    if (box.style.display === 'none' || box.style.display === '') {
        box.style.display = 'block';
        box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
        box.style.display = 'none';
    }
};

window.darLike = () => db.ref(`stats/${playlist[currentIdx].id}/likes`).transaction(c => (c || 0) + 1);
window.darLikeComentario = (id) => {
    if(!currentUser) return alert("Inicia sesión");
    db.ref(`comments/${playlist[currentIdx].id}/${id}/likes`).transaction(c => (c || 0) + 1);
};

window.enviarComentario = () => {
    const txt = document.getElementById('comment-text').value.trim();
    if(!currentUser || !txt) return;
    db.ref(`comments/${playlist[currentIdx].id}`).push({ text: txt, user: currentUser.displayName, likes: 0 });
    document.getElementById('comment-text').value = "";
};

// --- CHAT GLOBAL V1 ---
window.toggleLiveChat = () => {
    const w = document.getElementById('live-chat-window');
    w.style.display = (w.style.display === 'flex') ? 'none' : 'flex';
};

window.enviarMensajeChat = () => {
    const txt = document.getElementById('chat-input-msg').value.trim();
    if(!currentUser || !txt) return;
    db.ref('messages').push({ text: txt, user: currentUser.displayName, timestamp: Date.now() });
    document.getElementById('chat-input-msg').value = "";
};

db.ref('messages').limitToLast(20).on('child_added', s => {
    const m = s.val();
    const div = document.createElement('div');
    div.innerHTML = `<span style="color:var(--accent)">[${m.user}]</span>: ${m.text}`;
    div.style.marginBottom = "5px";
    const body = document.getElementById('chat-global-msgs');
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
});

// Inicio
window.onload = () => window.loadVideo(0);