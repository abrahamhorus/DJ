const firebaseConfig = { apiKey: "AIzaSyBiDImq0GMse8SOePAH-3amtmopBRO8wGA", 
    authDomain: "abrahamhorus1996.firebaseapp.com", 
    databaseURL: "https://abrahamhorus1996-default-rtdb.firebaseio.com", 
    projectId: "abrahamhorus1996", storageBucket: "abrahamhorus1996.firebasestorage.app", 
    messagingSenderId: "1002882996128", 
    appId: "1:1002882996128:web:231c5eb841f3bec4a336c5" };
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database(), auth = firebase.auth();
const ADMIN_EMAIL = "abrahorus@gmail.com";

// === ESTADO GLOBAL ===
let currentVideoId = "default", currentUser = null;
let audioGlobal = new Audio(); // Audio limpio
let playlist = []; // Array de canciones
let currentTrackIndex = -1; // Índice actual
let progressInterval; // Intervalo de la barra
let isAudioInit = false; // Estado de interacción
let currentVideoRefs = []; // Referencias activas de Firebase para limpieza
let currentCommentRefs = []; // Referencias de comentarios para limpieza independiente

// Global AudioContext instance
let audioCtx = null;

// Function to initialize/resume AudioContext on first user interaction
function initOrResumeAudioContext() {
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn("AudioContext not supported or could not be created:", e);
            return;
        }
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
            console.log("AudioContext resumed successfully.");
        }).catch(e => console.error("Error resuming AudioContext:", e));
    }
}
// Attach this function to common user interaction events, but only once.
document.addEventListener('click', initOrResumeAudioContext, { once: true });
document.addEventListener('keydown', initOrResumeAudioContext, { once: true });
document.addEventListener('touchstart', initOrResumeAudioContext, { once: true });

// === FUNCIONES AUXILIARES ===
// Helper para limitar vistas a una cada 24h por video (usando localStorage)
function canIncrementView(videoId) {
    const lastViewTimestamp = localStorage.getItem(`viewed_${videoId}`);
    const now = Date.now();
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000; // 24 horas en milisegundos

    if (!lastViewTimestamp) {
        return true; // No hay registro, es una nueva vista
    }

    const lastView = parseInt(lastViewTimestamp, 10);
    if (isNaN(lastView) || (now - lastView > TWENTY_FOUR_HOURS_MS)) {
        return true; // El registro está corrupto o han pasado más de 24 horas
    }

    return false; // Ya se vio en las últimas 24 horas
}

// === EFECTO RESPLANDOR DORADO AL DAR LIKE ===
function spawnGlows(element) {
    const rect = element.getBoundingClientRect();
    // Calculamos el centro del botón considerando el scroll
    const centerX = rect.left + window.scrollX + rect.width / 2;
    const centerY = rect.top + window.scrollY + rect.height / 2;
    const numGlows = 5; // Número de resplandores a generar

    for (let i = 0; i < numGlows; i++) {
        const glow = document.createElement('div');
        glow.className = 'glow-effect';
        document.body.appendChild(glow);

        // Posición inicial aleatoria alrededor del centro del botón para un efecto disperso
        const startX = centerX + (Math.random() - 0.5) * rect.width * 0.7;
        const startY = centerY + (Math.random() - 0.5) * rect.height * 0.7;

        glow.style.left = `${startX}px`;
        glow.style.top = `${startY}px`;
        
        // Animación con retraso y dirección aleatoria
        const delay = Math.random() * 0.1; // Retraso de hasta 0.1s
        const duration = 0.8 + Math.random() * 0.5; // Duración entre 0.8s y 1.3s
        const endXOffset = (Math.random() - 0.5) * 150; // Se mueve horizontalmente más
        const endYOffset = -70 - Math.random() * 80; // Se mueve hacia arriba más

        glow.style.setProperty('--glow-end-x', `${endXOffset}px`);
        glow.style.setProperty('--glow-end-y', `${endYOffset}px`);
        glow.style.animation = `glow-fade-out ${duration}s ease-out ${delay}s forwards`;

        // Eliminar el resplandor después de que termine su animación
        glow.addEventListener('animationend', () => glow.remove());
    }
}

// === EFECTO CONFETI ===
function spawnConfetti() {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'];
    for (let i = 0; i < 100; i++) {
        const div = document.createElement('div');
        div.className = 'confetti';
        div.style.left = Math.random() * 100 + 'vw';
        div.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        div.style.animationDuration = (Math.random() * 2 + 3) + 's';
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 5000);
    }
}

// === SFX (EFECTOS DE SONIDO) ===
const playSound = (type) => {
    // Only attempt to play sound if audioCtx is initialized and running
    if (!audioCtx || audioCtx.state !== 'running') {
        console.log("AudioContext is not running, sound will not play until user interaction.");
        return;
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if(type==='hover') { osc.frequency.value=400; gain.gain.value=0.05; osc.start(); osc.stop(audioCtx.currentTime+0.05); }
    if(type==='click') { osc.frequency.value=600; gain.gain.value=0.1; osc.start(); osc.stop(audioCtx.currentTime+0.1); }
    if(type==='success') { osc.frequency.setValueAtTime(440, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime+0.3); gain.gain.value=0.1; osc.start(); osc.stop(audioCtx.currentTime+0.3); }
};
window.onload = () => {
    // Carga inicial
    loadVideo({ id: "v_init", title: "Despierto (Video Musical Oficial)", desc: "Primer video oficial del artista Abraham Horus, superación de una crisis, llegando a la muerte y renaciendo con una fuerza de voluntad inquebrantable logrando la iluminación de cuerpo y alma. 👑", url: "https://res.cloudinary.com/dmwxi5gkf/video/upload/v1766804153/video_web_pro_fgjwjs.mp4", poster: "assets/shot 1.jpeg" });
    initApp();
    handleHash(); 

    // === LÓGICA PARA CONTAR VIEWS AL REPRODUCIR VIDEO ===
    const mainVideo = document.getElementById('main-video');
    if (mainVideo) {
        mainVideo.addEventListener('play', () => {
            console.log("Evento 'play' detectado en el video principal."); // Para confirmar que el evento se dispara
            console.log("currentVideoId al intentar incrementar:", currentVideoId); // Para ver el ID del video
            if (currentVideoId && currentVideoId !== "default") {
                if (canIncrementView(currentVideoId)) { // Solo incrementa si no se ha visto en 24h
                    db.ref(`stats/${currentVideoId}/views`).transaction(currentViews => {
                        console.log(`Incrementando vistas para el video ${currentVideoId}. Vistas actuales: ${currentViews || 0}`);
                        return (currentViews || 0) + 1; // Incrementa el contador de vistas
                    }).then(() => {
                        localStorage.setItem(`viewed_${currentVideoId}`, Date.now().toString()); // Guarda el timestamp de la vista
                        console.log(`Vista registrada para ${currentVideoId}. Timestamp actualizado en localStorage.`);
                    }).catch(error => {
                        console.error("🚨 Error al incrementar el contador de vistas en Firebase:", error);
                        showToast("⚠️ Error al contar la vista. Revisa la consola."); // Notificación al usuario
                    });
                } else {
                    console.log(`Vista para el video ${currentVideoId} no incrementada (ya vista en las últimas 24h).`);
                }
            }
        });
    }
};
// === NAVEGACIÓN ===
window.navigate = (pageId) => { 
    playSound('click'); 
    window.location.hash = pageId; 
    updateNavUI(pageId); 
};

window.addEventListener('hashchange', handleHash);

function handleHash() { const pageId = window.location.hash.substring(1) || 'p-videos'; updateNavUI(pageId); }
function updateNavUI(id) {
    // Cerrar todas las ventanas primero (o mantenerlas si quieres multi-ventana, pero por ahora single-focus)
    document.querySelectorAll('.app-view').forEach(p => p.classList.remove('active'));
    
    const el = document.getElementById(id); 
    if(el) el.classList.add('active');
    
    // Actualizar Dock
    document.querySelectorAll('.dock-item').forEach(d => {
        d.classList.remove('active');
        if(d.getAttribute('onclick') && d.getAttribute('onclick').includes(id)) {
            d.classList.add('active');
        }
    });
}

function initApp() {
    // 1. CARGAR VIDEOS
    db.ref('social/videos').on('value', s => {
        const g=document.getElementById('videos-grid'); if(g) g.innerHTML="";
        if(s.val()) Object.entries(s.val()).reverse().forEach(([k,v]) => {
            const c=document.createElement('div'); c.className="code-card"; c.onclick=()=>loadVideo({id:k,...v});
            c.innerHTML=`<div class="card-thumb"><img src="${v.poster}" loading="lazy" onerror="this.src='assets/logo192.png'"></div><div class="card-text">${v.title}</div>`;
            g.appendChild(c);
        });
    });

    // 2. CARGAR MÚSICA (SISTEMA PLAYLIST)
    db.ref('social/musics').on('value', s => {
        // Guardar ID de la canción actual para restaurar el índice tras la actualización
        const currentTrackId = (currentTrackIndex >= 0 && playlist[currentTrackIndex]) ? playlist[currentTrackIndex].id : null;
        
        playlist = []; // Limpiar playlist
        const listDiv = document.getElementById('ytm-queue-list');
        if(listDiv) listDiv.innerHTML = "";
        
        if(s.val()) {
            // Convertir DB a Array
            Object.entries(s.val()).reverse().forEach(([k,m]) => {
                playlist.push({ id: k, ...m });
            });
            
            // Restaurar índice correcto si la canción sigue existiendo
            if (currentTrackId) {
                const newIndex = playlist.findIndex(t => t.id === currentTrackId);
                currentTrackIndex = (newIndex !== -1) ? newIndex : -1;
            }
            
            // Renderizar la cola visual
            playlist.forEach((track, index) => {
                const div = document.createElement('div'); 
                div.className = "queue-item";
                // Si esta es la canción sonando, marcarla
                if(index === currentTrackIndex) div.classList.add('active');
                
                div.onclick = () => playTrackIndex(index);
                div.innerHTML = `
                    <img src="${track.poster || 'assets/logo192.png'}" class="queue-thumb">
                    <div class="queue-info">
                        <h4>${track.title}</h4>
                        <span>Abraham Horus</span>
                    </div>
                `;
                listDiv.appendChild(div);
            });

            // Actualizar contador de likes en tiempo real si hay una canción sonando
            if (currentTrackIndex !== -1 && playlist[currentTrackIndex]) {
                const currentTrack = playlist[currentTrackIndex];
                const likeCountEl = document.getElementById('ytm-like-count');
                if (likeCountEl) likeCountEl.innerText = currentTrack.likes || 0;
            }
        }
    });

    // 3. CARGAR FOTOS
    db.ref('social/photos').on('value', s => {
        const g = document.getElementById('photos-grid'); if(!g) return;
        g.innerHTML = "";
        if(s.val()) Object.entries(s.val()).reverse().forEach(([k,v]) => {
            const c = document.createElement('div'); c.className = "code-card";
            c.innerHTML = `<div class="card-thumb"><img src="${v.poster || v.url}" loading="lazy" onerror="this.src='assets/logo192.png'"></div>
                           <div class="card-text">${v.title}</div>`;
            g.appendChild(c);
        });
    });

    // 4. CARGAR EVENTOS
    db.ref('social/events').on('value', s => {
        const g = document.getElementById('events-list'); if(!g) return;
        g.innerHTML = "";
        if(s.val()) Object.entries(s.val()).reverse().forEach(([k,v]) => {
            const c = document.createElement('div'); c.className = "code-card";
            c.innerHTML = `<div class="card-text"><b style="color:var(--accent)">${v.eventDate || 'Próximamente'}</b><br>${v.title}<br><small style="color:#888">${v.desc || ''}</small></div>`;
            g.appendChild(c);
        });
    });

    // 5. CARGAR CHAT
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

    // 6. CONTADOR DE SUBS PRO
    db.ref('stats/global/subs').on('value', s => {
        const target = s.val() || 0;
        const el = document.getElementById('global-subs-count');
        if(el) animateValue("global-subs-count", parseInt(el.innerText) || 0, target, 1500);
    });
}

// === LOGICA REPRODUCTOR YOUTUBE MUSIC ===

window.playTrackIndex = (index) => {
    if(index < 0 || index >= playlist.length) return;
    
    currentTrackIndex = index;
    const track = playlist[index];
    
    // UI Updates
    const cover = document.getElementById('ytm-cover');
    if(cover) cover.src = track.poster || 'assets/logo192.png';
    document.getElementById('ytm-title').innerText = track.title;
    document.getElementById('ytm-artist').innerText = "Abraham Horus";
    
    // Cargar Likes y Letra
    document.getElementById('ytm-like-count').innerText = track.likes || 0;
    const lyricsBox = document.getElementById('lyrics-text');
    if(lyricsBox) lyricsBox.innerText = track.desc || "No hay letra disponible.";
    
    // Resaltar en cola
    document.querySelectorAll('.queue-item').forEach((el, i) => {
        el.classList.toggle('active', i === index);
    });

    playAudioFile(track.url);
    updateMusicLikeButtonState(); // ¡NUEVO! Actualizar el estado del botón de like de música
};

function playAudioFile(url) {
    audioGlobal.src = url;
    audioGlobal.volume = 1.0;
    audioGlobal.load(); // Aseguramos que el navegador cargue la nueva fuente

    audioGlobal.play()
    .then(() => {
        document.getElementById('ytm-play-btn').innerText = "⏸";
        document.getElementById('ytm-card').classList.add('playing');
        startProgressLoop();
        showToast("Reproduciendo...");
    }).catch(e => {
        console.error("Error al intentar reproducir audio:", e);
        if (e.name === "NotAllowedError" || e.name === "AbortError") {
            showToast("⚠️ El navegador bloqueó la reproducción automática. Haz clic para reproducir.");
        } else {
            showToast("⚠️ Error de reproducción (Revisa el link o la consola).");
        }
        document.getElementById('ytm-play-btn').innerText = "▶"; // Asegurar que el botón muestre "Play"
        document.getElementById('ytm-card').classList.remove('playing'); // Quitar estado de "playing"
    });
}

window.togglePlay = () => {
    if(playlist.length === 0) return;
    if(currentTrackIndex === -1) { playTrackIndex(0); return; }

    if(audioGlobal.paused) {
        audioGlobal.play();
        document.getElementById('ytm-play-btn').innerText = "⏸";
        document.getElementById('ytm-card').classList.add('playing');
    } else {
        audioGlobal.pause();
        document.getElementById('ytm-play-btn').innerText = "▶";
        document.getElementById('ytm-card').classList.remove('playing');
    }
};

window.nextTrack = () => {
    let next = currentTrackIndex + 1;
    if(next >= playlist.length) next = 0;
    playTrackIndex(next);
};

window.prevTrack = () => {
    let prev = currentTrackIndex - 1;
    if(prev < 0) prev = playlist.length - 1;
    playTrackIndex(prev);
};

// === ACCIONES NUEVAS: LIKE, LETRA, SHARE ===

// === BARRA DE PROGRESO ===
function startProgressLoop() {
    clearInterval(progressInterval);
    progressInterval = setInterval(() => {
        if(audioGlobal.duration) {
            const pct = (audioGlobal.currentTime / audioGlobal.duration) * 100;
            document.getElementById('ytm-progress').style.width = pct + "%";
            document.getElementById('ytm-curr-time').innerText = fmtTime(audioGlobal.currentTime);
            document.getElementById('ytm-dur-time').innerText = fmtTime(audioGlobal.duration);
            
            if(audioGlobal.ended) window.nextTrack();
        }
    }, 500);
}

function fmtTime(s) {
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec < 10 ? '0'+sec : sec}`;
}

window.seekAudio = (e) => {
    if(!audioGlobal.duration) return;
    const bar = e.currentTarget;
    const pct = e.offsetX / bar.clientWidth;
    audioGlobal.currentTime = pct * audioGlobal.duration;
};

// === OTRAS FUNCIONES (VIDEO, COMENTARIOS, XP) ===

window.toggleLiveChat=()=>{ window.navigate('p-chat'); };
window.toggleComments=()=>{const c=document.getElementById('comments-wrapper'); c.style.display=(c.style.display==='none')?'block':'none'; playSound('click');};
window.enviarMensajeChat=()=>{
    const i=document.getElementById('chat-input-msg'); if(!i.value) return;
    const email = currentUser ? currentUser.email : "anon";
    db.ref('chat_global').push({user:currentUser?currentUser.displayName:"Anon", email:email, text:i.value, timestamp:Date.now()}); i.value="";
};
window.showToast = (msg) => {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div'); t.className = 'toast-msg';
    t.innerHTML = `<span>⚡</span> ${msg}`; c.appendChild(t);
    setTimeout(() => { t.style.animation = 'fadeOut 0.3s forwards'; setTimeout(()=>t.remove(), 300); }, 3000);
};

// === AUTH & ADMIN ===
window.loginGoogle=()=>auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
window.cerrarSesion=()=>auth.signOut().then(()=>location.reload());

auth.onAuthStateChanged(u => {
    currentUser=u; document.body.classList.toggle('is-vip', !!u);
    const adminDock = document.getElementById('dock-admin');
    if(adminDock) adminDock.style.display = 'none';

    const videoLikeButton = document.getElementById('video-like-btn');
    if (videoLikeButton) {
        if (u && currentVideoId && currentVideoId !== "default") {
            db.ref(`userLikes/${u.uid}/${currentVideoId}`).once('value')
                .then(snapshot => {
                    if (snapshot.val()) {
                        console.log("onAuthStateChanged: Usuario ya dio like, aplicando clase 'liked'.");
                        videoLikeButton.classList.add('liked');
                    } else {
                        videoLikeButton.classList.remove('liked');
                    }
                })
                .catch(error => {
                    console.error("Error al verificar estado del like en onAuthStateChanged:", error);
                    videoLikeButton.classList.remove('liked'); // Por defecto, no marcado como gustado en caso de error
                });
        } else {
            videoLikeButton.classList.remove('liked');
        }
        updateMusicLikeButtonState(); // Asegurar que el botón de like de música también se actualice
    }

    // Verificar estado de suscripción
    if (u) {
        db.ref(`users/${u.uid}/isSubscribed`).once('value', s => {
            const btn = document.getElementById('btn-subscribe');
            const label = document.getElementById('subs-label');
            if (btn && label && s.val()) {
                btn.classList.add('subscribed');
                label.innerText = "SUSCRITO";
            }
        });
    }

    if(u) { 
        document.getElementById('display-name').innerText=u.displayName; 
        document.getElementById('profile-preview').src=u.photoURL||"assets/logo192.png"; 
        document.getElementById('btn-login-profile').style.display='none'; 
        document.getElementById('btn-logout-profile').style.display='block'; 
        document.getElementById('profile-editor').style.display='block';
        document.getElementById('xp-container').style.display='block';
        
        db.ref(`users/${u.uid}`).on('value', s => {
            const d = s.val() || {}; const xp = d.xp || 0; const lvl = Math.floor(xp/100) + 1;
            document.getElementById('user-level').innerText = lvl;
            document.getElementById('user-xp-text').innerText = `${xp} XP`;
            document.getElementById('xp-bar-fill').style.width = `${xp % 100}%`;
        });
        showToast(`Bienvenido, ${u.displayName}`);

        if(u.email === ADMIN_EMAIL) {
            if(adminDock) adminDock.style.display = 'flex';
            showToast("👑 Modo Admin Activo");
        }
        
        // Recargar comentarios para actualizar permisos de borrado y likes
        if(currentVideoId && currentVideoId !== "default") loadComments(currentVideoId);
    }
});

// === LÓGICA DE SUSCRIPCIÓN ===
window.toggleSub = () => {
    console.log("Intentando toggle de suscripción...");
    if (!currentUser) {
        console.warn("No hay usuario detectado para suscribirse.");
        return showToast("Inicia sesión para suscribirte, mi amor");
    }

    const subRef = db.ref(`users/${currentUser.uid}/isSubscribed`);
    const globalSubsRef = db.ref('stats/global/subs');
    const btn = document.getElementById('btn-subscribe');
    const label = document.getElementById('subs-label');

    subRef.once('value').then(snapshot => {
        const isSubbed = snapshot.val();
        console.log("Estado actual de suscripción:", isSubbed);

        if (isSubbed) {
            // DESUSCRIBIRSE
            Promise.all([
                subRef.set(false),
                globalSubsRef.transaction(c => (c || 0) - 1)
            ]).then(() => {
                if (btn) {
                    btn.classList.remove('subscribed');
                    if(label) label.innerText = "SUSCRIBIRSE";
                }
                showToast("Suscripción cancelada");
            }).catch(err => console.error("Error al desuscribir:", err));
        } else {
            // SUSCRIBIRSE
            Promise.all([
                subRef.set(true),
                globalSubsRef.transaction(c => (c || 0) + 1)
            ]).then(() => {
                if (btn) {
                    btn.classList.add('subscribed');
                    if(label) label.innerText = "SUSCRITO";
                }
                // EFECTO CONFETI Y XP
                spawnConfetti();
                addXP(50);
                showToast("Suscrito (+50 XP) - ¡Gracias!");
                playSound('success');
            }).catch(err => {
                console.error("Error de permisos en Firebase al suscribir:", err);
                showToast("⚠️ Error de permisos en Firebase");
            });
        }
    }).catch(err => {
        console.error("Error al leer la suscripción de la DB:", err);
        showToast("⚠️ Error al conectar con la base de datos");
    });
};

// === ADMIN UPLOAD FORM ===
window.updateAdminForm = () => {
    const type = document.getElementById('adm-type').value;
    const dateField = document.getElementById('field-date-container');
    const urlField = document.getElementById('adm-url');
    if(dateField) dateField.style.display = (type === 'event') ? 'block' : 'none';
    if(urlField) {
        if(type === 'video') urlField.placeholder = "URL del Video (MP4 / Cloudinary)";
        if(type === 'music') urlField.placeholder = "URL del Audio (MP3)";
        if(type === 'photo') urlField.placeholder = "URL de la Imagen";
    }
};

window.adminUpload = () => {
    if(!currentUser || currentUser.email !== ADMIN_EMAIL) return showToast("⛔ Acceso denegado");
    const type = document.getElementById('adm-type').value;
    const title = document.getElementById('adm-title').value;
    const desc = document.getElementById('adm-desc').value;
    const url = document.getElementById('adm-url').value;
    const poster = document.getElementById('adm-thumb').value;
    const dateVal = document.getElementById('adm-date') ? document.getElementById('adm-date').value : "";

    if(!title) return showToast("Falta el título");
    
    const data = { title: title, desc: desc, url: url, poster: poster, timestamp: Date.now() };
    if(type === 'event') {
        if(!dateVal) return showToast("Falta la fecha");
        data.eventDate = dateVal;
    }

    db.ref(`social/${type}s`).push(data)
        .then(() => {
            showToast(`✅ ${type.toUpperCase()} PUBLICADO`);
            playSound('success');
            document.querySelectorAll('.admin-input').forEach(i => i.value = "");
            if(type === 'music') window.navigate('p-musica');
            else window.navigate('p-' + type + 's');
        })
        .catch(error => showToast("Error: " + error.message));
};

window.guardarPerfil = () => {
    const n=document.getElementById('edit-name').value, p=document.getElementById('edit-photo').value;
    if(currentUser) currentUser.updateProfile({displayName:n||currentUser.displayName, photoURL:p||currentUser.photoURL}).then(()=>location.reload());
};

// === HACKER MODE ===
let secretCode = ['m','a','t','r','i','x'], secretPosition = 0;
document.addEventListener('keydown', (e) => {
    if(e.key.toLowerCase() === secretCode[secretPosition]) { secretPosition++; if(secretPosition === secretCode.length) { activarModoMatrix(); secretPosition = 0; } } else { secretPosition = 0; }
});
function activarModoMatrix() {
    playSound('success'); showToast("⚠️ MATRIX MODE ACTIVATED");
    document.documentElement.style.setProperty('--bg-main', '#000');
    document.documentElement.style.setProperty('--text-main', '#00d9ff');
    document.documentElement.style.setProperty('--accent', '#00d9ff');
    document.body.style.fontFamily = "'Courier New', monospace";
}

// === FUNCIONES DE UTILIDAD Y LÓGICA PRINCIPAL ===

function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start).toLocaleString();
        if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
}

function addXP(amount) {
    if(!currentUser) return;
    const ref = db.ref(`users/${currentUser.uid}/xp`);
    ref.transaction(c => (c||0) + amount);
    ref.once('value', s => { const xp = s.val() || 0; const level = Math.floor(xp/100) + 1; db.ref(`users/${currentUser.uid}/level`).set(level); });
}

window.loadVideo = (v) => {
    playSound('click');
    
    // 1. Limpiar listeners anteriores para evitar fugas de memoria y actualizaciones fantasma
    if (currentVideoRefs.length > 0) {
        currentVideoRefs.forEach(ref => ref.off());
        currentVideoRefs = [];
    }

    currentVideoId=v.id||"default";
    const mainVideoElement = document.getElementById('main-video');
    const videoSourceElement = document.getElementById('video-source');
    const videoLikeButton = document.getElementById('video-like-btn'); // Obtenemos el botón de like

    if (videoSourceElement) videoSourceElement.src = v.url;
    const titleEl = document.getElementById('current-title');
    if(titleEl) titleEl.innerText=v.title;
    const descEl = document.getElementById('video-description');
    if(descEl) descEl.innerText=v.desc||"";
    
    if (mainVideoElement) mainVideoElement.load(); // Carga la nueva fuente del video

    // Carga y muestra los likes
    const likesRef = db.ref(`stats/${currentVideoId}/likes`);
    likesRef.on('value', s => { const el = document.getElementById('likes-count'); if(el) el.innerText = s.val() || 0; });
    currentVideoRefs.push(likesRef);

    // Carga y muestra las vistas (se actualizará en tiempo real si cambian)
    const viewsRef = db.ref(`stats/${currentVideoId}/views`);
    viewsRef.on('value', s => { const el = document.getElementById('total-views'); if(el) el.innerText = s.val() || 0; });
    currentVideoRefs.push(viewsRef);

    if (videoLikeButton) {
        if (currentUser && currentVideoId && currentVideoId !== "default") {
            db.ref(`userLikes/${currentUser.uid}/${currentVideoId}`).once('value')
                .then(snapshot => {
                    if (snapshot.val()) {
                        console.log("loadVideo: Usuario ya dio like, aplicando clase 'liked'.");
                        videoLikeButton.classList.add('liked');
                    } else {
                        videoLikeButton.classList.remove('liked');
                    }
                    updateMusicLikeButtonState(); // Actualizar también el botón de like de música
                })
                .catch(error => {
                    console.error("Error al verificar estado del like en loadVideo:", error);
                    videoLikeButton.classList.remove('liked'); // Por defecto, no marcado como gustado en caso de error
                });
        } else {
            videoLikeButton.classList.remove('liked'); // Si no hay usuario o no hay video, asegurar que no esté marcado
        }
        updateMusicLikeButtonState(); // Asegurar que el botón de like de música también se actualice
    }

    loadComments(currentVideoId);
    window.scrollTo({top:0, behavior:'smooth'});
};

// === PUBLICAR COMENTARIO PRINCIPAL ===
window.publicarComentario = () => {
    if(!currentUser) return showToast("Inicia sesión para comentar");
    const input = document.getElementById('comment-input-main');
    if(!input || !input.value.trim()) return showToast("Escribe algo...");

    const commentData = {
        user: currentUser.displayName || "Anon",
        uid: currentUser.uid, // Guardamos UID para permitir borrar después
        photoURL: currentUser.photoURL || "assets/logo192.png",
        text: input.value.trim(),
        timestamp: Date.now()
    };

    db.ref(`comments/${currentVideoId}`).push(commentData)
        .then(() => { showToast("Comentario publicado (+2 XP)"); input.value = ""; addXP(2); })
        .catch(e => showToast("Error: " + e.message));
};

// === CARGAR COMENTARIOS (Función faltante implementada) ===
function loadComments(videoId) {
    const container = document.getElementById('comments-list') || document.getElementById('comments-wrapper');
    if (!container) return;

    // 1. Limpiar listeners de comentarios anteriores para evitar duplicados y condiciones de carrera
    if (currentCommentRefs.length > 0) {
        currentCommentRefs.forEach(ref => ref.off());
        currentCommentRefs = [];
    }

    // Referencia a comentarios
    const commentsRef = db.ref(`comments/${videoId}`);
    
    // Referencia a los likes del usuario actual para pintar los corazones
    let userLikesData = {};
    let userReplyLikesData = {}; // Para likes de respuestas

    if(currentUser) {
        const userLikesRef = db.ref(`userLikes/${currentUser.uid}/comment_likes`);
        userLikesRef.on('value', s => { userLikesData = s.val() || {}; renderComments(); });
        currentCommentRefs.push(userLikesRef);
        
        // Listener para likes de respuestas
        const userReplyLikesRef = db.ref(`userLikes/${currentUser.uid}/reply_likes`);
        userReplyLikesRef.on('value', s => { userReplyLikesData = s.val() || {}; renderComments(); });
        currentCommentRefs.push(userReplyLikesRef);
    }

    currentCommentRefs.push(commentsRef);

    // Función interna para renderizar (se llama cuando cambian comentarios O likes)
    let commentsData = {};
    const renderComments = () => {
        const listContainer = document.getElementById('comments-list');
        if(listContainer) listContainer.innerHTML = "";
        
        // Actualizar contador de comentarios (Principales + Respuestas)
        let totalCount = 0;
        if (commentsData && listContainer) {
            Object.values(commentsData).forEach(c => {
                totalCount++;
                if(c.replies) totalCount += Object.keys(c.replies).length;
            });
            const countBtn = document.getElementById('comments-count-btn');
            if(countBtn) countBtn.innerText = totalCount;

            Object.entries(commentsData).reverse().forEach(([key, comment]) => {
                const div = document.createElement('div');
                
                // Renderizar respuestas si existen
                let repliesHtml = "";
                if (comment.replies) { 
                    repliesHtml = '<div class="sub-reply">';
                    Object.entries(comment.replies).forEach(([rKey, r]) => {
                        const isReplyOwner = currentUser && (r.uid === currentUser.uid || r.user === currentUser.displayName || currentUser.email === ADMIN_EMAIL);
                        const isReplyLiked = userReplyLikesData[rKey] ? 'liked' : '';
                        const rLikes = Number(r.likes) || 0;
                        const rAvatar = r.photoURL || 'assets/logo192.png';

                        repliesHtml += `
                            <div class="reply-item">
                                <img src="${rAvatar}" class="comment-avatar-mini">
                                <div style="flex:1;">
                                    <div class="reply-header"><strong>${r.user}</strong> <small>${new Date(r.timestamp).toLocaleDateString()}</small></div>
                                    <div class="reply-text">${r.text}</div>
                                    <div class="comment-actions">
                                        <button onclick="window.likeReply('${key}', '${rKey}')" class="btn-action-mini ${isReplyLiked}">❤️ ${rLikes}</button>
                                        <button onclick="window.prepararRespuesta('${key}', '${r.user}')" class="btn-action-mini">Responder</button>
                                        ${isReplyOwner ? `<button onclick="window.deleteReply('${key}', '${rKey}')" class="btn-delete-mini">🗑️</button>` : ''}
                                    </div>
                                </div>
                            </div>`;
                    });
                    repliesHtml += '</div>';
                }

                const isOwner = currentUser && (comment.uid === currentUser.uid || comment.user === currentUser.displayName || currentUser.email === ADMIN_EMAIL);
                const likesCount = Number(comment.likes) || 0;
                const isLiked = userLikesData[key] ? 'liked' : ''; // Verificar si el usuario dio like
                const avatar = comment.photoURL || 'assets/logo192.png';

                div.className = "comment-block"; // Corregido para coincidir con styles.css
                div.innerHTML = `
                    <div class="comment-row">
                        <img src="${avatar}" class="comment-avatar">
                        <div style="width:100%">
                            <div class="comment-header">
                                <strong>${comment.user || 'Anon'}</strong> <small>${new Date(comment.timestamp).toLocaleDateString()}</small>
                            </div>
                            <div class="comment-body">${comment.text}</div>
                            <div class="comment-actions">
                                <button onclick="window.likeComment('${key}')" class="btn-action-mini ${isLiked}">❤️ ${likesCount}</button>
                                <button onclick="window.mostrarReply('${key}')" class="btn-action-mini">Responder</button>
                                ${isOwner ? `<button onclick="window.deleteComment('${key}')" class="btn-action-mini btn-delete">🗑️</button>` : ''}
                            </div>
                        </div>
                    </div>
                    ${repliesHtml}
                    <div id="reply-box-${key}" class="reply-input-box" style="display:none;">
                        <input type="text" id="input-${key}" placeholder="Responder..." class="input-reply">
                        <button onclick="window.enviarReply('${key}')">Enviar</button>
                    </div>
                `;
                listContainer.appendChild(div);
            });
        } else if (listContainer) {
            const countBtn = document.getElementById('comments-count-btn');
            if(countBtn) countBtn.innerText = "0";
            listContainer.innerHTML = "<div style='padding:20px; text-align:center; color:#666'>Sé el primero en comentar.</div>";
        }
    };

    commentsRef.on('value', snapshot => {
        commentsData = snapshot.val();
        renderComments();
    });
}

window.enviarReply = (parentKey) => {
    if(!currentUser) return showToast("Inicia sesión para responder");
    const input = document.getElementById(`input-${parentKey}`);
    if(!input || !input.value) return;
    
    const replyData = {
        user: currentUser.displayName || "Anon",
        uid: currentUser.uid,
        photoURL: currentUser.photoURL || "assets/logo192.png",
        text: input.value,
        timestamp: Date.now()
    };
    
    db.ref(`comments/${currentVideoId}/${parentKey}/replies`).push(replyData)
        .then(() => { showToast("Respuesta enviada (+2 XP)"); addXP(2); input.value = ""; document.getElementById(`reply-box-${parentKey}`).style.display = 'none'; })
        .catch(e => showToast("Error: " + e.message));
};

window.mostrarReply = (key) => { const b = document.getElementById(`reply-box-${key}`); b.style.display = (b.style.display === 'flex') ? 'none' : 'flex'; };

// === NUEVAS FUNCIONES DE COMENTARIOS ===
window.likeComment = (key) => {
    if(!currentUser) return showToast("Inicia sesión");
    // Usamos una referencia simple para likes de comentarios
    const ref = db.ref(`comments/${currentVideoId}/${key}/likes`);
    const userLikeRef = db.ref(`userLikes/${currentUser.uid}/comment_likes/${key}`);
    
    userLikeRef.once('value').then(s => {
        if(s.val()) {
            userLikeRef.remove().then(() => {
                ref.transaction(c => (Number(c)||0)-1);
                addXP(-2);
                showToast("Like removido (-2 XP)");
            }).catch(e => showToast("Error: " + e.message));
        } else {
            userLikeRef.set(true).then(() => {
                ref.transaction(c => (Number(c)||0)+1);
                addXP(2);
                showToast("❤️ Like al comentario (+2 XP)");
                // Efecto visual inmediato (opcional, ya que el listener lo hará)
                const btn = document.querySelector(`button[onclick="window.likeComment('${key}')"]`);
                if(btn) btn.classList.add('liked');
            }).catch(e => showToast("Error: " + e.message));
        }
    }).catch(e => showToast("Error al dar like: " + e.message));
};

window.likeReply = (parentKey, replyKey) => {
    if(!currentUser) return showToast("Inicia sesión");
    const ref = db.ref(`comments/${currentVideoId}/${parentKey}/replies/${replyKey}/likes`);
    const userLikeRef = db.ref(`userLikes/${currentUser.uid}/reply_likes/${replyKey}`);
    
    userLikeRef.once('value').then(s => {
        if(s.val()) {
            userLikeRef.remove().then(() => {
                ref.transaction(c => (Number(c)||0)-1);
                addXP(-2);
                showToast("Like removido (-2 XP)");
            }).catch(e => showToast("Error: " + e.message));
        } else {
            userLikeRef.set(true).then(() => {
                ref.transaction(c => (Number(c)||0)+1);
                addXP(2);
                showToast("❤️ Like a respuesta (+2 XP)");
            }).catch(e => showToast("Error: " + e.message));
        }
    }).catch(e => showToast("Error al dar like: " + e.message));
};

window.deleteComment = (key) => {
    if(!confirm("¿Eliminar este comentario permanentemente?")) return;
    db.ref(`comments/${currentVideoId}/${key}`).remove()
        .then(() => showToast("Comentario eliminado"))
        .catch(e => showToast("Error: " + e.message));
};

window.deleteReply = (parentKey, replyKey) => {
    if(!confirm("¿Eliminar respuesta?")) return;
    db.ref(`comments/${currentVideoId}/${parentKey}/replies/${replyKey}`).remove()
        .then(() => showToast("Respuesta eliminada"));
};

window.prepararRespuesta = (commentKey, userName) => {
    const box = document.getElementById(`reply-box-${commentKey}`);
    const input = document.getElementById(`input-${commentKey}`);
    if(box && input) {
        box.style.display = 'flex';
        input.value = `@${userName} `;
        input.focus();
    }
};

// === LÓGICA DE LIKES (VIDEO) ===
window.darLike = () => {
    if (!currentUser) {
        return showToast("Inicia sesión para dar like");
    }
    if (currentVideoId && currentVideoId !== "default") {
        const userLikeRef = db.ref(`userLikes/${currentUser.uid}/${currentVideoId}`);
        const videoLikeButton = document.getElementById('video-like-btn');
        userLikeRef.once('value').then(snapshot => {
            if (snapshot.val()) {
                // UNLIKE: El usuario ya dio like, ahora lo quitamos
                userLikeRef.remove().then(() => {
                    db.ref(`stats/${currentVideoId}/likes`).transaction(c => (c || 0) - 1);
                    addXP(-5);
                    showToast("Like removido (-5 XP)");
                    if (videoLikeButton) videoLikeButton.classList.remove('liked');
                }).catch(error => {
                    console.error("Error al remover like:", error);
                    showToast("⚠️ Error al remover like.");
                });
            } else {
                // LIKE: El usuario no ha dado like, lo agregamos
                db.ref(`stats/${currentVideoId}/likes`).transaction(c => (c || 0) + 1)
                    .then(() => {
                        userLikeRef.set(true); // Marca como que el usuario ya dio like
                        addXP(5);
                        showToast("Like (+5 XP)");
                        playSound('success');
                        spawnGlows(videoLikeButton); // ¡Llamar a la función de resplandores!
                        
                        // Efecto de brillo temporal en botón y contenedor de video
                        const videoContainer = document.querySelector('.integrated-player-box');
                        if (videoLikeButton) videoLikeButton.classList.add('golden-glow-active');
                        if (videoContainer) videoContainer.classList.add('golden-glow-active');
                        
                        setTimeout(() => {
                            if (videoLikeButton) videoLikeButton.classList.remove('golden-glow-active');
                            if (videoContainer) videoContainer.classList.remove('golden-glow-active');
                        }, 1000);

                        if (videoLikeButton) videoLikeButton.classList.add('liked'); // Añadir la clase después del like
                    })
                    .catch(error => {
                        console.log("darLike: Error en transacción de like.");
                        console.error("Error al dar like:", error);
                        showToast("⚠️ Error al dar like. Intenta de nuevo.");
                    });
            }
        }).catch(error => { console.error("Error al verificar like:", error); showToast("⚠️ Error al verificar tu like. Intenta de nuevo."); });
    } else {
        showToast("No hay video seleccionado para dar like.");
    }
};

// === LÓGICA DE LIKES (MÚSICA) Y ESTADO VISUAL ===
// Esta función se encargará de verificar si el usuario ya dio like a la canción actual
// y aplicar la clase 'liked' al botón correspondiente en el reproductor de música.
function updateMusicLikeButtonState() {
    const musicLikeButton = document.querySelector('#ytm-card .btn-ytm-action'); // Selecciona el botón de like de música
    if (musicLikeButton && currentUser && currentTrackIndex !== -1) {
        const track = playlist[currentTrackIndex];
        if (track && track.id) {
            db.ref(`userLikes/${currentUser.uid}/${track.id}`).once('value')
                .then(snapshot => {
                    if (snapshot.val()) {
                        console.log("updateMusicLikeButtonState: Usuario ya dio like a la canción, aplicando clase 'liked'.");
                        musicLikeButton.classList.add('liked');
                    } else {
                        musicLikeButton.classList.remove('liked');
                    }
                })
                .catch(error => {
                    console.error("Error al verificar estado del like de música:", error);
                    musicLikeButton.classList.remove('liked');
                });
        } else {
            musicLikeButton.classList.remove('liked');
        }
    } else if (musicLikeButton) {
        musicLikeButton.classList.remove('liked');
    }
}

// === LÓGICA DE LIKES (MÚSICA) ===
window.likeCurrentTrack = () => {
    if(currentTrackIndex === -1) return showToast("Reproduce algo primero");
    if(!currentUser) return showToast("Inicia sesión para dar like");
    
    const track = playlist[currentTrackIndex];
    const userLikeRef = db.ref(`userLikes/${currentUser.uid}/${track.id}`);
    
    const musicLikeButton = document.querySelector('#ytm-card .btn-ytm-action'); // Selecciona el botón de like de música
    userLikeRef.once('value').then(snapshot => {
        if (snapshot.val()) {
            // UNLIKE: Quitar like a la canción
            userLikeRef.remove().then(() => {
                db.ref(`social/musics/${track.id}/likes`).transaction(c => (c || 0) - 1);
                addXP(-5);
                showToast("Like de canción removido (-5 XP)");
                updateMusicLikeButtonState();
            }).catch(error => {
                console.error("Error al remover like de música:", error);
                showToast("⚠️ Error al remover like.");
            });
        } else {
            // LIKE: Agregar like a la canción
            const ref = db.ref(`social/musics/${track.id}/likes`);
            ref.transaction(likes => (likes || 0) + 1).then(() => {
                userLikeRef.set(true); // Marca como que el usuario ya dio like a la canción
                addXP(5);
                showToast("❤️ Like agregado (+5 XP)");
                updateMusicLikeButtonState(); // Actualizar el estado visual del botón
                if (musicLikeButton) {
                    spawnGlows(musicLikeButton); // ¡Llamar a la función de resplandores!
                    musicLikeButton.classList.add('golden-glow-active');
                    setTimeout(() => musicLikeButton.classList.remove('golden-glow-active'), 1000);
                }
            }).catch(error => {
                console.error("Error al dar like a la canción:", error);
                showToast("⚠️ Error al dar like a la canción. Intenta de nuevo.");
            });
        }
    }).catch(error => {
        console.error("Error al verificar like de canción:", error);
        showToast("⚠️ Error al verificar tu like de canción. Intenta de nuevo.");
    });
};

// === OTRAS FUNCIONES DE MÚSICA ===
window.toggleLyrics = () => {
    document.getElementById('ytm-lyrics').classList.toggle('show');
};

window.shareCurrentTrack = () => {
    if(currentTrackIndex === -1) return;
    const track = playlist[currentTrackIndex];
    const textToShare = `Escucha "${track.title}" de Abraham Horus 🎵\nEn: https://abrahamhorus1996.web.app/#p-musica`;

    if (navigator.share) {
        navigator.share({ title: 'Abraham Horus', text: textToShare, url: location.href }).catch(()=>{});
    } else {
        navigator.clipboard.writeText(textToShare).then(() => showToast("📋 Link copiado"));
    }
}

/* galaxy*/
document.addEventListener("DOMContentLoaded", function() {
    const canvas = document.getElementById('galaxy-canvas');
    const ctx = canvas.getContext('2d');

    let width, height;
    let stars = [];
    // CONFIGURACIÓN: ¡Muévele aquí si quieres más o menos acción!
    const numStars = 300; // Cantidad de estrellas (cuidado si pones mil, se alenta el cel)
    const speed = 1;    // Velocidad de giro (más bajo = más lento y elegante)

    // Ajusta el tamaño del canvas a la pantalla
    function resizeCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        createStars(); // Recrea estrellas si cambias el tamaño de ventana
    }

    // Clase para crear cada estrella
    class Star {
        constructor() {
            this.reset(true);
        }

        reset(initial = false) {
            // Posición aleatoria
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            // Profundidad (Z) para efecto 3D
            this.z = Math.random() * width;
            // Tamaño y color
            this.size = Math.random() * 1.5; // Estrellas pequeñitas y finas
            this.opacity = Math.random() * 0.8 + 0.2;

            // Si es la primera vez, las esparce por todos lados.
            // Si se está reciclando, la manda al fondo.
            if (!initial) this.z = width;
        }

        update() {
            // Mueve la estrella hacia el frente (disminuye Z)
            this.z -= speed * 2;
            // Si la estrella pasa la pantalla, la reciclamos al fondo
            if (this.z <= 0) {
                this.reset();
            }
        }

        draw() {
            // Matemáticas locas para la perspectiva 3D
            let x3d = (this.x - width / 2) * (width / this.z);
            let y3d = (this.y - height / 2) * (width / this.z);
            // Centramos en la pantalla
            let xFinal = x3d + width / 2;
            let yFinal = y3d + height / 2;

            // Tamaño basado en la cercanía
            let sizeFinal = (1 - this.z / width) * this.size * 2;

            ctx.beginPath();
            ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
            ctx.arc(xFinal, yFinal, sizeFinal, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function createStars() {
        stars = [];
        for (let i = 0; i < numStars; i++) {
            stars.push(new Star());
        }
    }

    // El bucle de animación principal
    function animate() {
        // Limpia el canvas en cada frame (pero deja un rastro oscuro)
        ctx.fillStyle = 'rgba(9, 10, 15, 0.3)'; // El color del fondo con transparencia
        ctx.fillRect(0, 0, width, height);

        // Actualiza y dibuja cada estrella
        stars.forEach(star => {
            star.update();
            star.draw();
        });

        requestAnimationFrame(animate);
    }

    // Arrancamos motores
    resizeCanvas();
    animate();

    // Si el usuario cambia el tamaño de la ventana, ajustamos
    window.addEventListener('resize', resizeCanvas);
});