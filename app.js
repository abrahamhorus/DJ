const firebaseConfig = { databaseURL: "https://abrahamhorus1996-default-rtdb.firebaseio.com/" };
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let fanName = localStorage.getItem('fanName') || null;
let totalSubs = 1000;

// TU DESCRIPCIÓN ORIGINAL INTACTA
const playlist = [{ 
    id: "despierto", 
    title: "DESPIERTO (Video Oficial)", 
    url: "https://res.cloudinary.com/dmwxi5gkf/video/upload/v1766804153/video_web_pro_fgjwjs.mp4", 
    desc: "DESPIERTO: el primer video oficial del artista Abraham Horus. El video trata de la superación de una crisis, llegando a la muerte y renaciendo con una fuerza de voluntad inquebrantable logrando la iluminación de cuerpo y alma. 👑" 
}];

// NAVEGACIÓN Y CARGA
window.changeVideo = () => {
    const v = playlist[0];
    document.getElementById('video-source').src = v.url;
    const vid = document.getElementById('main-video');
    vid.load();
    document.getElementById('v-title').innerText = v.title;
    document.getElementById('v-desc').innerText = v.desc;
    
    // Vincular Firebase al video
    db.ref(`stats/${v.id}/likes`).on('value', s => document.getElementById('likes-count').innerText = s.val() || 0);
    db.ref(`stats/${v.id}/views`).on('value', s => document.getElementById('total-views').innerText = s.val() || 0);
    
    // Cargar Comentarios con Estilo
    db.ref(`comments/${v.id}`).on('child_added', snap => {
        const c = snap.val();
        const div = document.createElement('div');
        div.style.background = "#0a0a0a"; div.style.padding = "10px"; div.style.borderRadius = "8px"; div.style.marginBottom = "10px";
        div.innerHTML = `<b style="color:#00ff88">@${c.userName}</b><p style="font-size:0.9rem">${c.text}</p>`;
        document.getElementById('comments-list').prepend(div);
    });
};

// CHAT
db.ref('messages').limitToLast(15).on('child_added', s => {
    const d = s.val();
    const isVIP = d.text && d.text.startsWith('*');
    if(isVIP) document.getElementById('ding-sound').play().catch(()=>{});
    
    const div = document.createElement('div');
    div.style.marginBottom = "8px";
    div.innerHTML = `<b style="color:${isVIP?'#00ff88':'#888'}">${isVIP?'👑 VIP':(d.userName||'Fan')}:</b> ${isVIP?d.text.substring(1):d.text}`;
    document.getElementById('chat-box').appendChild(div);
    document.getElementById('chat-box').scrollTop = document.getElementById('chat-box').scrollHeight;
});

window.enviarMsg = () => {
    const input = document.getElementById('user-msg');
    const text = input.value.trim();
    if(!text) return;
    if(!text.startsWith('*') && !fanName) { fanName = prompt("¿Apodo?"); localStorage.setItem('fanName', fanName); }
    db.ref('messages').push({ text, userName: text.startsWith('*') ? "LA POTRA" : fanName });
    input.value = "";
};

// CONTADORES
setInterval(() => {
    document.getElementById('live-views').innerText = Math.floor(Math.random() * 900) + 100;
    totalSubs += Math.floor(Math.random() * 2);
    document.getElementById('total-subs').innerText = totalSubs.toLocaleString();
}, 5000);

window.darLike = () => db.ref(`stats/${playlist[0].id}/likes`).transaction(c => (c||0)+1);
window.toggleChat = () => document.getElementById('chat-sidebar').classList.toggle('active');
window.showPage = (id) => {
    document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
};

document.addEventListener('DOMContentLoaded', () => window.changeVideo());