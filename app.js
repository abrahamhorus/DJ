const firebaseConfig = { databaseURL: "https://abrahamhorus1996-default-rtdb.firebaseio.com/", projectId: "abrahamhorus1996" };
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();
let totalSubs = 1000;

// TU DESCRIPCIÓN ORIGINAL INTEGRADA
const playlist = [
    { 
        id: "despierto", 
        title: "DESPIERTO (Video Oficial)", 
        url: "https://res.cloudinary.com/dmwxi5gkf/video/upload/v1766804153/video_web_pro_fgjwjs.mp4", 
        desc: "DESPIERTO: el primer video oficial del artista Abraham Horus. El video trata de la superación de una crisis, llegando a la muerte y renaciendo con una fuerza de voluntad inquebrantable logrando la iluminación de cuerpo y alma. 👑" 
    }
];

let currentIndex = 0;

// CONTADORES DINÁMICOS
function updateStats() {
    const live = document.getElementById('live-views');
    const subs = document.getElementById('total-subs');
    if(live) live.innerText = Math.floor(Math.random() * (1000 - 100 + 1)) + 100;
    if(subs) { totalSubs += Math.floor(Math.random() * 2); subs.innerText = totalSubs.toLocaleString(); }
}
setInterval(updateStats, 5000);

// NAVEGACIÓN Y CARGA
window.changeVideo = (dir) => {
    currentIndex = (currentIndex + dir + playlist.length) % playlist.length;
    const v = playlist[currentIndex];
    document.getElementById('video-source').src = v.url;
    document.getElementById('main-video').load();
    document.getElementById('v-title').innerText = v.title;
    document.getElementById('v-desc').innerText = v.desc;
    vincularData(v.id);
};

function vincularData(videoId) {
    db.ref(`stats/${videoId}/likes`).on('value', s => document.getElementById('likes-count').innerText = s.val() || 0);
    db.ref(`stats/${videoId}/views`).on('value', s => document.getElementById('total-views').innerText = s.val() || 0);
    
    const list = document.getElementById('comments-list');
    list.innerHTML = "";
    db.ref(`comments/${videoId}`).off();
    db.ref(`comments/${videoId}`).on('child_added', snap => {
        const c = snap.val(); const id = snap.key;
        const div = document.createElement('div');
        div.style.marginBottom = "15px";
        div.innerHTML = `<b>@${c.userName}</b><p style="color:#ccc;">${c.text}</p>
                         <button style="background:rgba(255,255,255,0.05); border:1px solid #222; color:#fff; padding:4px 8px; border-radius:20px; cursor:pointer; font-size:0.7rem;" onclick="window.likeCom('${videoId}','${id}')">❤️ <span id="lc-${id}">${c.likes||0}</span></button>`;
        list.prepend(div);
    });
}

// NOTIFICACIÓN VIP
db.ref('messages').limitToLast(1).on('child_added', s => {
    const d = s.val(); const isVIP = d.text && d.text.startsWith('*');
    if(isVIP) {
        if(!document.getElementById('p-videos').classList.contains('active')) document.getElementById('live-badge').style.display = 'block';
        document.getElementById('ding-sound').play().catch(()=>{});
    }
    const div = document.createElement('div');
    div.innerHTML = `<b>${isVIP ? '👑 LA POTRA' : (d.userName || 'Fan')}:</b> ${isVIP ? d.text.substring(1) : d.text}`;
    document.getElementById('chat-box').appendChild(div);
    document.getElementById('chat-box').scrollTop = document.getElementById('chat-box').scrollHeight;
});

window.darLike = () => db.ref(`stats/${playlist[currentIndex].id}/likes`).transaction(c => (c||0)+1);
window.likeCom = (vId, cId) => db.ref(`comments/${vId}/${cId}/likes`).transaction(c => (c||0)+1);
window.showPage = (id) => {
    document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if(id === 'p-videos') document.getElementById('live-badge').style.display = 'none';
};
window.toggleChat = () => document.getElementById('chat-sidebar').classList.toggle('active');

document.addEventListener('DOMContentLoaded', () => { window.changeVideo(0); updateStats(); });