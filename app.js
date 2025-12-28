// ==========================================
// 1. CONFIGURACIÓN FIREBASE
// ==========================================
// ⚠️ SUSTITUYE ESTO CON TUS DATOS DE FIREBASE CONSOLE
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

// Inicializar Firebase
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// ==========================================
// 2. CONFIGURACIÓN DE ADMIN Y MEDIOS
// ==========================================
// ⚠️ IMPORTANTE: Pon aquí tu email real de Google para tener el efecto RAINBOW
const ADMIN_EMAIL = "abrahorus@gmail.com"; 

// Sonido de tortuga (Asegúrate de tener el archivo en la carpeta assets)
const soundTortuga = new Audio("assets/tortuga.mp3"); 

// Datos de la Playlist
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

// Datos de Eventos
const events = [
    { day: "28", month: "DIC", title: "Lanzamiento Web", location: "Live Streaming", link: "#" },
    { day: "15", month: "ENE", title: "Concierto Virtual", location: "YouTube Live", link: "#" },
    { day: "20", month: "FEB", title: "Festival Digital", location: "Ciudad de México", link: "#" }
];

let currentUser = null;
let currentIdx = 0;

// ==========================================
// 3. AUTH Y PERFIL (Login / Logout)
// ==========================================
auth.onAuthStateChanged(user => {
    currentUser = user;
    document.body.classList.toggle('is-vip', !!user);
    
    // Referencias al DOM del Perfil
    const nameEl = document.getElementById('display-name');
    const photoEl = document.getElementById('profile-preview');
    const uidEl = document.getElementById('user-uid');
    const rankEl = document.getElementById('user-rank');
    const subBtn = document.getElementById('btn-subscribe');

    if (user) {
        // --- USUARIO LOGUEADO ---
        if(nameEl) nameEl.innerText = user.displayName ? user.displayName.toUpperCase() : "USUARIO";
        if(photoEl) photoEl.src = user.photoURL || "https://via.placeholder.com/100";
        if(uidEl) uidEl.innerText = user.uid.substring(0, 10) + "...";
        
        // Determinar Rango (Admin vs User)
        if(user.email === ADMIN_EMAIL) {
            rankEl.innerText = "👑 ARTIST / ADMIN";
            rankEl.style.color = "#ff00ff";
            rankEl.style.textShadow = "0 0 5px #ff00ff";
        } else {
            rankEl.innerText = "VERIFIED USER";
            rankEl.style.color = "#fff";
            rankEl.style.textShadow = "none";
        }

        // Verificar si está suscrito
        db.ref(`users/${user.uid}/isSubscribed`).on('value', snap => {
            if (snap.val() === true) {
                subBtn.innerText = "SUSCRITO";
                subBtn.classList.add('subscribed');
            } else {
                subBtn.innerText = "SUSCRIBIRSE";
                subBtn.classList.remove('subscribed');
            }
        });

    } else {
        // --- USUARIO INVITADO ---
        if(nameEl) nameEl.innerText = "INVITADO";
        if(photoEl) photoEl.src = "https://via.placeholder.com/100";
        if(uidEl) uidEl.innerText = "NO_AUTH";
        if(rankEl) rankEl.innerText = "GUEST";
        
        // Reset botón suscripción
        if(subBtn) {
            subBtn.innerText = "SUSCRIBIRSE";
            subBtn.classList.remove('subscribed');
        }
    }
});

window.loginGoogle = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
window.cerrarSesion = () => auth.signOut().then(() => location.reload());

// ==========================================
// 4. LÓGICA DE SUSCRIPCIÓN (Header)
// ==========================================
// Escuchar contador global
db.ref('stats/general/subscribers').on('value', snapshot => {
    const count = snapshot.val() || 0;
    const el = document.getElementById('global-subs-count');
    if(el) el.innerText = count.toLocaleString();
});

window.toggleSub = () => {
    if (!currentUser) return alert("⚠️ Debes iniciar sesión para suscribirte y apoyar al canal.");

    const userSubRef = db.ref(`users/${currentUser.uid}/isSubscribed`);
    const globalCountRef = db.ref('stats/general/subscribers');

    userSubRef.once('value', snapshot => {
        const isSubscribed = snapshot.val();
        if (isSubscribed) {
            userSubRef.set(false); // Desuscribirse
            globalCountRef.transaction(c => (c || 0) - 1);
        } else {
            userSubRef.set(true); // Suscribirse
            globalCountRef.transaction(c => (c || 0) + 1);
        }
    });
};

// ==========================================
// 5. NAVEGACIÓN Y MENÚ
// ==========================================
window.toggleMenu = () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('mobile-overlay').classList.toggle('open');
};

window.showPage = (id, el) => {
    // Ocultar todas las páginas y quitar 'active' del menú
    document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.v-item').forEach(v => v.classList.remove('active'));
    
    // Mostrar la seleccionada
    document.getElementById(id).classList.add('active');
    if(el) el.classList.add('active');
    
    // Cerrar menú en móvil
    if(window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('mobile-overlay').classList.remove('open');
    }
    
    // Cargas dinámicas
    if(id === 'p-musica') cargarMusica();
    if(id === 'p-events') cargarEventos();
};

// ==========================================
// 6. VIDEO PLAYER INTERACTIVO
// ==========================================
window.loadVideo = (index) => {
    currentIdx = index;
    const v = playlist[index];
    if(!v.url) return alert("Contenido bloqueado o próximamente disponible.");
    
    const vid = document.getElementById('main-video');
    document.getElementById('video-source').src = v.url;
    document.getElementById('current-title').innerText = v.title;
    document.getElementById('video-description').innerText = v.desc;
    
    vid.load();
    vid.play().catch(() => console.log("Autoplay bloqueado por navegador"));
    
    // Ocultar comentarios al cambiar video
    document.getElementById('comments-wrapper').style.display = 'none';
    
    // Contar visita
    db.ref(`stats/${v.id}/views`).transaction(c => (c || 0) + 1);
    
    // Vincular likes y comentarios de ESTE video
    vincularDatosVideo(v.id);
};

function vincularDatosVideo(vidId) {
    // Escuchar Likes del Video
    db.ref(`stats/${vidId}/likes`).on('value', s => {
        const el = document.getElementById('likes-count');
        if(el) el.innerText = s.val() || 0;
    });
    
    // Escuchar Vistas
    db.ref(`stats/${vidId}/views`).on('value', s => {
        const el = document.getElementById('total-views');
        if(el) el.innerText = s.val() || 0;
    });

    // Escuchar Comentarios del Video
    db.ref(`comments/${vidId}`).on('value', s => {
        const list = document.getElementById('comments-list');
        list.innerHTML = ""; // Limpiar
        const data = s.val();
        
        // Actualizar contador
        if(document.getElementById('comments-count-btn')) {
            document.getElementById('comments-count-btn').innerText = s.numChildren();
        }
        
        if(data){
            Object.entries(data).reverse().forEach(([key, val]) => {
                const div = document.createElement('div');
                div.className = 'comment-block';
                const userName = val.user || 'Anónimo';
                
                // Renderizar Respuestas (si las hay)
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

// Botones del Video
window.toggleComments = () => {
    const box = document.getElementById('comments-wrapper');
    if (box.style.display === 'none') {
        box.style.display = 'block';
        box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
        box.style.display = 'none';
    }
};

window.darLike = () => db.ref(`stats/${playlist[currentIdx].id}/likes`).transaction(c => (c || 0) + 1);

window.enviarComentario = () => {
    const txt = document.getElementById('comment-text').value.trim();
    if(!currentUser) return alert("⚠️ Inicia sesión para comentar en los videos.");
    if(!txt) return;
    
    db.ref(`comments/${playlist[currentIdx].id}`).push({ 
        text: txt, 
        user: currentUser.displayName, 
        uid: currentUser.uid, 
        likes: 0,
        timestamp: Date.now()
    });
    document.getElementById('comment-text').value = "";
};

window.mostrarCajaRespuesta = (id) => {
    const box = document.getElementById(`reply-box-${id}`);
    box.style.display = (box.style.display === 'none') ? 'flex' : 'none';
};

window.enviarRespuesta = (commentId) => {
    const input = document.getElementById(`input-${commentId}`);
    const text = input.value.trim();
    if(!currentUser) return alert("Inicia sesión para responder.");
    if(!text) return;
    
    db.ref(`comments/${playlist[currentIdx].id}/${commentId}/replies`).push({ 
        text: text, 
        user: currentUser.displayName 
    });
    input.value = "";
};

window.darLikeComentario = (id) => {
    if(!currentUser) return alert("Inicia sesión para dar like.");
    db.ref(`comments/${playlist[currentIdx].id}/${id}/likes`).transaction(c => (c || 0) + 1);
};

// ==========================================
// 7. CHAT GLOBAL LIBRE (Twitch Style)
// ==========================================
window.toggleLiveChat = () => {
    const w = document.getElementById('live-chat-window');
    const launcher = document.querySelector('.chat-launcher');
    if (w.style.display === 'flex') {
        w.style.display = 'none';
        launcher.style.display = 'flex';
    } else {
        w.style.display = 'flex';
        launcher.style.display = 'none';
        const b = document.getElementById('chat-global-msgs');
        b.scrollTop = b.scrollHeight;
    }
};

window.enviarMensajeChat = () => {
    const input = document.getElementById('chat-input-msg');
    const txt = input.value.trim();
    
    // Si no hay texto, no enviamos nada
    if(!txt) return; 
    
    // Definir identidad (Libre vs Registrado)
    let userName = "Invitado";
    let userEmail = "anonimo";
    let isArtist = false;

    if (currentUser) {
        userName = currentUser.displayName;
        userEmail = currentUser.email;
        isArtist = (currentUser.email === ADMIN_EMAIL);
    }
    
    // Enviar a Firebase
    db.ref('messages').push({ 
        text: txt, 
        user: userName, 
        email: userEmail,
        isAdmin: isArtist,
        timestamp: Date.now() 
    });
    
    input.value = "";
};

// Escuchar mensajes del chat
db.ref('messages').limitToLast(50).on('child_added', snapshot => {
    const m = snapshot.val();
    const chatBody = document.getElementById('chat-global-msgs');
    
    const div = document.createElement('div');
    div.className = "msg-bubble";
    
    // A. ES EL ARTISTA (ADMIN) -> Efecto Rainbow + Sonido
    if (m.isAdmin === true || m.email === ADMIN_EMAIL) {
        div.classList.add('msg-artist');
        div.innerHTML = `<span class="msg-user-name">${m.user}</span>${m.text}`;
        
        // Sonido solo si es reciente (< 10 segundos)
        if (Date.now() - m.timestamp < 10000) {
            soundTortuga.play().catch(e => console.log("Audio requeriría interacción"));
        }

    // B. ES UN INVITADO (ANÓNIMO) -> Gris
    } else if (m.email === "anonimo") {
        div.style.backgroundColor = "#2a2a2a"; // Gris oscuro
        div.style.borderLeft = "3px solid #666"; // Borde gris
        div.style.color = "#ccc";
        div.innerHTML = `<span class="msg-user-name" style="color:#aaa;">👻 ${m.user}</span>${m.text}`;

    // C. ES UN FAN REGISTRADO -> Color Random
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

// ==========================================
// 8. CARGA DINÁMICA (Música y Eventos)
// ==========================================
function cargarMusica() {
    const list = document.getElementById('music-list');
    if(list.innerHTML !== "") return;
    
    const music = [{ title: "DESPIERTO (Original Mix)", url: "https://res.cloudinary.com/dmwxi5gkf/video/upload/v1734200000/tu-musica.mp3" }];
    
    music.forEach(m => {
        const div = document.createElement('div');
        div.style = "padding:15px; border-bottom:1px solid #333; display:flex; justify-content:space-between; align-items:center;";
        div.innerHTML = `
            <span style="font-family:'Fira Code'; font-size:0.9rem;">${m.title}</span> 
            <button onclick="new Audio('${m.url}').play()" class="btn-comment-action" style="color:var(--accent); border:1px solid var(--accent); padding:5px 10px; border-radius:4px;">
                ▶ PLAY
            </button>`;
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
            <div class="event-date-box">
                <span class="event-day">${e.day}</span>
                <span class="event-month">${e.month}</span>
            </div>
            <div class="event-info">
                <h3>${e.title}</h3>
                <p>📍 ${e.location}</p>
            </div>
            <button class="btn-ticket">TICKETS</button>
        `;
        list.appendChild(div);
    });
}

// Iniciar cargando el primer video
window.onload = () => window.loadVideo(0);