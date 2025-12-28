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

let fanName = localStorage.getItem('fanName') || "Fan";
let fanAvatar = localStorage.getItem('fanAvatar') || "https://i.imgur.com/6VBx3io.png";

// ESCUCHAR SUBS
db.ref('siteStats/subscribers').on('value', snapshot => {
    const count = snapshot.val() || 1000; 
    document.getElementById('total-subs').innerText = count.toLocaleString();
});

// LOGICA DE SESIÓN
auth.onAuthStateChanged(user => {
    if (user) { 
        document.body.classList.add('is-vip');
        
        // Cargar datos guardados del usuario
        db.ref('users/' + user.uid).once('value').then(snap => {
            if (snap.exists()) {
                const data = snap.val();
                fanName = data.name || user.displayName;
                fanAvatar = data.avatar || user.photoURL || "https://i.imgur.com/6VBx3io.png";
            } else {
                // Usuario nuevo: Registrar y sumar sub
                fanName = user.displayName;
                fanAvatar = user.photoURL || "https://i.imgur.com/6VBx3io.png";
                
                db.ref('siteStats/subscribers').transaction(c => (c || 1000) + 1);
                db.ref('users/' + user.uid).set({
                    name: fanName,
                    email: user.email,
                    avatar: fanAvatar,
                    joined: Date.now()
                });
            }
            
            // Actualizar interfaz
            actualizarUI();
            localStorage.setItem('fanName', fanName);
            localStorage.setItem('fanAvatar', fanAvatar);
        });

    } else { 
        document.body.classList.remove('is-vip');
        fanName = "Fan";
        fanAvatar = "https://i.imgur.com/6VBx3io.png";
        actualizarUI();
    }
});

function actualizarUI() {
    document.getElementById('header-avatar').src = fanAvatar;
    document.getElementById('profile-preview').src = fanAvatar;
    document.getElementById('edit-name').value = fanName;
    document.getElementById('edit-photo').value = fanAvatar;
}

// FUNCIONES DE PERFIL
window.abrirPerfil = () => {
    if (document.body.classList.contains('is-vip')) {
        window.showPage('p-profile');
    } else {
        alert("Inicia sesión para ver tu perfil.");
        window.loginGoogle();
    }
};

window.guardarPerfil = () => {
    const user = auth.currentUser;
    if (user) {
        const newName = document.getElementById('edit-name').value;
        const newPhoto = document.getElementById('edit-photo').value;

        if (newName && newPhoto) {
            fanName = newName;
            fanAvatar = newPhoto;
            
            // Guardar en DB y LocalStorage
            db.ref('users/' + user.uid).update({ name: newName, avatar: newPhoto });
            localStorage.setItem('fanName', newName);
            localStorage.setItem('fanAvatar', newPhoto);
            
            actualizarUI();
            alert("¡Perfil actualizado con éxito! 👑");
        }
    }
};

window.cerrarSesion = () => {
    auth.signOut().then(() => {
        alert("Sesión cerrada. ¡Vuelve pronto!");
        window.showPage('p-videos');
    });
};

window.loginGoogle = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(e => console.log(e));
};

// ... RESTO DEL CÓDIGO ORIGINAL ...
const playlist = [
    { 
        id: "despierto", 
        title: "DESPIERTO (Video Oficial)", 
        url: "https://res.cloudinary.com/dmwxi5gkf/video/upload/v1766804153/video_web_pro_fgjwjs.mp4", 
        poster: "assets/shot 1.jpeg", 
        desc: "DESPIERTO: el primer video oficial del artista Abraham Horus. 👑" 
    },
    { 
        id: "proximamente", 
        title: "PRÓXIMO LANZAMIENTO", 
        url: "", 
        poster: "assets/poster-proximamente.jpg", 
        desc: "Espéralo muy pronto..." 
    }
];
let currentIndex = 0;

setInterval(() => {
    const liveEl = document.getElementById('live-views');
    if(liveEl) {
        const viewers = Math.floor(Math.random() * (1000 - 200 + 1)) + 100;
        liveEl.innerText = viewers.toLocaleString();
    }
}, 5000);

window.toggleComments = () => {
    const wrapper = document.getElementById('comments-wrapper');
    if (wrapper.style.display === "none") {
        wrapper.style.display = "block";
        wrapper.scrollIntoView({ behavior: 'smooth' });
    } else {
        wrapper.style.display = "none";
    }
};

window.loadVideo = (index) => {
    const v = playlist[index];
    const vid = document.getElementById('main-video');
    if(v.url) document.getElementById('video-source').src = v.url;
    vid.poster = v.poster; 
    vid.load();
    document.getElementById('v-title').innerText = v.title;
    document.getElementById('v-desc').innerText = v.desc;
    const wrapper = document.getElementById('comments-wrapper');
    if (wrapper) wrapper.style.display = "none";
    vincularData(v.id);
};

function vincularData(videoId) {
    db.ref(`stats/${videoId}/likes`).off(); 
    db.ref(`stats/${videoId}/views`).off(); 
    db.ref(`comments/${videoId}`).off();
    document.getElementById('comments-list').innerHTML = "";

    db.ref(`stats/${videoId}/likes`).on('value', s => document.getElementById('likes-count').innerText = s.val() || 0);
    db.ref(`stats/${videoId}/views`).on('value', s => document.getElementById('total-views').innerText = s.val() || 0);
    db.ref(`comments/${videoId}`).on('value', s => document.getElementById('comments-count').innerText = s.numChildren());
    
    db.ref(`comments/${videoId}`).on('child_added', snap => {
        const c = snap.val(); const id = snap.key;
        const div = document.createElement('div');
        div.className = 'comment-item'; div.id = `comment-${id}`;
        div.innerHTML = `
            <span class="comment-user">@${c.userName}</span>
            <p style="color:#ccc; margin-top:5px;">${c.text}</p>
            <div style="margin-top:8px; display:flex; align-items:center;">
                <button class="comment-like-btn" onclick="window.likeComentario('${videoId}','${id}')">
                    ❤️ <span id="lc-${id}">${c.likes || 0}</span>
                </button>
            </div>`;
        document.getElementById('comments-list').prepend(div);
        db.ref(`comments/${videoId}/${id}/likes`).on('value', ls => {
            const countSpan = document.getElementById(`lc-${id}`);
            if(countSpan) countSpan.innerText = ls.val() || 0;
        });
    });
}

window.likeComentario = (vId, cId) => db.ref(`comments/${vId}/${cId}/likes`).transaction(c => (c || 0) + 1);

window.enviarComentario = () => {
    const input = document.getElementById('comment-text');
    if (input.value.trim()) {
        if (!auth.currentUser) { alert("Inicia sesión primero"); window.loginGoogle(); return; }
        db.ref(`comments/${playlist[currentIndex].id}`).push({ text: input.value, userName: fanName, likes: 0 });
        input.value = "";
    }
};

db.ref('messages').limitToLast(1).on('child_added', s => {
    const d = s.val(); const isVIP = d.text.startsWith('*');
    if(isVIP && !document.getElementById('p-videos').classList.contains('active')) {
        const badge = document.getElementById('live-badge');
        if(badge) badge.style.display = 'block';
    }
    const div = document.createElement('div');
    div.className = isVIP ? 'msg artista-vip' : 'msg';
    div.style.padding = "10px"; div.style.marginBottom = "8px"; div.style.borderRadius = "8px"; div.style.background = "rgba(255,255,255,0.05)";
    div.innerHTML = `<b style="color:var(--accent); font-size:0.75rem;">${isVIP ? '👑 LA POTRA' : (d.userName || 'Fan')}:</b> <span style="font-size:0.9rem;">${isVIP ? d.text.substring(1) : d.text}</span>`;
    document.getElementById('chat-box').appendChild(div);
    document.getElementById('chat-box').scrollTop = document.getElementById('chat-box').scrollHeight;
    if(isVIP) document.getElementById('ding-sound').play().catch(()=>{});
});

window.enviarMsg = () => {
    const input = document.getElementById('user-msg');
    if (input.value.trim()) {
        if (!auth.currentUser) { alert("Inicia sesión para chatear"); window.loginGoogle(); return; }
        db.ref('messages').push({ text: input.value, userName: input.value.startsWith('*') ? "LA POTRA" : fanName });
        input.value = "";
    }
};

window.changeVideo = (dir) => { currentIndex = (currentIndex + dir + playlist.length) % playlist.length; window.loadVideo(currentIndex); };
window.darLike = () => db.ref(`stats/${playlist[currentIndex].id}/likes`).transaction(c => (c || 0) + 1);
window.toggleChat = () => document.getElementById('chat-sidebar').classList.toggle('open');
window.showPage = (id) => { 
    document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active')); 
    document.getElementById(id).classList.add('active'); 
    if(id === 'p-videos') {
        const badge = document.getElementById('live-badge');
        if(badge) badge.style.display = 'none';
    }
};

window.loadVideo(0);