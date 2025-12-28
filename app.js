// ==========================================
// 1. CONFIGURACIÓN FIREBASE
// ==========================================
// ¡OJO! Aquí debes dejar TU configuración que ya tenías y que funcionaba.
// Si borraste la tuya, pega aquí tus claves de Firebase Console.
const firebaseConfig = {
  apiKey: "TU_API_KEY_AQUI", 
  authDomain: "abrahamhorus1996.firebaseapp.com",
  databaseURL: "https://abrahamhorus1996-default-rtdb.firebaseio.com",
  projectId: "abrahamhorus1996",
  storageBucket: "abrahamhorus1996.firebasestorage.app",
  messagingSenderId: "1002882996128",
  appId: "1:1002882996128:web:231c5eb841f3bec4a336c5",
  measurementId: "G-PEYW3V3GSB"
};

// Inicializar Firebase solo si no existe
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// ==========================================
// 2. DATOS DE CONTENIDO
// ==========================================
const playlist = [
    { 
        id: "despierto", 
        title: "DESPIERTO (Video Oficial)", 
        url: "https://res.cloudinary.com/dmwxi5gkf/video/upload/v1766804153/video_web_pro_fgjwjs.mp4" 
    },
    { 
        id: "v2", 
        title: "PRÓXIMAMENTE", 
        url: "" 
    }
];

const music = [
    { title: "DESPIERTO (Mix)", url: "https://res.cloudinary.com/dmwxi5gkf/video/upload/v1734200000/tu-musica.mp3" }
];

let currentUser = null;
let currentIdx = 0;

// ==========================================
// 3. SISTEMA DE USUARIOS
// ==========================================
auth.onAuthStateChanged(user => {
    currentUser = user;
    if (user) {
        document.body.classList.add('is-vip');
        // Actualizar nombre en perfil
        if(document.getElementById('display-name')) document.getElementById('display-name').innerText = user.displayName;
        if(document.getElementById('user-mail')) document.getElementById('user-mail').innerText = user.email;
        // Guardar en base de datos
        db.ref('users/' + user.uid).update({ email: user.email });
    } else {
        document.body.classList.remove('is-vip');
        if(document.getElementById('display-name')) document.getElementById('display-name').innerText = "Invitado";
    }
});

window.loginGoogle = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
window.cerrarSesion = () => auth.signOut().then(() => location.reload());

// ==========================================
// 4. NAVEGACIÓN ENTRE PÁGINAS
// ==========================================
window.showPage = (id, el) => {
    // Quitar clase active de todo
    document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.v-item').forEach(n => n.classList.remove('active'));
    
    // Activar lo seleccionado
    document.getElementById(id).classList.add('active');
    if(el) el.classList.add('active');
    
    // Si es música, cargar la lista
    if(id === 'p-musica') cargarMusica();
};

// ==========================================
// 5. REPRODUCTOR DE VIDEO (LÓGICA PRINCIPAL)
// ==========================================
window.loadVideo = (index) => {
    currentIdx = index;
    const v = playlist[index];
    
    // Validar si hay video
    if(!v.url) return alert("Este video estará disponible pronto.");

    // 1. Cargar en el reproductor de arriba (FIJO)
    const vid = document.getElementById('main-video');
    document.getElementById('video-source').src = v.url;
    document.getElementById('current-title').innerText = v.title;
    vid.load();
    vid.play().catch(e => console.log("Autoplay bloqueado"));

    // 2. Scroll suave hacia arriba
    document.querySelector('.vscode-main').scrollTo({ top: 0, behavior: 'smooth' });

    // 3. SUMAR VISTA (+1) AUTOMÁTICAMENTE
    db.ref(`stats/${v.id}/views`).transaction(current => {
        return (current || 0) + 1;
    });

    // 4. Conectar Likes, Views y Comentarios en tiempo real
    vincularDatos(v.id);
};

function vincularDatos(vidId) {
    // Escuchar Likes
    db.ref(`stats/${vidId}/likes`).on('value', s => {
        document.getElementById('likes-count').innerText = s.val() || 0;
    });

    // Escuchar Vistas
    db.ref(`stats/${vidId}/views`).on('value', s => {
        document.getElementById('total-views').innerText = s.val() || 0;
    });
    
    // Escuchar Comentarios
    const list = document.getElementById('comments-list');
    list.innerHTML = '<p class="term-line">Cargando...</p>';
    
    db.ref(`comments/${vidId}`).on('value', s => {
        const d = s.val();
        list.innerHTML = ""; // Limpiar lista
        if(d) {
            // Recorrer y mostrar comentarios
            Object.values(d).reverse().forEach(c => {
                const div = document.createElement('div');
                div.className = 'term-line';
                // Estilo: Usuario en verde (accent), texto normal
                div.innerHTML = `<span style="color:var(--accent)">${c.user}</span>: ${c.text}`;
                list.appendChild(div);
            });
        } else {
            list.innerHTML = '<p class="term-line">Sé el primero en comentar.</p>';
        }
    });
}

// Dar Like
window.darLike = () => {
    const id = playlist[currentIdx].id;
    db.ref(`stats/${id}/likes`).transaction(c => (c || 0) + 1);
};

// Enviar Comentario
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

// ==========================================
// 6. MÚSICA Y CHAT
// ==========================================
function cargarMusica() {
    const box = document.getElementById('music-list');
    if(box.innerHTML !== "") return; // Si ya cargó, no recargar
    
    music.forEach(m => {
        const div = document.createElement('div');
        div.style.cssText = "padding:10px; border-bottom:1px solid #333; display:flex; justify-content:space-between; align-items:center;";
        div.innerHTML = `
            <span>${m.title}</span> 
            <button onclick="new Audio('${m.url}').play()" style="background:transparent; color:var(--accent); border:1px solid var(--accent); cursor:pointer; font-family:'Fira Code'; font-weight:bold;">▶ REPRODUCIR</button>
        `;
        box.appendChild(div);
    });
}

// Chat Flotante
window.toggleLiveChat = () => {
    const w = document.getElementById('live-chat-window');
    // Alternar entre mostrar (flex) y ocultar (none)
    w.style.display = (w.style.display === 'flex') ? 'none' : 'flex';
};

window.enviarMensajeChat = () => {
    const txt = document.getElementById('chat-input-msg').value.trim();
    if(!currentUser) return alert("Inicia sesión para chatear.");
    if(!txt) return;
    
    db.ref('messages').push({ 
        text: txt, 
        user: currentUser.displayName,
        timestamp: Date.now()
    });
    document.getElementById('chat-input-msg').value = "";
};

// Escuchar mensajes del chat global
db.ref('messages').limitToLast(15).on('child_added', s => {
    const m = s.val();
    const div = document.createElement('div');
    div.style.marginBottom = "5px"; 
    div.style.fontSize = "0.85rem";
    div.innerHTML = `<b style="color:var(--accent)">${m.user}</b>: ${m.text}`;
    
    const box = document.getElementById('chat-global-msgs');
    box.appendChild(div);
    box.scrollTop = box.scrollHeight; // Auto-scroll al final
});

// Cargar el primer video al iniciar
window.loadVideo(0);