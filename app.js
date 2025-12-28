// CONFIGURACIÓN DE FIREBASE (Tuya original)
const firebaseConfig = { 
    databaseURL: "https://abrahamhorus1996-default-rtdb.firebaseio.com/", 
    projectId: "abrahamhorus1996" 
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth(); // Asegúrate de que esta línea esté aquí

// Lógica de detección VIP corregida para no trabar el sitio
auth.onAuthStateChanged(user => {
    if (user) { 
        document.body.classList.add('is-vip'); 
        fanName = user.displayName; 
    } else { 
        document.body.classList.remove('is-vip'); 
        // Si no hay usuario, fanName vuelve a null para pedir apodo si es necesario
    }
});

window.loginGoogle = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(e => console.log(e));
};

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
        url: "https://tu-url-de-video.mp4", 
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
    wrapper.style.display = (wrapper.style.display === "none") ? "block" : "none";
};

window.loadVideo = (index) => {
    const v = playlist[index];
    const vid = document.getElementById('main-video');
    document.getElementById('video-source').src = v.url;
    vid.poster = v.poster; 
    vid.load();
    document.getElementById('v-title').innerText = v.title;
    document.getElementById('v-desc').innerText = v.desc;
    vincularData(v.id);
};

function vincularData(videoId) {
    db.ref(`stats/${videoId}/likes`).on('value', s => document.getElementById('likes-count').innerText = s.val() || 0);
    db.ref(`stats/${videoId}/views`).on('value', s => document.getElementById('total-views').innerText = s.val() || 0);
    db.ref(`comments/${videoId}`).on('value', s => document.getElementById('comments-count').innerText = s.numChildren());
}

window.enviarComentario = () => {
    if (!auth.currentUser) { alert("Suscríbete para comentar."); window.loginGoogle(); return; }
    const input = document.getElementById('comment-text');
    if (input.value.trim()) {
        db.ref(`comments/${playlist[currentIndex].id}`).push({ text: input.value, userName: auth.currentUser.displayName, likes: 0 });
        input.value = "";
    }
};

window.enviarMsg = () => {
    const input = document.getElementById('user-msg');
    if (input.value.trim()) {
        if(!input.value.startsWith('*') && !auth.currentUser) { alert("Regístrate para chatear."); window.loginGoogle(); return; }
        db.ref('messages').push({ text: input.value, userName: input.value.startsWith('*') ? "LA POTRA" : auth.currentUser.displayName });
        input.value = "";
    }
};

window.changeVideo = (dir) => { currentIndex = (currentIndex + dir + playlist.length) % playlist.length; window.loadVideo(currentIndex); };
window.darLike = () => db.ref(`stats/${playlist[currentIndex].id}/likes`).transaction(c => (c || 0) + 1);
window.toggleChat = () => document.getElementById('chat-sidebar').classList.toggle('open');
window.showPage = (id) => { document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active')); document.getElementById(id).classList.add('active'); };

window.loadVideo(0);