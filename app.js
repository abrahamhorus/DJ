// CONFIGURACIÓN (Mantener la tuya)
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
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// DATOS
const playlist = [
    { id: "despierto", title: "DESPIERTO (Video Oficial)", url: "https://res.cloudinary.com/dmwxi5gkf/video/upload/v1766804153/video_web_pro_fgjwjs.mp4" },
    { id: "v2", title: "PRÓXIMAMENTE", url: "" }
];
const music = [
    { title: "DESPIERTO (Mix)", url: "https://res.cloudinary.com/dmwxi5gkf/video/upload/v1734200000/tu-musica.mp3" }
];

let currentUser = null;
let currentIdx = 0;

// USUARIOS
auth.onAuthStateChanged(user => {
    currentUser = user;
    if (user) {
        document.body.classList.add('is-vip');
        db.ref('users/' + user.uid).update({ email: user.email });
        if(document.getElementById('display-name')) document.getElementById('display-name').innerText = user.displayName;
    } else {
        document.body.classList.remove('is-vip');
        if(document.getElementById('display-name')) document.getElementById('display-name').innerText = "Invitado";
    }
});

window.loginGoogle = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
window.cerrarSesion = () => auth.signOut().then(() => location.reload());

// NAVEGACIÓN
window.showPage = (id, el) => {
    document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if(el) el.classList.add('active');
    
    if(id === 'p-musica') cargarMusica();
};

// --- FUNCIÓN CLAVE: CAMBIAR VIDEO SIN OVERLAY ---
window.cambiarVideo = (index) => {
    currentIdx = index;
    const v = playlist[index];
    if(!v.url) return alert("Pronto disponible");

    // 1. Actualizar el reproductor fijo
    const video = document.getElementById('main-video');
    document.getElementById('video-source').src = v.url;
    document.getElementById('current-title').innerText = v.title;
    video.load();
    video.play().catch(e => console.log("Autoplay bloqueado"));

    // 2. Scroll arriba suave
    document.querySelector('.main-content').scrollTo({ top: 0, behavior: 'smooth' });

    // 3. Conectar datos (Likes/Comentarios)
    vincularDatos(v.id);
};

function vincularDatos(vidId) {
    // Likes
    db.ref(`stats/${vidId}/likes`).on('value', s => {
        document.getElementById('likes-count').innerText = s.val() || 0;
    });
    // Comentarios
    const list = document.getElementById('comments-list');
    list.innerHTML = '<p class="empty">Cargando...</p>';
    db.ref(`comments/${vidId}`).on('value', s => {
        const d = s.val();
        list.innerHTML = "";
        if(d) {
            Object.values(d).reverse().forEach(c => {
                const div = document.createElement('div');
                div.className = 'single-comment';
                div.innerHTML = `<span class="c-user">${c.user}</span>: <span class="c-text">${c.text}</span>`;
                list.appendChild(div);
            });
        } else {
            list.innerHTML = '<p class="empty">Sin comentarios.</p>';
        }
    });
}

window.darLike = () => {
    const id = playlist[currentIdx].id;
    db.ref(`stats/${id}/likes`).transaction(c => (c || 0) + 1);
};

window.enviarComentario = () => {
    const txt = document.getElementById('comment-text').value.trim();
    if(!currentUser) return alert("Inicia sesión");
    if(!txt) return;
    
    db.ref(`comments/${playlist[currentIdx].id}`).push({
        text: txt,
        user: currentUser.displayName,
        uid: currentUser.uid,
        timestamp: Date.now()
    });
    document.getElementById('comment-text').value = "";
};

// MÚSICA
function cargarMusica() {
    const box = document.getElementById('music-list');
    if(box.innerHTML !== "") return;
    music.forEach(m => {
        const div = document.createElement('div');
        div.innerHTML = `<span>${m.title}</span> <button onclick="new Audio('${m.url}').play()" style="background:var(--accent); border:none; border-radius:4px; cursor:pointer;">▶</button>`;
        box.appendChild(div);
    });
}

// CHAT GLOBAL
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
    const d = document.createElement('div');
    d.style.marginBottom = "5px"; d.style.fontSize = "0.9rem";
    d.innerHTML = `<b style="color:var(--accent)">${m.user}:</b> ${m.text}`;
    document.getElementById('chat-global-msgs').appendChild(d);
});

// Inicializar con el primer video
window.cambiarVideo(0);