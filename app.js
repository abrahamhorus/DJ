const firebaseConfig = { databaseURL: "https://abrahamhorus1996-default-rtdb.firebaseio.com/", projectId: "abrahamhorus1996" };
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();
let fanName = localStorage.getItem('fanName') || null;

const playlist = [
    { id: "despierto", title: "DESPIERTO (Video Oficial)", url: "https://res.cloudinary.com/dmwxi5gkf/video/upload/v1766804153/video_web_pro_fgjwjs.mp4", desc: "DESPIERTO: el primer video oficial del artista Abraham Horus. El video trata de la superación de una crisis, llegando a la muerte y renaciendo con una fuerza de voluntad inquebrantable logrando la iluminación de cuerpo y alma. 👑" },
    { id: "proximamente", title: "PRÓXIMO LANZAMIENTO", url: "https://res.cloudinary.com/dmwxi5gkf/video/upload/v1766804153/video_web_pro_fgjwjs.mp4", desc: "Espéralo muy pronto..." }
];
let currentIndex = 0;

window.loadVideo = (index) => {
    const v = playlist[index];
    document.getElementById('video-source').src = v.url;
    document.getElementById('main-video').load();
    document.getElementById('v-title').innerText = v.title;
    document.getElementById('v-desc').innerText = v.desc;
    vincularData(v.id);
};

function vincularData(videoId) {
    db.ref(`stats/${videoId}/likes`).off(); db.ref(`stats/${videoId}/views`).off(); db.ref(`comments/${videoId}`).off();
    document.getElementById('comments-list').innerHTML = "";

    db.ref(`stats/${videoId}/likes`).on('value', s => document.getElementById('likes-count').innerText = s.val() || 0);
    db.ref(`stats/${videoId}/views`).on('value', s => document.getElementById('total-views').innerText = s.val() || 0);

    db.ref(`comments/${videoId}`).on('value', s => document.getElementById('comments-count').innerText = s.numChildren());
    db.ref(`comments/${videoId}`).on('child_added', snap => {
        const c = snap.val(); const id = snap.key;
        const div = document.createElement('div');
        div.className = 'comment-item'; div.id = `comment-${id}`;
        div.innerHTML = `<span class="comment-user">@${c.userName}</span><p style="color:#ccc; margin-top:5px;">${c.text}</p>
                         <button class="reply-btn" onclick="window.abrirReply('${id}')">Responder</button>
                         <div id="replies-${id}" class="replies-container"></div>`;
        document.getElementById('comments-list').prepend(div);

        db.ref(`replies/${id}`).on('child_added', rs => {
            const r = rs.val();
            const rDiv = document.createElement('div');
            rDiv.innerHTML = `<span style="color:var(--accent); font-size:0.75rem;">@${r.userName}</span><p style="font-size:0.85rem; color:#aaa;">${r.text}</p>`;
            document.getElementById(`replies-${id}`).appendChild(rDiv);
        });
    });
}

window.abrirReply = (id) => {
    if (document.getElementById(`ri-${id}`)) return;
    const w = document.createElement('div');
    w.id = `ri-${id}`; w.style.display="flex"; w.style.gap="10px"; w.style.marginTop="10px";
    w.innerHTML = `<input type="text" id="ti-${id}" placeholder="Responde..." style="flex:1; background:#111; border:1px solid #333; color:#fff; padding:8px; border-radius:8px;">
                   <button onclick="window.enviarReply('${id}')" class="reply-btn-ok">OK</button>`;
    document.getElementById(`comment-${id}`).appendChild(w);
};

window.enviarReply = (id) => {
    const input = document.getElementById(`ti-${id}`);
    if (input.value.trim()) {
        verificarNombre();
        db.ref(`replies/${id}`).push({ text: input.value, userName: fanName });
        document.getElementById(`ri-${id}`).remove();
    }
};

window.enviarComentario = () => {
    const input = document.getElementById('comment-text');
    if (input.value.trim()) {
        verificarNombre();
        db.ref(`comments/${playlist[currentIndex].id}`).push({ text: input.value, userName: fanName });
        input.value = "";
    }
};

// CHAT CON EFECTO VIP
db.ref('messages').limitToLast(15).on('child_added', s => {
    const d = s.val(); const isVIP = d.text.startsWith('*');
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
        if(!input.value.startsWith('*')) verificarNombre();
        db.ref('messages').push({ text: input.value, userName: input.value.startsWith('*') ? "LA POTRA" : (fanName || "Anónimo") });
        input.value = "";
    }
};

function verificarNombre() { if (!fanName) { fanName = prompt("¿Tu apodo?"); localStorage.setItem('fanName', fanName); } }
window.changeVideo = (dir) => { currentIndex = (currentIndex + dir + playlist.length) % playlist.length; window.loadVideo(currentIndex); };
window.darLike = () => db.ref(`stats/${playlist[currentIndex].id}/likes`).transaction(c => (c || 0) + 1);
window.toggleChat = () => document.getElementById('chat-sidebar').classList.toggle('open');
window.showPage = (id) => { document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active')); document.getElementById(id).classList.add('active'); };
window.loadVideo(0);