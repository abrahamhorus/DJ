// CONFIGURACIÓN FIREBASE
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

const ADMIN_EMAIL = "abrahorus@gmail.com";
const audioGlobal = new Audio();
const soundTortuga = new Audio("assets/tortuga.mp3");
let currentSongUrl="", progressInterval=null, currentUser=null, currentVideoId=null;

window.onload = () => {
    loadVideo({ id: "v_init", title: "DESPIERTO (Oficial)", desc: "Video Oficial", url: "https://res.cloudinary.com/dmwxi5gkf/video/upload/v1766804153/video_web_pro_fgjwjs.mp4", poster: "assets/shot 1.jpeg" });
    initApp();
};

function initApp() {
    // Videos
    db.ref('social/videos').on('value', s => {
        const g=document.getElementById('videos-grid'); if(g) g.innerHTML="";
        if(s.val()) Object.entries(s.val()).reverse().forEach(([k,v]) => {
            const c=document.createElement('div'); c.className="code-card"; c.onclick=()=>loadVideo({id:k,...v});
            c.innerHTML=`<div class="card-thumb"><img src="${v.poster}" onerror="this.src='assets/logo192.png'"></div><div class="card-text">${v.title}</div>`;
            g.appendChild(c);
        });
    });
    // Música
    db.ref('social/musics').on('value', s => {
        const l=document.getElementById('music-list'); if(l) l.innerHTML="";
        if(s.val()) Object.entries(s.val()).reverse().forEach(([k,m]) => {
            const bId=`b-${k}`, pId=`p-${k}`, tId=`t-${k}`;
            const d=document.createElement('div'); d.className="music-item-pro";
            d.innerHTML=`<div style="display:flex; justify-content:space-between; align-items:center;"><div><span style="display:block; font-weight:bold; color:#fff;">${m.title}</span></div><button id="${bId}" onclick="controlAudio('${m.url}','${bId}','${pId}','${tId}')" class="btn-code">▶ PLAY</button></div><div class="progress-container"><div id="${pId}" class="progress-bar-fill"></div></div><span id="${tId}" style="font-size:0.7rem; color:#666; display:block; margin-top:5px;">0:00 / 0:00</span>`;
            l.appendChild(d);
        });
    });
    // Fotos
    db.ref('social/photos').on('value', s => {
        const g=document.getElementById('photos-grid'); if(g) g.innerHTML="";
        if(s.val()) Object.entries(s.val()).reverse().forEach(([k,p]) => {
            const d=document.createElement('div'); d.className="code-card";
            d.innerHTML=`<img src="${p.url}" style="width:100%; display:block;" onclick="window.open('${p.url}')"><div class="card-text">${p.title}</div>`;
            g.appendChild(d);
        });
    });
    // Eventos
    db.ref('social/events').on('value', s => {
        const g=document.getElementById('events-list'); if(g) g.innerHTML="";
        if(s.val()) Object.entries(s.val()).reverse().forEach(([k,e]) => {
             const d=document.createElement('div'); d.className="code-card"; d.style.padding="20px";
             d.innerHTML=`<h3 style="color:#ff00ff; margin-bottom:5px;">${e.title}</h3><p style="color:#ccc;">${e.desc}</p>`;
             g.appendChild(d);
        });
    });
    // Chat
    db.ref('chat_global').limitToLast(30).on('child_added', s => {
        const m=s.val(), b=document.getElementById('chat-global-msgs');
        if(b) {
            const d=document.createElement('div'); d.className="msg-bubble";
            if(m.email===ADMIN_EMAIL) { d.classList.add('msg-artist'); if(Date.now()-m.timestamp<10000) soundTortuga.play().catch(()=>{}); }
            d.innerHTML=`<small style="color:var(--accent); font-weight:bold;">${m.user}</small><br>${m.text}`;
            b.appendChild(d); b.scrollTop=b.scrollHeight;
        }
    });
}

// PLAYER
window.loadVideo = (v) => {
    if(currentVideoId) { db.ref(`stats/${currentVideoId}/likes`).off(); db.ref(`comments/${currentVideoId}`).off(); }
    currentVideoId=v.id||"default";
    const vid=document.getElementById('main-video');
    document.getElementById('video-source').src=v.url;
    document.getElementById('current-title').innerText=v.title;
    document.getElementById('video-description').innerText=v.desc||"";
    vid.load(); vid.play().catch(()=>{});
    db.ref(`stats/${currentVideoId}/likes`).on('value', s=>document.getElementById('likes-count').innerText=s.val()||0);
    loadComments(currentVideoId);
};

// AUDIO
window.controlAudio = (url,bId,pId,tId) => {
    const btn=document.getElementById(bId), bar=document.getElementById(pId), txt=document.getElementById(tId);
    if(currentSongUrl===url) {
        if(!audioGlobal.paused) { audioGlobal.pause(); btn.innerText="▶ PLAY"; clearInterval(progressInterval); }
        else { audioGlobal.play(); btn.innerText="⏸ PAUSA"; progressInterval=setInterval(()=>updTime(bar,txt),500); }
        return;
    }
    clearInterval(progressInterval); document.querySelectorAll('.progress-bar-fill').forEach(b=>b.style.width="0%");
    document.querySelectorAll('[id^="b-"]').forEach(b=>b.innerText="▶ PLAY");
    audioGlobal.src=url; audioGlobal.play(); currentSongUrl=url;
    btn.innerText="⏸ PAUSA"; progressInterval=setInterval(()=>updTime(bar,txt),500);
};
function updTime(bar,txt) { if(audioGlobal.duration) { bar.style.width=((audioGlobal.currentTime/audioGlobal.duration)*100)+"%"; txt.innerText=Math.floor(audioGlobal.currentTime)+"s"; } }

// COMENTARIOS
function loadComments(vidId) {
    const l=document.getElementById('comments-list');
    db.ref(`comments/${vidId}`).on('value', s => {
        if(!l) return; l.innerHTML=""; document.getElementById('comments-count-btn').innerText=s.numChildren();
        if(s.val()) Object.values(s.val()).reverse().forEach(v => {
            const d=document.createElement('div'); d.className="comment-block";
            d.innerHTML=`<b style="color:var(--accent)">${v.user}:</b> ${v.text}`;
            l.appendChild(d);
        });
    });
}
window.enviarComentario = () => {
    const i=document.getElementById('comment-text'); if(!currentUser||!i.value) return alert("Inicia sesión");
    db.ref(`comments/${currentVideoId}`).push({user:currentUser.displayName, text:i.value}); i.value="";
};
window.darLike = () => { if(currentVideoId) db.ref(`stats/${currentVideoId}/likes`).transaction(c=>(c||0)+1); };

// ADMIN & PERFIL
window.adminUpload = () => {
    if(!currentUser||currentUser.email!==ADMIN_EMAIL) return;
    const t=document.getElementById('adm-type').value, data={
        title:document.getElementById('adm-title').value, desc:document.getElementById('adm-desc').value,
        url:document.getElementById('adm-url').value, poster:document.getElementById('adm-thumb').value, timestamp:Date.now()
    };
    if(!data.title||!data.url) return alert("Faltan datos");
    db.ref(`social/${t}s`).push(data).then(()=>{alert("Publicado"); document.querySelectorAll('input,textarea').forEach(i=>i.value="");});
};
window.guardarPerfil = () => {
    const n=document.getElementById('edit-name').value, p=document.getElementById('edit-photo').value;
    if(currentUser) currentUser.updateProfile({displayName:n||currentUser.displayName, photoURL:p||currentUser.photoURL}).then(()=>location.reload());
};

// AUTH & NAV
auth.onAuthStateChanged(u => {
    currentUser=u; document.body.classList.toggle('is-vip', !!u);
    if(u) {
        document.getElementById('display-name').innerText=u.displayName;
        document.getElementById('profile-preview').src=u.photoURL||"assets/logo192.png";
        document.getElementById('btn-login-profile').style.display='none';
        document.getElementById('btn-logout-profile').style.display='block';
        document.getElementById('profile-editor').style.display='block';
        if(u.email===ADMIN_EMAIL) {
            document.getElementById('user-rank').innerText="👑 ADMIN";
            const nav=document.getElementById('main-nav');
            if(!document.getElementById('nav-admin')) {
                const d=document.createElement('div'); d.id="nav-admin"; d.className="v-item"; d.style.color="#ff00ff";
                d.innerHTML="⚡ SISTEMA"; d.onclick=()=>window.showPage('p-admin',d); nav.appendChild(d);
            }
        }
    } else {
        document.getElementById('display-name').innerText="INVITADO";
        document.getElementById('btn-login-profile').style.display='block';
        document.getElementById('btn-logout-profile').style.display='none';
        document.getElementById('profile-editor').style.display='none';
    }
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
window.toggleLiveChat=()=>{const w=document.getElementById('live-chat-window'); w.style.display=(w.style.display==='flex')?'none':'flex';};
window.toggleComments=()=>{const c=document.getElementById('comments-wrapper'); c.style.display=(c.style.display==='none')?'block':'none';};
window.enviarMensajeChat=()=>{
    const i=document.getElementById('chat-input-msg'); if(!i.value) return;
    db.ref('chat_global').push({user:currentUser?currentUser.displayName:"Anon", email:currentUser?currentUser.email:"", text:i.value, timestamp:Date.now()});
    i.value="";
};