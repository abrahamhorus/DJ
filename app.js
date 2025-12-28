// ==========================================
// 1. CONFIGURACIÓN FIREBASE
// ==========================================
// ¡IMPORTANTE! Reemplaza esto con TUS LLAVES REALES de Firebase Console
const firebaseConfig = {
  apiKey: "TU_API_KEY_AQUI", 
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
// 2. DATOS
// ==========================================
const playlist = [
    { 
        id: "despierto", 
        title: "DESPIERTO (Video Oficial)", 
        desc: "DESPIERTO: el primer video oficial del artista Abraham Horus. El video trata de la superación de una crisis, llegando a la muerte y renaciendo con una fuerza de voluntad inquebrantable.",
        url: "https://res.cloudinary.com/dmwxi5gkf/video/upload/v1766804153/video_web_pro_fgjwjs.mp4" 
    },
    { 
        id: "v2", 
        title: "PRÓXIMAMENTE", 
        desc: "Sistema en mantenimiento... Espéralo pronto.",
        url: "" 
    }
];

const music = [
    { title: "DESPIERTO (Mix)", url: "https://res.cloudinary.com/dmwxi5gkf/video/upload/v1734200000/tu-musica.mp3" }
];

let currentUser = null;
let currentIdx = 0;

// --- AUTH ---
auth.onAuthStateChanged(user => {
    currentUser = user;
    if (user) {
        document.body.classList.add('is-vip');
        if(document.getElementById('display-name')) document.getElementById('display-name').innerText = user.displayName;
        db.ref('users/' + user.uid).update({ email: user.email });
    } else {
        document.body.classList.remove('is-vip');
        if(document.getElementById('display-name')) document.getElementById('display-name').innerText = "Invitado";
    }
});

window.loginGoogle = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
window.cerrarSesion = () => auth.signOut().then(() => location.reload());

// --- NAVEGACIÓN ---
window.showPage = (id, el) => {
    document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.v-item').forEach(n => n.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if(el) el.classList.add('active');
    if(id === 'p-musica') cargarMusica();
};

// ==========================================
// 3. REPRODUCTOR Y SISTEMA
// ==========================================
window.loadVideo = (index) => {
    currentIdx = index;
    const v = playlist[index];
    if(!v.url) return alert("Pronto disponible");

    const vid = document.getElementById('main-video');
    document.getElementById('video-source').src = v.url;
    document.getElementById('current-title').innerText = v.title;
    
    const descEl = document.getElementById('video-description');
    if(descEl) descEl.innerText = v.desc;

    vid.load();
    vid.play().catch(e => console.log("Autoplay bloqueado"));
    
    document.querySelector('.vscode-main').scrollTo({ top: 0, behavior: 'smooth' });
    document.getElementById('comments-wrapper').style.display = 'none';

    // View +1
    db.ref(`stats/${v.id}/views`).transaction(c => (c || 0) + 1);

    vincularDatos(v.id);
};

// --- GESTIÓN DE DATOS E INTERACCIÓN ---
function vincularDatos(vidId) {
    db.ref(`stats/${vidId}/likes`).on('value', s => document.getElementById('likes-count').innerText = s.val() || 0);
    db.ref(`stats/${vidId}/views`).on('value', s => document.getElementById('total-views').innerText = s.val() || 0);

    const list = document.getElementById('comments-list');
    const btnCount = document.getElementById('comments-count-btn');
    
    // Escuchar comentarios y renderizar
    db.ref(`comments/${vidId}`).on('value', s => {
        const data = s.val();
        const count = s.numChildren();
        if(btnCount) btnCount.innerText = count;
        
        list.innerHTML = "";
        
        if(data) {
            Object.entries(data).reverse().forEach(([key, val]) => {
                const div = document.createElement('div');
                div.className = 'comment-block';
                
                let repliesHTML = "";
                if (val.replies) {
                    Object.values(val.replies).forEach(r => {
                        repliesHTML += `<div class="sub-reply"><span style="color:#00ff88">${r.user}:</span> ${r.text}</div>`;
                    });
                }

                div.innerHTML = `
                    <div class="main-comment">
                        <span class="user-tag">${val.user}</span>
                        <span style="color:#ddd">${val.text}</span>
                    </div>
                    
                    <div class="comment-actions-row">
                        <button class="btn-comment-action" onclick="window.darLikeComentario('${key}')">
                            ❤️ ${val.likes || 0}
                        </button>
                        <button class="btn-comment-action" onclick="window.mostrarCajaRespuesta('${key}')">
                            Responder
                        </button>
                    </div>
                    
                    <div class="replies-container">
                        ${repliesHTML}
                        <div id="reply-box-${key}" class="reply-input-box" style="display:none;">
                            <input type="text" id="input-${key}" placeholder="Responder...">
                            <button onclick="window.enviarRespuesta('${key}')">></button>
                        </div>
                    </div>
                `;
                list.appendChild(div);
            });
        } else {
            list.innerHTML = '<p class="term-line">Sé el primero en comentar.</p>';
        }
    });
}

// --- LOGICA DE COMENTARIOS ---
window.darLikeComentario = (commentId) => {
    if(!currentUser) return alert("Inicia sesión para dar like.");
    const videoId = playlist[currentIdx].id;
    db.ref(`comments/${videoId}/${commentId}/likes`).transaction(c => (c || 0) + 1);
};

window.mostrarCajaRespuesta = (commentId) => {
    const box = document.getElementById(`reply-box-${commentId}`);
    box.style.display = (box.style.display === 'none') ? 'flex' : 'none';
};

window.enviarRespuesta = (commentId) => {
    const input = document.getElementById(`input-${commentId}`);
    const text = input.value.trim();
    if(!currentUser) return alert("Inicia sesión para responder.");
    if(!text) return;

    db.ref(`comments/${playlist[currentIdx].id}/${commentId}/replies`).push({
        text: text,
        user: currentUser.displayName,
        uid: currentUser.uid,
        timestamp: Date.now()
    });
    input.value = "";
};

window.enviarComentario = () => {
    const txt = document.getElementById('comment-text').value.trim();
    if(!currentUser) return alert("Inicia sesión para comentar.");
    if(!txt) return;
    
    db.ref(`comments/${playlist[currentIdx].id}`).push({
        text: txt,
        user: currentUser.displayName,
        uid: currentUser.uid,
        timestamp: Date.now()
    });
    document.getElementById('comment-text').value = "";
};

// --- LOGICA GENERAL (VIDEO LIKE, MUSICA, CHAT) ---
window.toggleComments = () => {
    const box = document.getElementById('comments-wrapper');
    box.style.display = (box.style.display === 'none') ? 'block' : 'none';
};

window.darLike = () => {
    const id = playlist[currentIdx].id;
    db.ref(`stats/${id}/likes`).transaction(c => (c || 0) + 1);
};

function cargarMusica() {
    const box = document.getElementById('music-list');
    if(box.innerHTML !== "") return;
    music.forEach(m => {
        const div = document.createElement('div');
        div.style.padding = "10px"; div.style.borderBottom = "1px solid #333";
        div.style.display = "flex"; div.style.justifyContent = "space-between";
        div.innerHTML = `<span>${m.title}</span> <button onclick="new Audio('${m.url}').play()" style="background:transparent; color:var(--accent); border:1px solid var(--accent); cursor:pointer; font-family:'Fira Code'">▶ PLAY</button>`;
        box.appendChild(div);
    });
}

window.toggleLiveChat = () => {
    const w = document.getElementById('live-chat-window');
    w.style.display = (w.style.display === 'flex') ? 'none' : 'flex';
};
window.enviarMensajeChat = () => {
    const txt = document.getElementById('chat-input-msg').value.trim();
    if(!currentUser) return alert("Inicia sesión");
    if(!txt) return;
    db.ref('messages').push({ text: txt, user: currentUser.displayName });
    document.getElementById('chat-input-msg').value = "";
};
db.ref('messages').limitToLast(15).on('child_added', s => {
    const m = s.val();
    const div = document.createElement('div');
    div.style.marginBottom = "5px"; div.style.fontSize = "0.85rem";
    div.innerHTML = `<b style="color:var(--accent)">${m.user}</b>: ${m.text}`;
    const body = document.getElementById('chat-global-msgs');
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
});

// INICIO
window.onload = function() {
    window.loadVideo(0);
};