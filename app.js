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

// CONFIGURACIÓN PATRÓN
const ADMIN_EMAIL = "abrahorus@gmail.com"; 

const musicPlaylist = [
    { id: "m1", title: "DESPIERTO (Original Mix)", url: "https://res.cloudinary.com/dmwxi5gkf/video/upload/v1734200000/tu-musica.mp3", cover: "assets/cover-despierto.jpg" },
    { id: "m2", title: "PRÓXIMO HIT", url: "", cover: "assets/shot 1.jpeg" }
];

let fanName = localStorage.getItem('fanName') || "Fan";
let fanAvatar = localStorage.getItem('fanAvatar') || "https://i.imgur.com/6VBx3io.png";

// PRESENCIA REAL
db.ref(".info/connected").on("value", (snap) => {
  if (snap.val() === true) { const con = db.ref("connections").push(); con.onDisconnect().remove(); con.set(true); }
});
db.ref("connections").on("value", (snap) => {
  const count = snap.numChildren();
  if(document.getElementById('btn-live-count')) document.getElementById('btn-live-count').innerText = "● " + count;
  if(document.getElementById('desk-live-count')) document.getElementById('desk-live-count').innerText = "● " + count;
});

// SUBS
db.ref('siteStats/subscribers').on('value', snap => {
    document.getElementById('total-subs').innerText = (snap.val() || 1000).toLocaleString();
});

// SESIÓN
auth.onAuthStateChanged(user => {
    if (user) { 
        document.body.classList.add('is-vip');
        db.ref('users/' + user.uid).once('value').then(snap => {
            if (snap.exists()) {
                const d = snap.val(); fanName = d.name; fanAvatar = d.avatar;
            } else {
                fanName = user.displayName; fanAvatar = user.photoURL || fanAvatar;
                db.ref('siteStats/subscribers').transaction(c => (c || 1000) + 1);
                db.ref('users/' + user.uid).set({ name: fanName, email: user.email, avatar: fanAvatar, joined: Date.now() });
            }
            actualizarUI();
        });
    } else { document.body.classList.remove('is-vip'); actualizarUI(); }
});

function actualizarUI() {
    document.getElementById('header-avatar').src = fanAvatar;
    if(document.getElementById('profile-preview')) document.getElementById('profile-preview').src = fanAvatar;
    if(document.getElementById('edit-name')) document.getElementById('edit-name').value = fanName;
    if(document.getElementById('edit-photo')) document.getElementById('edit-photo').value = fanAvatar;
}

// MÚSICA
function cargarListaMusica() {
    const container = document.getElementById('music-list');
    if(!container) return;
    container.innerHTML = "";
    musicPlaylist.forEach((t, i) => {
        const card = document.createElement('div');
        card.className = 'music-card';
        card.innerHTML = `<img src="${t.cover}"><div class="music-info"><h4>${t.title}</h4><p>Abraham Horus</p><button class="play-mini-btn" onclick="window.reproducirTrack(${i})">PLAY</button></div>`;
        container.appendChild(card);
    });
}
window.reproducirTrack = (i) => {
    const t = musicPlaylist[i]; if(!t.url) return alert("Próximamente");
    const audio = document.getElementById('audio-element');
    document.getElementById('track-title').innerText = t.title;
    document.getElementById('track-cover').src = t.cover;
    audio.src = t.url; audio.play();
};

// CHAT
window.enviarMsg = () => {
    const input = document.getElementById('user-msg');
    if (input.value.trim() && auth.currentUser) {
        const isBoss = auth.currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
        db.ref('messages').push({ text: input.value, userName: isBoss ? "👑 EL PATRÓN" : fanName, avatar: fanAvatar, isVIP: isBoss });
        input.value = "";
    }
};
db.ref('messages').limitToLast(1).on('child_added', s => {
    const d = s.val(); const isVIP = d.isVIP;
    const div = document.createElement('div'); div.className = isVIP ? 'msg artista-vip' : 'msg'; div.style.marginBottom = "10px";
    div.innerHTML = `<div class="msg-content"><img src="${isVIP ? 'assets/shot 1.jpeg' : d.avatar}" class="chat-mini-avatar"><div><b style="color:var(--accent); font-size:0.7rem;">${d.userName}:</b><br><span style="font-size:0.9rem;">${d.text}</span></div></div>`;
    document.getElementById('chat-box').appendChild(div);
    document.getElementById('chat-box').scrollTop = document.getElementById('chat-box').scrollHeight;
});

// VIDEO
const playlist = [{ id: "despierto", title: "DESPIERTO", url: "https://res.cloudinary.com/dmwxi5gkf/video/upload/v1766804153/video_web_pro_fgjwjs.mp4", poster: "assets/shot 1.jpeg", desc: "Primer video oficial." }];
let currentIndex = 0;
window.loadVideo = (i) => {
    const v = playlist[i];
    document.getElementById('video-source').src = v.url;
    document.getElementById('main-video').load();
    document.getElementById('v-title').innerText = v.title;
    document.getElementById('v-desc').innerText = v.desc;
    vincularData(v.id);
};
function vincularData(vid) {
    db.ref(`stats/${vid}/likes`).on('value', s => document.getElementById('likes-count').innerText = s.val() || 0);
    db.ref(`stats/${vid}/views`).on('value', s => document.getElementById('total-views').innerText = s.val() || 0);
    db.ref(`comments/${vid}`).on('value', s => document.getElementById('comments-count').innerText = s.numChildren());
}
window.darLike = () => db.ref(`stats/${playlist[currentIndex].id}/likes`).transaction(c => (c || 0) + 1);

// NAVEGACIÓN
window.showPage = (id, el) => {
    document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if(el) el.classList.add('active');
    if(id === 'p-musica') cargarListaMusica();
};
window.toggleChat = () => document.getElementById('chat-sidebar').classList.toggle('open');
window.abrirPerfil = () => auth.currentUser ? window.showPage('p-profile') : window.loginGoogle();
window.cerrarSesion = () => auth.signOut().then(() => location.reload());
window.loginGoogle = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());

window.loadVideo(0);