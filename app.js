// ==========================================
// 1. CONFIGURACIÓN
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

const playlist = [
    { 
        id: "despierto", 
        title: "DESPIERTO (Video Oficial)", 
        desc: "DESPIERTO: el primer video oficial del artista Abraham Horus. El video trata de la superación de una crisis, llegando a la muerte y renaciendo con una fuerza de voluntad inquebrantable logrando la iluminación de cuerpo y alma. 👑",
        url: "https://res.cloudinary.com/dmwxi5gkf/video/upload/v1766804153/video_web_pro_fgjwjs.mp4",
        poster: "assets/shot 1.jpeg"
    },
    { id: "v2", title: "PRÓXIMAMENTE", desc: "Cargando assets del sistema...", url: "", poster: "assets/shot 2.jpeg" }
];

const events = [
    { day: "28", month: "DIC", title: "Lanzamiento Web", location: "Live Streaming", link: "#" },
    { day: "15", month: "ENE", title: "Concierto Virtual", location: "YouTube Live", link: "#" },
    { day: "20", month: "FEB", title: "Festival Digital", location: "Ciudad de México", link: "#" }
];

let currentUser = null;
let currentIdx = 0;

auth.onAuthStateChanged(user => {
    currentUser = user;
    document.body.classList.toggle('is-vip', !!user);
    if(document.getElementById('display-name')) document.getElementById('display-name').innerText = user ? user.displayName : "Invitado";
    if(document.getElementById('profile-preview') && user) document.getElementById('profile-preview').src = user.photoURL;
});

window.loginGoogle = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
window.cerrarSesion = () => auth.signOut().then(() => location.reload());

// --- NAVEGACIÓN Y MENÚ MÓVIL ---
window.toggleMenu = () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('mobile-overlay').classList.toggle('open');
};

window.showPage = (id, el) => {
    document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.v-item').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if(el) el.classList.add('active');
    
    // Si estamos en móvil, cerrar el menú al hacer click
    if(window.innerWidth <= 768) {
        window.toggleMenu();
    }
    
    if(id === 'p-musica') cargarMusica();
    if(id === 'p-events') cargarEventos();
};

window.loadVideo = (index) => {
    currentIdx = index;
    const v = playlist[index];
    if(!v.url) return alert("Pronto disponible");
    
    const vid = document.getElementById('main-video');
    document.getElementById('video-source').src = v.url;
    document.getElementById('current-title').innerText = v.title;
    document.getElementById('video-description').innerText = v.desc;
    
    vid.load();
    vid.play().catch(() => {});
    document.getElementById('comments-wrapper').style.display = 'none';
    db.ref(`stats/${v.id}/views`).transaction(c => (c || 0) + 1);
    vincularDatos(v.id);
};

function vincularDatos(vidId) {
    db.ref(`stats/${vidId}/likes`).on('value', s => document.getElementById('likes-count').innerText = s.val() || 0);
    db.ref(`stats/${vidId}/views`).on('value', s => document.getElementById('total-views').innerText = s.val() || 0);

    db.ref(`comments/${vidId}`).on('value', s => {
        const list = document.getElementById('comments-list');
        list.innerHTML = "";
        const data = s.val();
        if(document.getElementById('comments-count-btn')) document.getElementById('comments-count-btn').innerText = s.numChildren();
        
        if(data){
            Object.entries(data).reverse().forEach(([key, val]) => {
                const div = document.createElement('div');
                div.className = 'comment-block';
                const userName = val.user ? val.user : 'Anónimo';
                
                let repliesHTML = "";
                if (val.replies) {
                    Object.values(val.replies).forEach(r => {
                        const rUser = r.user ? r.user : 'Anónimo';
                        repliesHTML += `<div class="sub-reply"><span style="color:#00ff88">${rUser}:</span> ${r.text}</div>`;
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
    if (box.style.display === 'none' || box.style.display === '') {
        box.style.display = 'block';
        box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
        box.style.display = 'none';
    }
};

window.mostrarCajaRespuesta = (commentId) => {
    const box = document.getElementById(`reply-box-${commentId}`);
    box.style.display = (box.style.display === 'none') ? 'flex' : 'none';
};

window.enviarRespuesta = (commentId) => {
    const input = document.getElementById(`input-${commentId}`);
    const text = input.value.trim();
    if(!currentUser) return alert("Inicia sesión");
    if(!text) return;
    db.ref(`comments/${playlist[currentIdx].id}/${commentId}/replies`).push({
        text: text, user: currentUser.displayName, uid: currentUser.uid
    });
    input.value = "";
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
    const b = document.getElementById('chat-global-msgs'); b.appendChild(div); b.scrollTop = b.scrollHeight;
});

function cargarMusica() {
    const list = document.getElementById('music-list');
    if(list.innerHTML !== "") return;
    const music = [{ title: "DESPIERTO (Original Mix)", url: "https://res.cloudinary.com/dmwxi5gkf/video/upload/v1734200000/tu-musica.mp3" }];
    music.forEach(m => {
        const div = document.createElement('div');
        div.style = "padding:15px; border-bottom:1px solid #333; display:flex; justify-content:space-between;";
        div.innerHTML = `<span>${m.title}</span> <button onclick="new Audio('${m.url}').play()" class="btn-comment-action" style="color:var(--accent)">▶ TOCAR</button>`;
        list.appendChild(div);
    });
}

function cargarEventos() {
    const list = document.getElementById('events-list');
    if(list.innerHTML !== "") return;
    events.forEach(e => {
        const div = document.createElement('div');
        div.className = 'event-card';
        div.innerHTML = `
            <div class="event-date-box"><span class="event-day">${e.day}</span><span class="event-month">${e.month}</span></div>
            <div class="event-info"><h3>${e.title}</h3><p>📍 ${e.location}</p></div>
            <button class="btn-ticket">TICKETS</button>
        `;
        list.appendChild(div);
    });
}

window.onload = () => window.loadVideo(0);