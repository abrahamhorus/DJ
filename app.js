const firebaseConfig = { databaseURL: "https://abrahamhorus1996-default-rtdb.firebaseio.com/", projectId: "abrahamhorus1996" };
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();
let fanName = localStorage.getItem('fanName') || null;

const playlist = [
    { id: "despierto", title: "DESPIERTO (Video Oficial)", url: "https://res.cloudinary.com/dmwxi5gkf/video/upload/v1766804153/video_web_pro_fgjwjs.mp4", desc: "DESPIERTO: el primer video oficial del artista Abraham Horus. Trata de la superación de una crisis, llegando a la muerte y renaciendo con fuerza inquebrantable. 👑" },
    { id: "proximamente", title: "PRÓXIMO HIT", url: "https://res.cloudinary.com/dmwxi5gkf/video/upload/v1766804153/video_web_pro_fgjwjs.mp4", desc: "Próximamente más contenido exclusivo. 🚀" }
];
let currentIndex = 0;

window.loadVideo = (index) => {
    const v = playlist[index];
    document.getElementById('video-source').src = v.url;
    document.getElementById('main-video').load();
    document.getElementById('v-title').innerText = v.title;
    document.getElementById('v-desc').innerText = v.desc;
    vincularFirebase(v.id);
};

function vincularFirebase(id) {
    document.getElementById('comments-list').innerHTML = "";
    db.ref(`stats/${id}/likes`).off(); db.ref(`stats/${id}/views`).off(); db.ref(`comments/${id}`).off();

    db.ref(`stats/${id}/likes`).on('value', s => document.getElementById('likes-count').innerText = s.val() || 0);
    db.ref(`stats/${id}/views`).on('value', s => document.getElementById('total-views').innerText = s.val() || 0);
    
    if(!sessionStorage.getItem('v_'+id)) { db.ref(`stats/${id}/views`).transaction(c => (c||0)+1); sessionStorage.setItem('v_'+id, true); }

    db.ref(`comments/${id}`).on('value', s => document.getElementById('comments-count').innerText = s.numChildren());
    db.ref(`comments/${id}`).on('child_added', s => {
        const c = s.val();
        const div = document.createElement('div');
        div.className = 'comment-item';
        div.innerHTML = `<span class="comment-user">@${c.userName}</span><p>${c.text}</p>`;
        document.getElementById('comments-list').prepend(div);
    });
}

window.changeVideo = (dir) => { currentIndex = (currentIndex + dir + playlist.length) % playlist.length; window.loadVideo(currentIndex); };
window.darLike = () => db.ref(`stats/${playlist[currentIndex].id}/likes`).transaction(c => (c||0)+1);
window.enviarComentario = () => {
    const input = document.getElementById('comment-text');
    if (input.value.trim()) {
        if(!fanName) { fanName = prompt("¿Apodo?"); localStorage.setItem('fanName', fanName); }
        db.ref(`comments/${playlist[currentIndex].id}`).push({ text: input.value, userName: fanName || "Fan" });
        input.value = "";
    }
};

window.toggleChat = () => document.getElementById('chat-sidebar').classList.toggle('open');
window.enviarMsg = () => { /* Lógica de chat igual que antes */ };
window.loadVideo(0);