const firebaseConfig = { apiKey: "AIzaSyBiDImq0GMse8SOePAH-3amtmopBRO8wGA", authDomain: "abrahamhorus1996.firebaseapp.com", databaseURL: "https://abrahamhorus1996-default-rtdb.firebaseio.com", projectId: "abrahamhorus1996", storageBucket: "abrahamhorus1996.firebasestorage.app", messagingSenderId: "1002882996128", appId: "1:1002882996128:web:231c5eb841f3bec4a336c5" };
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database(), auth = firebase.auth();
const ADMIN_EMAIL = "abrahorus@gmail.com";
let currentVideoId="default", currentUser=null, currentSongUrl="", audioGlobal=new Audio();

window.onload = () => {
    loadVideo({ id: "v_init", title: "DESPIERTO (Oficial)", desc: "Video Oficial", url: "https://res.cloudinary.com/dmwxi5gkf/video/upload/v1766804153/video_web_pro_fgjwjs.mp4", poster: "assets/shot 1.jpeg" });
    initApp();
};

function initApp() {
    db.ref('social/videos').on('value', s => {
        const g=document.getElementById('videos-grid'); if(g) g.innerHTML="";
        if(s.val()) Object.entries(s.val()).reverse().forEach(([k,v]) => {
            const c=document.createElement('div'); c.className="code-card"; c.onclick=()=>loadVideo({id:k,...v});
            c.innerHTML=`<div class="card-thumb"><img src="${v.poster}"></div><div class="card-text">${v.title}</div>`;
            g.appendChild(c);
        });
    });
    
    // CHAT MEJORADO
    db.ref('chat_global').limitToLast(30).on('child_added', s => {
        const m = s.val(), box = document.getElementById('chat-global-msgs');
        if(box) {
            const div = document.createElement('div');
            let userClass = "msg-other";
            let crownIcon = "";

            // Lógica: Si es Admin, usa la clase Rainbow. Si soy yo normal, usa Self. Si es otro, Other.
            if (m.email === ADMIN_EMAIL) {
                userClass = "msg-artist"; // Esta clase tiene el Rainbow CSS
                crownIcon = "👑 "; 
            } else if (currentUser && m.user === currentUser.displayName) {
                userClass = "msg-self";
            }

            div.className = `msg-bubble ${userClass}`;
            // IMPORTANTE: user-name está separado del mensaje en un span bloque
            div.innerHTML = `<span class="user-name">${crownIcon}${m.user}</span>${m.text}`;
            box.appendChild(div); box.scrollTop = box.scrollHeight;
        }
    });
}

window.loadVideo = (v) => {
    currentVideoId=v.id||"default";
    document.getElementById('video-source').src=v.url;
    document.getElementById('current-title').innerText=v.title;
    document.getElementById('video-description').innerText=v.desc||"";
    document.getElementById('main-video').load();
    db.ref(`stats/${currentVideoId}/likes`).on('value', s=>document.getElementById('likes-count').innerText=s.val()||0);
    loadComments(currentVideoId);
};

function loadComments(vidId) {
    const l=document.getElementById('comments-list');
    db.ref(`comments/${vidId}`).on('value', s => {
        if(!l) return; l.innerHTML=""; document.getElementById('comments-count-btn').innerText=s.numChildren();
        if(s.val()) Object.entries(s.val()).reverse().forEach(([key, val]) => {
            let reps = ""; if(val.replies) Object.values(val.replies).forEach(r => reps += `<div class="sub-reply"><b>${r.user}:</b> ${r.text}</div>`);
            const div = document.createElement('div'); div.className = "comment-block";
            div.innerHTML = `<div><b style="color:var(--accent)">${val.user}:</b> ${val.text}</div>
                <div class="comment-actions"><button class="btn-action-mini" onclick="window.darLikeComentario('${key}')">❤️ ${val.likes || 0}</button><button class="btn-action-mini" onclick="window.mostrarReply('${key}')">Responder</button></div>
                <div id="replies-${key}">${reps}</div>
                <div id="reply-box-${key}" class="reply-input-box"><input type="text" id="input-${key}"><button onclick="window.enviarRespuesta('${key}')">></button></div>`;
            l.appendChild(div);
        });
    });
}

window.enviarComentario = () => {
    const i=document.getElementById('comment-text'); if(!currentUser||!i.value) return alert("Inicia sesión");
    db.ref(`comments/${currentVideoId}`).push({user:currentUser.displayName, text:i.value, likes:0}); i.value="";
};
window.darLikeComentario = (key) => db.ref(`comments/${currentVideoId}/${key}/likes`).transaction(c => (c||0)+1);
window.mostrarReply = (key) => { const b = document.getElementById(`reply-box-${key}`); b.style.display = (b.style.display === 'flex') ? 'none' : 'flex'; };
window.enviarRespuesta = (key) => {
    const i = document.getElementById(`input-${key}`); if(!currentUser||!i.value) return;
    db.ref(`comments/${currentVideoId}/${key}/replies`).push({ user: currentUser.displayName, text: i.value });
    i.value = ""; document.getElementById(`reply-box-${key}`).style.display = 'none';
};
window.darLike = () => { if(currentVideoId) db.ref(`stats/${currentVideoId}/likes`).transaction(c=>(c||0)+1); };
window.toggleLiveChat=()=>{const w=document.getElementById('live-chat-window'); w.style.display=(w.style.display==='flex')?'none':'flex';};
window.toggleComments=()=>{const c=document.getElementById('comments-wrapper'); c.style.display=(c.style.display==='none')?'block':'none';};
window.enviarMensajeChat=()=>{
    const i=document.getElementById('chat-input-msg'); if(!i.value) return;
    // Envía email para verificar admin
    const email = currentUser ? currentUser.email : "";
    const user = currentUser ? currentUser.displayName : "Anon";
    db.ref('chat_global').push({user, email, text:i.value, timestamp:Date.now()}); 
    i.value="";
};
auth.onAuthStateChanged(u => {
    currentUser=u; document.body.classList.toggle('is-vip', !!u);
    if(u) { document.getElementById('display-name').innerText=u.displayName; document.getElementById('profile-preview').src=u.photoURL||"assets/logo192.png"; document.getElementById('btn-login-profile').style.display='none'; document.getElementById('btn-logout-profile').style.display='block'; document.getElementById('profile-editor').style.display='block'; }
});
window.loginGoogle=()=>auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
window.cerrarSesion=()=>auth.signOut().then(()=>location.reload());
window.showPage=(id,el)=>{
    document.querySelectorAll('.app-page').forEach(p=>p.classList.remove('active'));
    document.querySelectorAll('.v-item').forEach(v=>v.classList.remove('active'));
    document.getElementById(id).classList.add('active'); if(el) el.classList.add('active');
    if(window.innerWidth<900) window.toggleMenu();
};
window.toggleMenu=()=>{document.getElementById('sidebar').classList.toggle('open'); document.getElementById('mobile-overlay').classList.toggle('open');};