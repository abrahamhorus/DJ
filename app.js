const firebaseConfig = { apiKey: "AIzaSyBiDImq0GMse8SOePAH-3amtmopBRO8wGA", authDomain: "abrahamhorus1996.firebaseapp.com", databaseURL: "https://abrahamhorus1996-default-rtdb.firebaseio.com", projectId: "abrahamhorus1996", storageBucket: "abrahamhorus1996.firebasestorage.app", messagingSenderId: "1002882996128", appId: "1:1002882996128:web:231c5eb841f3bec4a336c5" };
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database(), auth = firebase.auth();
const ADMIN_EMAIL = "abrahorus@gmail.com";

// ESTADO GLOBAL
let currentVideoId="default", currentUser=null, currentSongUrl="";
let audioGlobal=new Audio(); audioGlobal.crossOrigin = "anonymous";
let audioContext, analyser, dataArray, canvasCtx, isAudioInit = false;

// SFX SINTETIZADOS (Sin archivos externos)
const playSound = (type) => {
    if(!isAudioInit && type !== 'init') return;
    try {
        const ctx = audioContext || new (window.AudioContext||window.webkitAudioContext)();
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        if(type==='hover') { osc.frequency.value=400; gain.gain.value=0.05; osc.start(); osc.stop(ctx.currentTime+0.05); }
        if(type==='click') { osc.frequency.value=600; gain.gain.value=0.1; osc.start(); osc.stop(ctx.currentTime+0.1); }
        if(type==='success') { osc.frequency.setValueAtTime(440, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime+0.3); gain.gain.value=0.1; osc.start(); osc.stop(ctx.currentTime+0.3); }
    } catch(e){}
};

window.onload = () => {
    loadVideo({ id: "v_init", title: "DESPIERTO (Oficial)", desc: "Video Oficial", url: "https://res.cloudinary.com/dmwxi5gkf/video/upload/v1766804153/video_web_pro_fgjwjs.mp4", poster: "assets/shot 1.jpeg" });
    initApp();
    handleHash(); // Navegación persistente
    
    // Iniciar contexto de audio con primer clic (necesario por politicas de navegador)
    document.body.addEventListener('click', () => {
        if(!isAudioInit) { initAudioSystem(); isAudioInit=true; }
    }, {once:true});
};

// VISUALIZADOR DE AUDIO
function initAudioSystem() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaElementSource(audioGlobal);
    analyser = audioContext.createAnalyser();
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    
    const canvas = document.getElementById("audio-visualizer");
    canvasCtx = canvas.getContext("2d");
    
    function resize() { canvas.width = window.innerWidth; canvas.height = 60; }
    window.addEventListener('resize', resize); resize();

    function draw() {
        requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);
        canvasCtx.fillStyle = 'rgba(5, 5, 5, 0.2)'; // Trail effect
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let barHeight; let x = 0;
        
        for(let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] / 4; // Escala
            canvasCtx.fillStyle = `rgb(0, ${barHeight + 100}, 136)`; // Verde Matrix
            canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }
    draw();
}

// NAVEGACION POR HASH
window.navigate = (pageId) => {
    playSound('click');
    window.location.hash = pageId;
    updateNavUI(pageId);
};
window.addEventListener('hashchange', handleHash);
function handleHash() {
    const pageId = window.location.hash.substring(1) || 'p-videos';
    updateNavUI(pageId);
}
function updateNavUI(id) {
    document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
    const el = document.getElementById(id);
    if(el) el.classList.add('active');
    
    document.querySelectorAll('.v-item').forEach(v => {
        v.classList.remove('active');
        if(v.dataset.target === id) v.classList.add('active');
    });
    if(window.innerWidth<900 && document.getElementById('sidebar').classList.contains('open')) window.toggleMenu();
}

function initApp() {
    // Escuchar cambios en DB
    db.ref('social/videos').on('value', s => {
        const g=document.getElementById('videos-grid'); if(g) g.innerHTML="";
        if(s.val()) Object.entries(s.val()).reverse().forEach(([k,v]) => {
            const c=document.createElement('div'); c.className="code-card"; c.onclick=()=>loadVideo({id:k,...v});
            // Lazy loading agregado
            c.innerHTML=`<div class="card-thumb"><img src="${v.poster}" loading="lazy" onerror="this.src='assets/logo192.png'"></div><div class="card-text">${v.title}</div>`;
            g.appendChild(c);
        });
    });
    db.ref('social/musics').on('value', s => {
        const l=document.getElementById('music-list'); if(l) l.innerHTML="";
        if(s.val()) Object.entries(s.val()).reverse().forEach(([k,m]) => {
            const bId=`b-${k}`, pId=`p-${k}`, tId=`t-${k}`;
            const d=document.createElement('div'); d.className="music-item-pro";
            d.innerHTML=`<div style="display:flex; justify-content:space-between; align-items:center;"><div><span style="display:block; font-weight:bold; color:#fff;">${m.title}</span></div><button id="${bId}" onclick="controlAudio('${m.url}','${bId}','${pId}','${tId}')" class="btn-code">▶ PLAY</button></div><div class="progress-container"><div id="${pId}" class="progress-bar-fill"></div></div><span id="${tId}" style="font-size:0.7rem; color:#666; display:block; margin-top:5px;">0:00 / 0:00</span>`;
            l.appendChild(d);
        });
    });

    // CHAT (Optimizado)
    db.ref('chat_global').limitToLast(30).on('child_added', s => {
        const m = s.val(), box = document.getElementById('chat-global-msgs');
        if(box) {
            const div = document.createElement('div');
            let cssClass = "msg-other"; let icon = "";
            if(m.email === ADMIN_EMAIL) { cssClass = "msg-artist"; icon = "👑 "; } 
            else if (currentUser && m.user === currentUser.displayName) { cssClass = "msg-self"; }
            div.className = "msg-bubble " + cssClass;
            div.innerHTML = `<small>${icon}${m.user}</small>${m.text}`;
            box.appendChild(div); box.scrollTop = box.scrollHeight;
        }
    });
}

// VIDEO PLAYER
window.loadVideo = (v) => {
    playSound('click');
    currentVideoId=v.id||"default";
    document.getElementById('video-source').src=v.url;
    document.getElementById('current-title').innerText=v.title;
    document.getElementById('video-description').innerText=v.desc||"";
    document.getElementById('main-video').load();
    db.ref(`stats/${currentVideoId}/likes`).on('value', s=>document.getElementById('likes-count').innerText=s.val()||0);
    loadComments(currentVideoId);
    window.scrollTo({top:0, behavior:'smooth'});
};

// AUDIO PLAYER CON VISUALIZER LINK
window.controlAudio = (url,bId,pId,tId) => {
    playSound('click');
    if(!isAudioInit) { initAudioSystem(); isAudioInit=true; }
    if(audioContext && audioContext.state === 'suspended') audioContext.resume();

    const btn=document.getElementById(bId), bar=document.getElementById(pId), txt=document.getElementById(tId);
    if(currentSongUrl===url) {
        if(!audioGlobal.paused) { audioGlobal.pause(); btn.innerText="▶ PLAY"; clearInterval(progressInterval); }
        else { audioGlobal.play(); btn.innerText="⏸ PAUSA"; progressInterval=setInterval(()=>updTime(bar,txt),500); }
        return;
    }
    clearInterval(progressInterval); document.querySelectorAll('.progress-bar-fill').forEach(b=>b.style.width="0%");
    document.querySelectorAll('[id^="b-"]').forEach(b=>b.innerText="▶ PLAY");
    audioGlobal.src=url; 
    audioGlobal.play().catch(e => showToast("Error reproducción: Interacción requerida"));
    currentSongUrl=url;
    btn.innerText="⏸ PAUSA"; progressInterval=setInterval(()=>updTime(bar,txt),500);
    showToast("Reproduciendo: Track Iniciado");
};
function updTime(bar,txt) { if(audioGlobal.duration) { bar.style.width=((audioGlobal.currentTime/audioGlobal.duration)*100)+"%"; txt.innerText=Math.floor(audioGlobal.currentTime)+"s"; } }

function loadComments(vidId) {
    const list = document.getElementById('comments-list');
    db.ref(`comments/${vidId}`).on('value', s => {
        if(!list) return; list.innerHTML = ""; document.getElementById('comments-count-btn').innerText = s.numChildren();
        if(s.val()) Object.entries(s.val()).reverse().forEach(([key, val]) => {
            let reps = ""; if(val.replies) Object.values(val.replies).forEach(r => reps += `<div class="sub-reply"><b>${r.user}:</b> ${r.text}</div>`);
            const div = document.createElement('div'); div.className = "comment-block";
            div.innerHTML = `<div><b style="color:var(--accent)">${val.user}:</b> ${val.text}</div>
                <div class="comment-actions"><button class="btn-action-mini" onclick="window.darLikeComentario('${key}')">❤️ ${val.likes || 0}</button><button class="btn-action-mini" onclick="window.mostrarReply('${key}')">Responder</button></div>
                <div id="replies-${key}">${reps}</div>
                <div id="reply-box-${key}" class="reply-input-box"><input type="text" id="input-${key}"><button onclick="window.enviarRespuesta('${key}')">></button></div>`;
            list.appendChild(div);
        });
    });
}

// SISTEMA DE GAMIFICACIÓN (XP)
function addXP(amount) {
    if(!currentUser) return;
    const ref = db.ref(`users/${currentUser.uid}/xp`);
    ref.transaction(c => (c||0) + amount);
    // Verificar si sube de nivel (cada 100xp)
    ref.once('value', s => {
        const xp = s.val() || 0;
        const level = Math.floor(xp/100) + 1;
        db.ref(`users/${currentUser.uid}/level`).set(level);
    });
}

window.enviarComentario = () => {
    const i=document.getElementById('comment-text'); if(!currentUser||!i.value) return showToast("Debes iniciar sesión");
    db.ref(`comments/${currentVideoId}`).push({user:currentUser.displayName, text:i.value, likes:0}); 
    i.value="";
    addXP(10); // 10 XP por comentario
    showToast("Comentario enviado (+10 XP)");
    playSound('success');
};
window.darLikeComentario = (key) => {
    db.ref(`comments/${currentVideoId}/${key}/likes`).transaction(c => (c||0)+1);
    addXP(2);
};
window.darLike = () => { 
    if(currentVideoId) {
        db.ref(`stats/${currentVideoId}/likes`).transaction(c=>(c||0)+1);
        addXP(5);
        showToast("Te gusta este video (+5 XP)");
        playSound('success');
    }
};

window.mostrarReply = (key) => { const b = document.getElementById(`reply-box-${key}`); b.style.display = (b.style.display === 'flex') ? 'none' : 'flex'; };
window.enviarRespuesta = (key) => {
    const i = document.getElementById(`input-${key}`); if(!currentUser||!i.value) return;
    db.ref(`comments/${currentVideoId}/${key}/replies`).push({ user: currentUser.displayName, text: i.value });
    i.value = ""; document.getElementById(`reply-box-${key}`).style.display = 'none';
    addXP(5);
};
window.toggleLiveChat=()=>{const w=document.getElementById('live-chat-window'); w.style.display=(w.style.display==='flex')?'none':'flex'; playSound('click');};
window.toggleComments=()=>{const c=document.getElementById('comments-wrapper'); c.style.display=(c.style.display==='none')?'block':'none'; playSound('click');};
window.enviarMensajeChat=()=>{
    const i=document.getElementById('chat-input-msg'); if(!i.value) return;
    const email = currentUser ? currentUser.email : "anon";
    db.ref('chat_global').push({user:currentUser?currentUser.displayName:"Anon", email:email, text:i.value, timestamp:Date.now()}); 
    i.value="";
};

// AUTH & PROFILE
auth.onAuthStateChanged(u => {
    currentUser=u; document.body.classList.toggle('is-vip', !!u);
    if(u) { 
        document.getElementById('display-name').innerText=u.displayName; 
        document.getElementById('profile-preview').src=u.photoURL||"assets/logo192.png"; 
        document.getElementById('btn-login-profile').style.display='none'; 
        document.getElementById('btn-logout-profile').style.display='block'; 
        document.getElementById('profile-editor').style.display='block';
        document.getElementById('xp-container').style.display='block';
        
        // Cargar XP del usuario
        db.ref(`users/${u.uid}`).on('value', s => {
            const d = s.val() || {};
            const xp = d.xp || 0;
            const lvl = Math.floor(xp/100) + 1;
            document.getElementById('user-level').innerText = lvl;
            document.getElementById('user-xp-text').innerText = `${xp} XP`;
            const progress = xp % 100; // Porcentaje para el siguiente nivel
            document.getElementById('xp-bar-fill').style.width = `${progress}%`;
        });
        showToast(`Bienvenido, ${u.displayName}`);
    }
});

// SYSTEM UTILS
window.showToast = (msg) => {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div'); t.className = 'toast-msg';
    t.innerHTML = `<span>⚡</span> ${msg}`;
    c.appendChild(t);
    setTimeout(() => { t.style.animation = 'fadeOut 0.3s forwards'; setTimeout(()=>t.remove(), 300); }, 3000);
};
window.loginGoogle=()=>auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
window.cerrarSesion=()=>auth.signOut().then(()=>location.reload());
window.toggleMenu=()=>{document.getElementById('sidebar').classList.toggle('open'); document.getElementById('mobile-overlay').classList.toggle('open'); playSound('click');};

window.adminUpload = () => {
    if(!currentUser||currentUser.email!==ADMIN_EMAIL) return showToast("Acceso denegado");
    const t=document.getElementById('adm-type').value, data={title:document.getElementById('adm-title').value, desc:document.getElementById('adm-desc').value, url:document.getElementById('adm-url').value, poster:document.getElementById('adm-thumb').value, timestamp:Date.now()};
    if(!data.title||!data.url) return showToast("Faltan datos");
    db.ref(`social/${t}s`).push(data).then(()=>{showToast("Contenido publicado con éxito"); document.querySelectorAll('input,textarea').forEach(i=>i.value="");});
};
window.guardarPerfil = () => {
    const n=document.getElementById('edit-name').value, p=document.getElementById('edit-photo').value;
    if(currentUser) currentUser.updateProfile({displayName:n||currentUser.displayName, photoURL:p||currentUser.photoURL}).then(()=>location.reload());
};