// ==========================================
// 1. CONFIGURACIÓN DE FIREBASE (NO TOCAR)
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

// Inicializar Firebase si no existe
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

console.log("%c SYSTEM ONLINE ", "background: #00ff88; color: #000; font-weight: bold; padding: 5px;");
console.log("Conectando con la base de datos del Patrón...");

// ==========================================
// 2. BASE DE DATOS LOCAL (Tus Archivos)
// ==========================================

// --- LISTA DE VIDEOS ---
const playlist = [
    {
        id: "despierto",
        title: "DESPIERTO",
        desc: "Video Oficial - 4K Release",
        url: "https://res.cloudinary.com/dmwxi5gkf/video/upload/v1766804153/video_web_pro_fgjwjs.mp4",
        poster: "assets/shot 1.jpeg"
    },
    // Puedes agregar más videos aquí
    {
        id: "v2",
        title: "PRÓXIMAMENTE",
        desc: "Loading assets...",
        url: "", // Dejar vacío si no está listo
        poster: "assets/shot 1.jpeg"
    }
];

// --- LISTA DE MÚSICA ---
const musicPlaylist = [
    {
        title: "DESPIERTO (Original Mix)",
        artist: "Abraham Horus",
        url: "https://res.cloudinary.com/dmwxi5gkf/video/upload/v1734200000/tu-musica.mp3",
        cover: "assets/cover-despierto.jpg"
    },
    {
        title: "SYSTEM OVERRIDE (Demo)",
        artist: "Abraham Horus",
        url: "", // Sin URL para probar
        cover: "assets/shot 1.jpeg"
    }
];

// ==========================================
// 3. SISTEMA DE USUARIOS Y AUTH
// ==========================================
let fanName = "Guest User";
let fanAvatar = "https://i.imgur.com/6VBx3io.png";

// Escuchar cambios de sesión (Login/Logout)
auth.onAuthStateChanged(user => {
    if (user) {
        // --- USUARIO LOGUEADO (VIP) ---
        document.body.classList.add('is-vip'); // Esto oculta las terminales de bloqueo en CSS
        console.log(`%c ACCESS GRANTED: ${user.email}`, "color: #00ff88");
        
        db.ref('users/' + user.uid).once('value').then(snap => {
            if (snap.exists()) {
                const d = snap.val();
                fanName = d.name;
                fanAvatar = d.avatar;
            } else {
                // Nuevo usuario
                fanName = user.displayName;
                fanAvatar = user.photoURL || fanAvatar;
                db.ref('users/' + user.uid).set({
                    name: fanName,
                    email: user.email,
                    avatar: fanAvatar,
                    joined: Date.now()
                });
            }
            actualizarPerfilUI();
        });
    } else {
        // --- USUARIO NO LOGUEADO ---
        document.body.classList.remove('is-vip');
        console.warn("ACCESS RESTRICTED: Guest Mode");
        fanName = "Guest User";
        fanAvatar = "https://i.imgur.com/6VBx3io.png";
        actualizarPerfilUI();
    }
});

function actualizarPerfilUI() {
    // Actualiza la tarjeta de perfil
    if(document.getElementById('display-name')) document.getElementById('display-name').innerText = fanName;
    if(document.getElementById('profile-preview')) document.getElementById('profile-preview').src = fanAvatar;
}

// Funciones de Auth
window.loginGoogle = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(error => {
        console.error("Error de autenticación:", error);
        alert("Error al conectar: " + error.message);
    });
};

window.cerrarSesion = () => {
    auth.signOut().then(() => {
        window.location.reload();
    });
};

// ==========================================
// 4. NAVEGACIÓN (SIDEBAR)
// ==========================================
window.showPage = (pageId, elementRef) => {
    // 1. Ocultar todas las páginas
    document.querySelectorAll('.app-page').forEach(page => {
        page.classList.remove('active');
    });

    // 2. Desactivar todos los items del menú
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // 3. Mostrar la página seleccionada
    document.getElementById(pageId).classList.add('active');

    // 4. Activar el item del menú clickeado
    if (elementRef) {
        elementRef.classList.add('active');
    }

    // Si entramos a música, cargar la lista
    if(pageId === 'p-musica') {
        renderMusicList();
    }
};

// ==========================================
// 5. VIDEO PLAYER (OVERLAY FLOTANTE)
// ==========================================
window.loadVideo = (index) => {
    const videoData = playlist[index];
    
    if (!videoData.url) {
        alert("⚠️ ARCHIVO NO ENCONTRADO O ENCRIPTADO.");
        return;
    }

    const overlay = document.getElementById('video-overlay');
    const videoTag = document.getElementById('main-video');
    const sourceTag = document.getElementById('video-source');

    // Cargar video
    sourceTag.src = videoData.url;
    videoTag.load();
    
    // Mostrar overlay y reproducir
    overlay.style.display = 'flex';
    videoTag.play().catch(e => console.log("Autoplay bloqueado por navegador"));

    console.log(`Reproduciendo: ${videoData.title}`);
};

// Cerrar video al hacer click fuera del video o en la X
document.getElementById('video-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'video-overlay' || e.target.classList.contains('close-video')) {
        const overlay = document.getElementById('video-overlay');
        const videoTag = document.getElementById('main-video');
        
        videoTag.pause();
        overlay.style.display = 'none';
    }
});

// ==========================================
// 6. REPRODUCTOR DE MÚSICA (HACKER CONSOLE)
// ==========================================
function renderMusicList() {
    const container = document.getElementById('music-list');
    if (!container) return;
    
    container.innerHTML = ""; // Limpiar lista

    musicPlaylist.forEach((track, index) => {
        // Crear elemento HTML puro para la lista
        const item = document.createElement('div');
        item.className = 'nav-item'; // Reusamos el estilo del nav para que parezca lista
        item.style.marginBottom = "10px";
        item.style.background = "#1a1a1a";
        item.style.border = "1px solid #333";
        
        item.innerHTML = `
            <div style="display:flex; align-items:center; width:100%; justify-content:space-between;">
                <div style="display:flex; align-items:center;">
                    <span style="color:var(--accent); margin-right:15px; font-family:'Fira Code'">[${index + 1}]</span>
                    <div>
                        <div style="font-weight:bold; color:#fff;">${track.title}</div>
                        <div style="font-size:0.8rem; color:#666;">${track.artist}</div>
                    </div>
                </div>
                <button onclick="window.playTrack(${index})" style="background:transparent; border:1px solid var(--accent); color:var(--accent); padding:5px 15px; cursor:pointer; font-family:'Fira Code'">RUN ></button>
            </div>
        `;
        
        container.appendChild(item);
    });
}

// Variable global para el audio
let currentAudio = new Audio();

window.playTrack = (index) => {
    const track = musicPlaylist[index];
    
    if (!track.url) {
        alert("⚠️ ERROR: AUDIO_FILE_MISSING");
        return;
    }

    // Detener audio anterior
    currentAudio.pause();
    
    // Cargar nuevo
    currentAudio.src = track.url;
    currentAudio.play();
    
    // Actualizar título en la sección (efecto visual)
    const titleHeader = document.querySelector('#p-musica .section-title');
    if(titleHeader) {
        titleHeader.innerHTML = `console.play(<span style="color:var(--accent)">'${track.title}'</span>)`;
    }
};

// ==========================================
// 7. PWA (INSTALACIÓN DE APP)
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registrado:', reg.scope))
            .catch(err => console.log('Service Worker falló:', err));
    });
}