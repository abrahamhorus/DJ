console.log(
    "%c ¡ALTO AHÍ, VIAJERO! 🛑",
    "color: #ff0033; font-size: 24px; font-weight: bold; text-shadow: 2px 2px #000;"
);

console.log(
    "%c ¿Te gustó el código? Esta página fue construida con sudor, lágrimas y mucho café por el precioso de Abraham Horus. 🧬💻",
    "color: #00d9ff; font-size: 14px; font-weight: bold;"
);

console.log(
    "%c Si eres reclutador de Google (o traes buen presupuesto): ¡Hablemos! 📩 contacto@abrahamhorus.com",
    "background: #222; color: #bada55; padding: 10px; border-radius: 5px; font-size: 12px;"
);

const firebaseConfig = {
    apiKey: "",
    authDomain: "abrahamhorus1996.firebaseapp.com",
    databaseURL: "https://abrahamhorus1996-default-rtdb.firebaseio.com",
    projectId: "abrahamhorus1996",
    storageBucket: "abrahamhorus1996.firebasestorage.app",
    messagingSenderId: "1002882996128",
    appId: "1:1002882996128:web:231c5eb841f3bec4a336c5"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
const auth = firebase.auth();
const ADMIN_EMAIL = "abrahorus@gmail.com";

const audioPotaxioIn = new Audio('/assets/potaxio-in.mp3');
const audioPotaxioOut = new Audio('/assets/potaxio-out.mp3');

// === ESTADO GLOBAL ===
let currentVideoId = "default";
let currentUser = null;
let audioGlobal = new Audio(); // Audio limpio
let playlist = []; // Array de canciones
let currentTrackIndex = -1; // Índice actual
let progressInterval; // Intervalo de la barra
let isAudioInit = false; // Estado de interacción
let currentVideoRefs = []; // Referencias activas de Firebase para limpieza
let currentCommentRefs = []; // Referencias de comentarios para limpieza independiente
let photoList = []; // Lista de fotos para el carrusel
let currentPhotoIndex = -1; // Índice de foto actual
let currentPhotoCommentsRef = null; // Ref para limpiar listener de comentarios de fotos
let matrixRainInterval = null; // Intervalo para el efecto Matrix
let potaxioRainInterval = null; // Intervalo para el efecto Potaxio

// === CONSTANTES DE REACCIONES ===
const REACTION_ICONS = {
    love: '❤️',
    haha: '😆',
    wow: '😮',
    angry: '😡'
};

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

    // --- For Speech Synthesis API ---
    // Some browsers require a user gesture to load the voice list and 'wake up' the API.
    if ('speechSynthesis' in window) {
        console.log("Initializing Speech Synthesis...");
        // The getVoices() call is often necessary to populate the voice list.
        window.speechSynthesis.getVoices();
        
        // A silent utterance on a user gesture can kick-start the speech engine,
        // especially on mobile browsers.
        const primer = new SpeechSynthesisUtterance('');
        primer.volume = 0; // Make it silent
        window.speechSynthesis.speak(primer);
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

    if (type === 'hover') {
        osc.frequency.value = 400;
        gain.gain.value = 0.05;
        osc.start();
        osc.stop(audioCtx.currentTime + 0.05);
    }
    if (type === 'click') {
        osc.frequency.value = 600;
        gain.gain.value = 0.1;
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    }
    if (type === 'success') {
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3);
        gain.gain.value = 0.1;
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    }
};

window.onload = () => {
    // Carga inicial
    loadVideo({ id: "v_init", title: "Despierto (Video Musical Oficial)", desc: "Primer video oficial del artista Abraham Horus, superación de una crisis, llegando a la muerte y renaciendo con una fuerza de voluntad inquebrantable logrando la iluminación de cuerpo y alma. 👑", url: "https://res.cloudinary.com/dmwxi5gkf/video/upload/v1766804153/video_web_pro_fgjwjs.mp4", poster: "assets/shot 1.jpeg" });
    initApp();
    handleHash(); 
    initializeDock(); 
    initLanguageSelector(); // Inicializar sistema de idiomas

    // Sonido de click para modo potaxio
    const audioClickPuto = new Audio('/assets/puto-click.mp3');
    document.addEventListener('click', () => {
        if (document.body.classList.contains('potaxio-mode')) {
            audioClickPuto.currentTime = 0;
            audioClickPuto.play();
        }
    });

    // === LÓGICA PARA CONTAR VIEWS AL REPRODUCIR VIDEO ===
    const mainVideo = document.getElementById('main-video');
    const ambilightCanvas = document.getElementById('ambilight-canvas');

    if (mainVideo && ambilightCanvas) {
        const ambilightCtx = ambilightCanvas.getContext('2d', { willReadFrequently: true });
        
        // Optimización: resolución interna minúscula para el desenfoque
        ambilightCanvas.width = 30;
        ambilightCanvas.height = 30;

        let lastFrameTime = 0;
        const renderAmbilight = (now) => {
            if (mainVideo.paused || mainVideo.ended) return;
            
            if (now - lastFrameTime > 33) { // Limitar a ~30 FPS para rendimiento
                ambilightCtx.drawImage(mainVideo, 0, 0, 30, 30);
                lastFrameTime = now;
            }
            requestAnimationFrame(renderAmbilight);
        };


        mainVideo.addEventListener('play', () => {
            renderAmbilight();
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
    localStorage.setItem('last_view', pageId); // Guardamos la ventana actual
    window.location.hash = pageId;
    updateNavUI(pageId);
};

window.addEventListener('hashchange', handleHash);

function handleHash() {
    let pageId = window.location.hash.substring(1);
    // Si el hash está vacío o es inválido (ej. modificado por Google Translate), recuperamos la última vista
    if (!pageId || !document.getElementById(pageId)) {
        const saved = localStorage.getItem('last_view');
        pageId = (saved && document.getElementById(saved)) ? saved : 'p-videos';
    }
    updateNavUI(pageId);
}
function updateNavUI(id) {
    // Cerrar todas las ventanas primero (o mantenerlas si quieres multi-ventana, pero por ahora single-focus)
    document.querySelectorAll('.app-view').forEach(p => p.classList.remove('active'));
    
    const el = document.getElementById(id); 
    if (el) el.classList.add('active');
    
    // Actualizar Dock
    document.querySelectorAll('.dock-item').forEach(d => {
        d.classList.remove('active');
        if (d.getAttribute('onclick') && d.getAttribute('onclick').includes(id)) {
            d.classList.add('active');
        }
    });
}

function initApp() {
    // 1. CARGAR VIDEOS
    db.ref('social/videos').on('value', snapshot => {
        const grid = document.getElementById('videos-grid');
        if (grid) grid.innerHTML = "";
        
        if (snapshot.val()) {
            Object.entries(snapshot.val()).reverse().forEach(([k, v]) => {
                const c = document.createElement('div');
                c.className = "code-card";
                c.onclick = () => loadVideo({ id: k, ...v });
                c.innerHTML = `<div class="card-thumb"><img src="${v.poster}" loading="lazy" onerror="this.src='assets/logo192.png'"></div><div class="card-text">${v.title}</div>`;
                grid.appendChild(c);
            });
        }
    });

    // 2. CARGAR MÚSICA (SISTEMA PLAYLIST)
    db.ref('social/musics').on('value', snapshot => {
        // Guardar ID de la canción actual para restaurar el índice tras la actualización
        const currentTrackId = (currentTrackIndex >= 0 && playlist[currentTrackIndex]) ? playlist[currentTrackIndex].id : null;
        
        playlist = []; // Limpiar playlist
        const listDiv = document.getElementById('ytm-queue-list');
        if (listDiv) listDiv.innerHTML = "";
        
        if (snapshot.val()) {
            // Convertir DB a Array
            Object.entries(snapshot.val()).reverse().forEach(([k, m]) => {
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
                if (index === currentTrackIndex) div.classList.add('active');
                
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
            if (currentTrackIndex !== -1 && playlist[currentTrackIndex] && !isAudioInit) {
                const currentTrack = playlist[currentTrackIndex];
                const likeCountEl = document.getElementById('ytm-like-count');
                if (likeCountEl) likeCountEl.innerText = currentTrack.likes || 0;
            }
        }
    });

    // 3. CARGAR FOTOS
    db.ref('social/photos').on('value', snapshot => {
        const grid = document.getElementById('photos-grid');
        if (!grid) return;
        
        photoList = []; // Reiniciar lista
        grid.innerHTML = "";
        
        if (snapshot.val()) {
            Object.entries(snapshot.val()).reverse().forEach(([k, v]) => {
                photoList.push({id: k, ...v}); // Guardar en array para carrusel
                const index = photoList.length - 1;
                const c = document.createElement('div'); c.className = "code-card";
                c.onclick = () => window.openPhotoViewer(index); // Abrir carrusel al click
                c.innerHTML = `<div class="card-thumb"><img src="${v.poster || v.url}" loading="lazy" onerror="this.src='assets/logo192.png'"></div>
                               <div class="card-text">${v.title}</div>`;
                grid.appendChild(c);
            });
        }
    });

    // 4. CARGAR EVENTOS
    db.ref('social/events').on('value', snapshot => {
        const list = document.getElementById('events-list');
        if (!list) return;
        
        list.innerHTML = "";
        if (snapshot.val()) {
            Object.entries(snapshot.val()).reverse().forEach(([k, v]) => {
                const c = document.createElement('div');
                c.className = "code-card";
                c.innerHTML = `<div class="card-text"><b style="color:var(--accent)">${v.eventDate || 'Próximamente'}</b><br>${v.title}<br><small style="color:#888">${v.desc || ''}</small></div>`;
                list.appendChild(c);
            });
        }
    });

    // 5. CARGAR CHAT
    const chatBox = document.getElementById('chat-global-msgs');
    let isUserAtBottom = true;
    let chatSentinel = null;

    if (chatBox) {
        // Intersection Observer para el Chat (Optimización UX)
        chatSentinel = document.createElement('div');
        chatSentinel.id = 'chat-sentinel';
        chatBox.appendChild(chatSentinel);

        const observer = new IntersectionObserver((entries) => {
            isUserAtBottom = entries[0].isIntersecting;
        }, { threshold: 0.1 });
        observer.observe(chatSentinel);
    }

    db.ref('chat_global').limitToLast(30).on('child_added', snapshot => {
        const m = snapshot.val();
        
        if (chatBox) {
            const div = document.createElement('div');
            let cssClass = "msg-other";
            let icon = "";
            
            if (m.email === ADMIN_EMAIL) {
                cssClass = "msg-artist";
                icon = "👑 ";
            } else if (currentUser && m.user === currentUser.displayName) {
                cssClass = "msg-self";
            }
            
            div.className = "msg-bubble " + cssClass;
            // Header del mensaje con botón de responder (se oculta solo si es msg-self gracias al CSS existente)
            div.innerHTML = `<small style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                                <span>${icon}${m.user}</span>
                                <button onclick="window.replyChat('${m.user}')" class="btn-reply-chat">↩</button>
                             </small>
                             ${m.text}`;
            
            if (chatSentinel) {
                chatBox.insertBefore(div, chatSentinel);
                if (isUserAtBottom) {
                    chatSentinel.scrollIntoView({ behavior: 'smooth' });
                }
            } else {
                chatBox.appendChild(div);
                chatBox.scrollTop = chatBox.scrollHeight;
            }
        }
    });

    // 6. CONTADOR DE SUBS PRO
    db.ref('stats/global/subs').on('value', snapshot => {
        const target = snapshot.val() || 0;
        const el = document.getElementById('global-subs-count');
        if (el) animateValue("global-subs-count", parseInt(el.innerText) || 0, target, 1500);
    });

    // 7. TERMINAL LOGIC
    const terminalInput = document.getElementById('terminal-input');
    const terminalOutput = document.getElementById('terminal-output');

    const printToTerminal = (text, isCommand) => {
        if (!terminalOutput) return;
        const line = document.createElement('div');
        line.className = 'terminal-line';
        if (isCommand) {
            line.innerHTML = `<span class="prompt-user">horus@root:</span><span class="prompt-symbol">~$</span> ${text}`;
        } else {
            line.innerHTML = text;
        }
        terminalOutput.appendChild(line);
        // Scroll to bottom
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    };

    const handleTerminalCommand = (command) => {
        printToTerminal(command, true);
        const args = command.toLowerCase().split(' ');
        const cmd = args[0];

        switch (cmd) {
            case 'help':
                printToTerminal(`Comandos disponibles:
- <span style="color: var(--accent);">help</span>: Muestra esta lista de comandos.
- <span style="color: var(--accent);">about</span>: Muestra información sobre el creador.
- <span style="color: var(--accent);">social</span>: Muestra las redes sociales.
- <span style="color: var(--accent);">subs</span>: Muestra el número de suscriptores.
- <span style="color: var(--accent);">matrix</span>: Revela el secreto de la Matrix.
- <span style="color: var(--accent);">potaxio</span>: Activa el modo Potaxio.
- <span style="color: var(--accent);">clear</span>: Limpia la terminal.
`);
                break;
            case 'about':
                printToTerminal('Abraham Horus: Ingeniero de Software, Productor Musical y Artista Digital. Esta plataforma es mi creación, uniendo código y arte. 🚀');
                break;
            case 'clear':
                terminalOutput.innerHTML = '';
                break;
            case 'matrix':
                if (args[1] === 'on') {
                    activarModoMatrix();
                    printToTerminal('Modo Matrix activado.');
                } else if (args[1] === 'off') {
                    desactivarModoMatrix();
                    printToTerminal('Modo Matrix desactivado.');
                } else {
                    const pillsContainer = document.querySelector('.matrix-pills-container');
                    if (pillsContainer) {
                        pillsContainer.style.display = 'block';
                    }
                    printToTerminal('Pastilla azul para entrar, roja para salir.');
                }
                break;
            case 'potaxio':
                togglePotaxioMode();
                if (document.body.classList.contains('potaxio-mode')) {
                    printToTerminal('🥑 Modo Potaxio activado.');
                } else {
                    printToTerminal('Modo Potaxio desactivado.');
                }
                break;
            case 'subs':
                const subsCount = document.getElementById('global-subs-count').innerText;
                printToTerminal(`Suscriptores actuales: ${subsCount}`);
                break;
            case 'launcher':
                let socialLinks = 'Redes Sociales:\n';
                appsData.forEach(app => {
                    socialLinks += `- ${app.name}: <a href="${app.url}" target="_blank">${app.url}</a>\n`;
                });
                printToTerminal(socialLinks);
                break;
            default:
                printToTerminal(`<span style="color: red;">Comando no reconocido:</span> ${command}. Escribe 'help' para ver la lista de comandos.`);
                break;
        }
    };
    
    if (terminalInput) {
        terminalInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const command = terminalInput.value.trim();
                if (command) {
                    handleTerminalCommand(command);
                    terminalInput.value = '';
                }
            }
        });

        const terminalWindow = document.querySelector('.terminal-window');
        if (terminalWindow) {
            terminalWindow.addEventListener('click', () => {
                terminalInput.focus();
            });
        }
        
        printToTerminal("Bienvenido a HorusOS Terminal. Escribe 'help' para comenzar.", false);
    }
}

// === LOGICA REPRODUCTOR YOUTUBE MUSIC ===

window.playTrackIndex = (index) => {
    if (index < 0 || index >= playlist.length) return;
    
    currentTrackIndex = index;
    const track = playlist[index];
    
    // UI Updates
    const cover = document.getElementById('ytm-cover');
    if (cover) cover.src = track.poster || 'assets/logo192.png';
    document.getElementById('ytm-title').innerText = track.title;
    document.getElementById('ytm-artist').innerText = "Abraham Horus";
    
    // Cargar Likes y Letra
    updateReactionUI('music', track.id); // Usar nueva función de UI
    const lyricsBox = document.getElementById('lyrics-text');
    if (lyricsBox) {
        lyricsBox.innerHTML = "";
        lyricsBox.scrollTop = 0; // Reset scroll al cambiar canción
        const lyricsContent = track.desc || "No hay letra disponible.";
        lyricsContent.split('\n').forEach(line => {
            const div = document.createElement('div');
            div.textContent = line;
            lyricsBox.appendChild(div);
        });
    }
    
    // Resaltar en cola
    document.querySelectorAll('.queue-item').forEach((el, i) => {
        el.classList.toggle('active', i === index);
    });

    playAudioFile(track.url);
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
    if (playlist.length === 0) return;
    if (currentTrackIndex === -1) {
        playTrackIndex(0);
        return;
    }

    if (audioGlobal.paused) {
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
    if (next >= playlist.length) next = 0;
    playTrackIndex(next);
};

window.prevTrack = () => {
    let prev = currentTrackIndex - 1;
    if (prev < 0) prev = playlist.length - 1;
    playTrackIndex(prev);
};

// === ACCIONES NUEVAS: LIKE, LETRA, SHARE ===

// === BARRA DE PROGRESO ===
function startProgressLoop() {
    clearInterval(progressInterval);
    progressInterval = setInterval(() => {
        if (audioGlobal.duration) {
            const pct = (audioGlobal.currentTime / audioGlobal.duration) * 100;
            document.getElementById('ytm-progress').style.width = pct + "%" ;
            document.getElementById('ytm-curr-time').innerText = fmtTime(audioGlobal.currentTime);
            document.getElementById('ytm-dur-time').innerText = fmtTime(audioGlobal.duration);
            
            if (audioGlobal.ended) window.nextTrack();
        }
    }, 500);
}

function fmtTime(s) {
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec < 10 ? '0'+sec : sec}`;
}

window.seekAudio = (e) => {
    if (!audioGlobal.duration) return;
    const bar = e.currentTarget;
    const pct = e.offsetX / bar.clientWidth;
    audioGlobal.currentTime = pct * audioGlobal.duration;
};

// === OTRAS FUNCIONES (VIDEO, COMENTARIOS, XP) ===

window.toggleLiveChat = () => {
    window.navigate('p-chat');
};

window.toggleComments = () => {
    const container = document.getElementById('comments-wrapper');
    if (container) {
        container.style.display = (container.style.display === 'none') ? 'block' : 'none';
        playSound('click');
    }
};

window.enviarMensajeChat = () => {
    const input = document.getElementById('chat-input-msg');
    if (!input || !input.value) return;
    
    const email = currentUser ? currentUser.email : "anon";
    const user = currentUser ? currentUser.displayName : "Anon";
    
    db.ref('chat_global').push({ user: user, email: email, text: input.value, timestamp: Date.now() });
    input.value = "";
};

window.replyChat = (user) => {
    const input = document.getElementById('chat-input-msg');
    if (input) {
        input.value = `@${user} ` + input.value;
        input.focus();
    }
};

window.showToast = (msg) => {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div'); t.className = 'toast-msg';
    t.innerHTML = `<span>⚡</span> ${msg}`; c.appendChild(t);
    setTimeout(() => { t.style.animation = 'fadeOut 0.3s forwards'; setTimeout(()=>t.remove(), 300); }, 3000);
};

// === AUTH & ADMIN ===
window.loginGoogle = () => {
    auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
};

window.cerrarSesion = () => {
    auth.signOut().then(() => {
        location.reload();
    });
};

auth.onAuthStateChanged(u => {
    currentUser = u;
    document.body.classList.toggle('is-vip', !!u);
    const adminDock = document.getElementById('dock-admin');
    if (adminDock) adminDock.style.display = 'none';

    // Actualizar estados de reacciones al loguearse/desloguearse
    if (currentVideoId && currentVideoId !== "default") updateReactionUI('video', currentVideoId);
    if (currentTrackIndex !== -1 && playlist[currentTrackIndex]) updateReactionUI('music', playlist[currentTrackIndex].id);
    if (currentPhotoIndex !== -1 && photoList[currentPhotoIndex]) updateReactionUI('photo', photoList[currentPhotoIndex].id);
    if (currentVideoId && currentVideoId !== "default") loadComments(currentVideoId); // Recargar comentarios para ver reacciones propias

    // Verificar estado de suscripción
    if (u) {
        db.ref(`users/${u.uid}/isSubscribed`).once('value', s => {
            const btn = document.getElementById('btn-subscribe');
            const label = document.getElementById('subs-label');
            if (btn && label && s.val()) {
                btn.classList.add('subscribed');
            }
        });
    } else {
        const btn = document.getElementById('btn-subscribe');
        if (btn) btn.classList.remove('subscribed');
    }

    if (u) {
        document.getElementById('display-name').innerText = u.displayName;
        document.getElementById('profile-preview').src = u.photoURL || "assets/logo192.png";
        document.getElementById('btn-login-profile').style.display = 'none';
        document.getElementById('btn-logout-profile').style.display = 'block';
        document.getElementById('profile-editor').style.display = 'block';
        document.getElementById('xp-container').style.display = 'block';
        
        db.ref(`users/${u.uid}`).on('value', s => {
            const d = s.val() || {}; const xp = d.xp || 0; const lvl = Math.floor(xp/100) + 1;
            document.getElementById('user-level').innerText = lvl;
            document.getElementById('user-xp-text').innerText = `${xp}`;
        });
        showToast(`Bienvenido, ${u.displayName}`);

        if (u.email === ADMIN_EMAIL) {
            if (adminDock) adminDock.style.display = 'flex';
            showToast("👑 Modo Admin Activo");
        }
        
        // Recargar comentarios para actualizar permisos de borrado y likes
        if (currentVideoId && currentVideoId !== "default") loadComments(currentVideoId);
    } else {
        // Clear user-specific UI when logged out
        document.getElementById('display-name').innerText = "INVITADO";
        document.getElementById('profile-preview').src="assets/logo192.png";
        document.getElementById('btn-login-profile').style.display='block';
        document.getElementById('btn-logout-profile').style.display='none';
        document.getElementById('profile-editor').style.display='none';
        document.getElementById('xp-container').style.display='none';
    }
});

// === LÓGICA DE SUSCRIPCIÓN ===
window.toggleSub = () => {
    console.log("Intentando toggle de suscripción...");
    if (!currentUser) {
        console.warn("No hay usuario detectado para suscribirse.");
        showToast("Inicia sesión para suscribirte, mi amor");
        return window.loginGoogle();
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
                }
                showToast("Suscripción cancelada");
            }).catch(err => console.error("Error al desuscribir:", err));
        } else {
            // SUSCRIBIRSE
            Promise.all([
                db.ref(`users/${currentUser.uid}`).update({
                    isSubscribed: true,
                    email: currentUser.email,
                    displayName: currentUser.displayName
                }),
                globalSubsRef.transaction(c => (c || 0) + 1)
            ]).then(() => {
                if (btn) {
                    btn.classList.add('subscribed');
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
    if (dateField) dateField.style.display = (type === 'event') ? 'block' : 'none';
    if (urlField) {
        if (type === 'video') urlField.placeholder = "URL del Video (MP4 / Cloudinary)";
        if (type === 'music') urlField.placeholder = "URL del Audio (MP3)";
        if (type === 'photo') urlField.placeholder = "URL de la Imagen";
    }
};

window.adminUpload = () => {
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) return showToast("⛔ Acceso denegado");
    const type = document.getElementById('adm-type').value;
    const title = document.getElementById('adm-title').value;
    const desc = document.getElementById('adm-desc').value;
    const url = document.getElementById('adm-url').value;
    const poster = document.getElementById('adm-thumb').value;
    const dateVal = document.getElementById('adm-date') ? document.getElementById('adm-date').value : "";

    if (!title) return showToast("Falta el título");
    
    const data = { title: title, desc: desc, url: url, poster: poster, timestamp: Date.now() };
    if (type === 'event') {
        if (!dateVal) return showToast("Falta la fecha");
        data.eventDate = dateVal;
    }

    db.ref(`social/${type}s`).push(data)
        .then(() => {
            showToast(`✅ ${type.toUpperCase()} PUBLICADO`);
            playSound('success');
            document.querySelectorAll('.admin-input').forEach(i => i.value = "");
            if (type === 'music') window.navigate('p-musica');
            else window.navigate('p-' + type + 's');
        })
        .catch(error => showToast("Error: " + error.message));
};

window.guardarPerfil = () => {
    const newName = document.getElementById('edit-name').value;
    const newPhoto = document.getElementById('edit-photo').value;
    
    if (currentUser) {
        currentUser.updateProfile({
            displayName: newName || currentUser.displayName,
            photoURL: newPhoto || currentUser.photoURL
        }).then(() => location.reload());
    }
};

// === MATRIX RAIN EFFECT ===
function startMatrixRain() {
    if (matrixRainInterval) clearInterval(matrixRainInterval); // Evita duplicados

    const canvas = document.getElementById('matrix-canvas');
    if (!canvas) {
        console.error("Matrix Rain: El canvas con id 'matrix-canvas' no fue encontrado.");
        return;
    }
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Caracteres a usar (Katakana para el look clásico)
    const katakana = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン';
    const binary = '01';
    const characters = katakana + binary;
    const fontSize = 16;
    const columns = Math.floor(canvas.width / fontSize);

    // Array para guardar la posición 'y' de cada gota en cada columna
    const drops = [];
    for (let x = 0; x < columns; x++) {
        drops[x] = 1;
    }

    function draw() {
        // Fondo semi-transparente para el efecto de estela
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#00ff41'; // Color verde "hacker"
        ctx.font = fontSize + 'px monospace';

        for (let i = 0; i < drops.length; i++) {
            const text = characters.charAt(Math.floor(Math.random() * characters.length));
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);

            // Si la gota llega al fondo, la resetea al inicio con una probabilidad aleatoria
            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }

            drops[i]++;
        }
    }

    matrixRainInterval = setInterval(draw, 33);

    // Reajustar si la ventana cambia de tamaño
    window.addEventListener('resize', () => {
        if (!matrixRainInterval) return; // No hacer nada si el efecto no está activo
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const newColumns = Math.floor(canvas.width / fontSize);
        // Reiniciar gotas para el nuevo tamaño
        while(drops.length > newColumns) drops.pop();
        while(drops.length < newColumns) drops.push(1);
        for (let x = 0; x < drops.length; x++) {
            drops[x] = 1;
        }
    });
}

function stopMatrixRain() {
    if (matrixRainInterval) {
        clearInterval(matrixRainInterval);
        matrixRainInterval = null;
    }
    const canvas = document.getElementById('matrix-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        // Asegurarse que el canvas tenga dimensiones antes de limpiar
        if (canvas.width > 0 && canvas.height > 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
}

// === POTAXIO RAIN EFFECT ===
function startPotaxioRain() {
    if (potaxioRainInterval) clearInterval(potaxioRainInterval);

    const canvas = document.getElementById('matrix-canvas');
    if (!canvas) {
        console.error("Potaxio Rain: Canvas 'matrix-canvas' not found.");
        return;
    }
    const ctx = canvas.getContext('2d');
    const avocadoImg = new Image();
    avocadoImg.src = '/assets/avocado.png';

    avocadoImg.onload = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const avocadoSize = 40;
        const columns = Math.floor(canvas.width / avocadoSize);
        const drops = [];

        for (let i = 0; i < columns; i++) {
            // Posición inicial aleatoria para que no empiecen todos alineados
            drops[i] = 1 + Math.floor(Math.random() * 20);
        }

        function draw() {
            // Fondo claro semi-transparente para el efecto de estela
            ctx.fillStyle = 'rgba(247, 242, 228, 0.25)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < drops.length; i++) {
                const x = i * avocadoSize;
                const y = drops[i] * avocadoSize;
                ctx.drawImage(avocadoImg, x, y, avocadoSize, avocadoSize);
                
                // Si el aguacate sale de la pantalla, lo resetea arriba con cierta probabilidad
                if (y > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        }

        potaxioRainInterval = setInterval(draw, 50);
    };

    avocadoImg.onerror = () => {
        console.error("Potaxio Rain: No se pudo cargar la imagen /assets/avocado.png");
    };
}

function stopPotaxioRain() {
    if (potaxioRainInterval) {
        clearInterval(potaxioRainInterval);
        potaxioRainInterval = null;
    }
    const canvas = document.getElementById('matrix-canvas');
    if (canvas && canvas.getContext) {
        const ctx = canvas.getContext('2d');
        if (canvas.width > 0 && canvas.height > 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
}

// === HACKER MODE ===
let keyBuffer = '';
const secretCodes = {
};

document.addEventListener('keydown', (e) => {
    keyBuffer += e.key.toLowerCase();
    
    for (const code in secretCodes) {
        if (keyBuffer.endsWith(code)) {
            secretCodes[code]();
            keyBuffer = '';
            return;
        }
    }

    // Limit buffer size to avoid it growing indefinitely
    if (keyBuffer.length > 10) {
        keyBuffer = keyBuffer.slice(-10);
    }
});

function activarModoMatrix() {
    playSound('success'); 
    showToast("⚠️ MATRIX MODE ACTIVATED");
    document.body.classList.add('matrix-mode');
    startMatrixRain();
    const pillsContainer = document.querySelector('.matrix-pills-container');
    if (pillsContainer) {
        pillsContainer.style.display = 'none';
    }
}

function desactivarModoMatrix() {
    playSound('click');
    showToast("Matrix mode deactivated.");
    document.body.classList.remove('matrix-mode');
    stopMatrixRain();
    const pillsContainer = document.querySelector('.matrix-pills-container');
    if (pillsContainer) {
        pillsContainer.style.display = 'none';
    }
}

function toggleMatrixMode() {
    // Cancel any ongoing or queued speech to prevent overlaps
    window.speechSynthesis.cancel(); 

    if (document.body.classList.contains('matrix-mode')) {
        desactivarModoMatrix();

        setTimeout(() => {
            console.log("Attempting to speak: Restoring user session.");
            const exitMessage = new SpeechSynthesisUtterance("Restoring user session.");
            exitMessage.lang = 'en-US';
            exitMessage.onerror = (event) => {
                console.error('SpeechSynthesisUtterance.onerror', event);
            };
            window.speechSynthesis.speak(exitMessage);
        }, 100); // Short delay
    } else {
        activarModoMatrix();

        setTimeout(() => {
            console.log("Attempting to speak: Wake up, Neo...");
            const enterMessage = new SpeechSynthesisUtterance("Wake up, Neo...");
            enterMessage.lang = 'en-US';
            enterMessage.pitch = 0.8;
            enterMessage.rate = 0.9;
            enterMessage.onerror = (event) => {
                console.error('SpeechSynthesisUtterance.onerror', event);
            };
            window.speechSynthesis.speak(enterMessage);
        }, 100); // Short delay
    }
}

window.activarModoMatrix = activarModoMatrix;
window.desactivarModoMatrix = desactivarModoMatrix;

function togglePotaxioMode() {
    const isPotaxioActive = document.body.classList.toggle('potaxio-mode');
    const potaxioContainer = document.getElementById('potaxio-container');

    if (isPotaxioActive) {
        if (document.body.classList.contains('matrix-mode')) {
            document.body.classList.remove('matrix-mode');
            stopMatrixRain();
        }
        startPotaxioRain();
        audioPotaxioIn.play();
        showToast("🥑✨ MODO POTAXIO ACTIVADO ✨🥑");
        if (potaxioContainer) {
            potaxioContainer.style.display = 'block';
        }
    } else {
        stopPotaxioRain();
        audioPotaxioOut.play();
        showToast("🥑✨ MODO POTAXIO DESACTIVADO ✨🥑");
        if (potaxioContainer) {
            potaxioContainer.style.display = 'none';
        }
    }
}

function desactivarModoPotaxio() {
    // Styles are now handled by the CSS class
}

function activarModoPotaxio() {
    // Styles are now handled by the CSS class
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
    if (!currentUser) return;
    const ref = db.ref(`users/${currentUser.uid}/xp`);
    ref.transaction(c => (c||0) + amount);
    ref.once('value', s => {
        const xp = s.val() || 0;
        const level = Math.floor(xp/100) + 1;
        db.ref(`users/${currentUser.uid}/level`).set(level);
    });
}

window.loadVideo = (v) => {
    playSound('click');
    
    // 1. Limpiar listeners anteriores para evitar fugas de memoria y actualizaciones fantasma
    if (currentVideoRefs.length > 0) {
        currentVideoRefs.forEach(ref => ref.off());
        currentVideoRefs = [];
    }

    currentVideoId = v.id || "default";
    const mainVideoElement = document.getElementById('main-video');
    const videoSourceElement = document.getElementById('video-source');

    if (videoSourceElement) {
        videoSourceElement.src = v.url;
    }
    const titleEl = document.getElementById('current-title');
    if (titleEl) {
        titleEl.innerText = v.title;
    }
    const descEl = document.getElementById('video-description');
    if (descEl) {
        descEl.innerText = v.desc || "";
    }
    
    if (mainVideoElement) {
        mainVideoElement.load(); // Carga la nueva fuente del video
    }

    // Cargar Reacciones y Vistas
    updateReactionUI('video', currentVideoId);

    const viewsRef = db.ref(`stats/${currentVideoId}/views`);
    viewsRef.on('value', s => { const el = document.getElementById('total-views'); if (el) el.innerText = s.val() || 0; });
    currentVideoRefs.push(viewsRef);

    loadComments(currentVideoId);
    window.scrollTo({top:0, behavior:'smooth'});
};

// === PUBLICAR COMENTARIO PRINCIPAL ===
window.publicarComentario = () => {
    if (!currentUser) {
        showToast("Inicia sesión para comentar");
        return window.loginGoogle();
    }
    const input = document.getElementById('comment-input-main');
    if (!input || !input.value.trim()) return showToast("Escribe algo...");

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
        if (listContainer) listContainer.innerHTML = "";
        
        // Actualizar contador de comentarios (Principales + Respuestas)
        let totalCount = 0;
        if (commentsData && listContainer) {
            Object.values(commentsData).forEach(c => {
                totalCount++;
                if (c.replies) totalCount += Object.keys(c.replies).length;
            });
            const countBtn = document.getElementById('comments-count-btn');
            if (countBtn) countBtn.innerText = totalCount;

            Object.entries(commentsData).reverse().forEach(([key, comment]) => {
                const div = document.createElement('div');
                
                // Renderizar respuestas si existen
                let repliesHtml = "";
                if (comment.replies) { 
                    repliesHtml = '<div class="sub-reply">';
                    Object.entries(comment.replies).forEach(([rKey, r]) => {
                        const isReplyOwner = currentUser && (r.uid === currentUser.uid || r.user === currentUser.displayName || currentUser.email === ADMIN_EMAIL);
                        const myReaction = userReplyLikesData[rKey]; // string type or null
                        const rLikes = Number(r.likes) || 0;
                        const rAvatar = r.photoURL || 'assets/logo192.png';

                        repliesHtml += `
                            <div class="reply-item">
                                <img src="${rAvatar}" class="comment-avatar-mini">
                                <div style="flex:1;">
                                    <div class="reply-header"><strong>${r.user}</strong> <small>${new Date(r.timestamp).toLocaleDateString()}</small></div>
                                    <div class="reply-text">${r.text}</div>
                                    <div class="comment-actions">
                                        <div class="reaction-wrapper">
                                            <button onclick="window.toggleReaction('reply', '${rKey}', '${key}')" class="btn-action-mini ${myReaction ? 'btn-reacted-'+myReaction : ''}">
                                                ${myReaction ? REACTION_ICONS[myReaction] : '❤️'} ${rLikes}
                                            </button>
                                            <div class="reaction-picker">
                                                <div class="reaction-option" onclick="window.setReaction('reply', 'love', '${rKey}', '${key}')">
                                                    <span class="reaction-emoji">❤️</span>
                                                    <span class="reaction-count">${(r.reactions && r.reactions.love) || 0}</span>
                                                </div>
                                                <div class="reaction-option" onclick="window.setReaction('reply', 'haha', '${rKey}', '${key}')">
                                                    <span class="reaction-emoji">😆</span>
                                                    <span class="reaction-count">${(r.reactions && r.reactions.haha) || 0}</span>
                                                </div>
                                                <div class="reaction-option" onclick="window.setReaction('reply', 'wow', '${rKey}', '${key}')">
                                                    <span class="reaction-emoji">😮</span>
                                                    <span class="reaction-count">${(r.reactions && r.reactions.wow) || 0}</span>
                                                </div>
                                                <div class="reaction-option" onclick="window.setReaction('reply', 'angry', '${rKey}', '${key}')">
                                                    <span class="reaction-emoji">😡</span>
                                                    <span class="reaction-count">${(r.reactions && r.reactions.angry) || 0}</span>
                                                </div>
                                            </div>
                                        </div>
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
                const myReaction = userLikesData[key]; // string type or null
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
                                <div class="reaction-wrapper">
                                    <button onclick="window.toggleReaction('comment', '${key}')" class="btn-action-mini ${myReaction ? 'btn-reacted-'+myReaction : ''}">
                                        ${myReaction ? REACTION_ICONS[myReaction] : '❤️'} ${likesCount}
                                    </button>
                                    <div class="reaction-picker">
                                        <div class="reaction-option" onclick="window.setReaction('comment', 'love', '${key}')">
                                            <span class="reaction-emoji">❤️</span>
                                            <span class="reaction-count">${(comment.reactions && comment.reactions.love) || 0}</span>
                                        </div>
                                        <div class="reaction-option" onclick="window.setReaction('comment', 'haha', '${key}')">
                                            <span class="reaction-emoji">😆</span>
                                            <span class="reaction-count">${(comment.reactions && comment.reactions.haha) || 0}</span>
                                        </div>
                                        <div class="reaction-option" onclick="window.setReaction('comment', 'wow', '${key}')">
                                            <span class="reaction-emoji">😮</span>
                                            <span class="reaction-count">${(comment.reactions && comment.reactions.wow) || 0}</span>
                                        </div>
                                        <div class="reaction-option" onclick="window.setReaction('comment', 'angry', '${key}')">
                                            <span class="reaction-emoji">😡</span>
                                            <span class="reaction-count">${(comment.reactions && comment.reactions.angry) || 0}</span>
                                        </div>
                                    </div>
                                </div>
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
            if (countBtn) countBtn.innerText = "0";
            listContainer.innerHTML = "<div style='padding:20px; text-align:center; color:#666'>Sé el primero en comentar.</div>";
        }
    };

    commentsRef.on('value', snapshot => {
        commentsData = snapshot.val();
        renderComments();
    });
}

window.enviarReply = (parentKey) => {
    if (!currentUser) {
        showToast("Inicia sesión para responder");
        return window.loginGoogle();
    }
    const input = document.getElementById(`input-${parentKey}`);
    if (!input || !input.value) return;
    
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

window.deleteComment = (key) => {
    if (!confirm("¿Eliminar este comentario permanentemente?")) return;
    db.ref(`comments/${currentVideoId}/${key}`).remove()
        .then(() => showToast("Comentario eliminado"))
        .catch(e => showToast("Error: " + e.message));
};

window.deleteReply = (parentKey, replyKey) => {
    if (!confirm("¿Eliminar respuesta?")) return;
    db.ref(`comments/${currentVideoId}/${parentKey}/replies/${replyKey}`).remove()
        .then(() => showToast("Respuesta eliminada"));
};

window.prepararRespuesta = (commentKey, userName) => {
    const box = document.getElementById(`reply-box-${commentKey}`);
    const input = document.getElementById(`input-${commentKey}`);
    if (box && input) {
        box.style.display = 'flex';
        input.value = `@${userName} `;
        input.focus();
    }
};

// === SISTEMA UNIFICADO DE REACCIONES ===

// Helper para obtener rutas y configuración de UI (DRY)
function getReactionConfig(context, id, parentId) {
    const uid = currentUser ? currentUser.uid : null;
    let statsPath, userPath, uiIds = {};

    switch (context) {
        case 'video':
            statsPath = `stats/${id}/likes`;
            userPath = uid ? `userLikes/${uid}/${id}` : null;
            uiIds = { btn: 'video-like-btn', icon: 'video-reaction-icon', count: 'likes-count' };
            break;
        case 'music':
            statsPath = `social/musics/${id}/likes`;
            userPath = uid ? `userLikes/${uid}/${id}` : null;
            uiIds = { btn: 'music-like-btn', icon: 'music-reaction-icon', count: 'ytm-like-count' };
            break;
        case 'photo':
            statsPath = `social/photos/${id}/likes`;
            userPath = uid ? `userLikes/${uid}/${id}` : null;
            uiIds = { btn: 'pv-like-btn', icon: 'photo-reaction-icon', count: 'pv-likes-count' };
            break;
        case 'comment':
            statsPath = `comments/${currentVideoId}/${id}/likes`;
            userPath = uid ? `userLikes/${uid}/comment_likes/${id}` : null;
            break;
        case 'reply':
            statsPath = `comments/${currentVideoId}/${parentId}/replies/${id}/likes`;
            userPath = uid ? `userLikes/${uid}/reply_likes/${id}` : null;
            break;
    }
    return { statsPath, userPath, uiIds };
}

window.toggleReaction = (context, id, parentId) => {
    // Si no se pasa ID (ej. video/musica principal), usar variables globales
    if (context === 'video' && !id) id = currentVideoId;
    if (context === 'music' && !id) id = playlist[currentTrackIndex]?.id;
    if (context === 'photo' && !id) id = photoList[currentPhotoIndex]?.id;
    
    if (!id || id === 'default') return showToast("Contenido no válido");
    if (!currentUser) return showToast("Inicia sesión para reaccionar");

    const { userPath } = getReactionConfig(context, id, parentId);
    if (!userPath) return;
    
    db.ref(userPath).once('value', s => {
        if(s.val()) {
            // Si ya tiene reacción, quitarla (toggle off)
            window.setReaction(context, null, id, parentId);
        } else {
            // Si no tiene, poner 'love' por defecto
            window.setReaction(context, 'love', id, parentId);
        }
    });
};

window.setReaction = (context, type, id, parentId) => {
    // Normalizar ID si viene de onclick directo
    if (context === 'video' && !id) id = currentVideoId;
    if (context === 'music' && !id) id = playlist[currentTrackIndex]?.id;
    if (context === 'photo' && !id) id = photoList[currentPhotoIndex]?.id;

    if (!id || id === 'default') return;
    if (!currentUser) return showToast("Inicia sesión");

    const { statsPath, userPath } = getReactionConfig(context, id, parentId);
    if (!statsPath || !userPath) return;

    const userLikeRef = db.ref(userPath);
    const statsRef = db.ref(statsPath);
    const reactionsRef = db.ref(statsPath.replace('/likes', '/reactions')); // Ruta para conteos específicos

    userLikeRef.once('value').then(snapshot => {
        const currentReaction = snapshot.val(); // string (tipo) o null
        
        if (currentReaction === type) return; // Misma reacción, no hacer nada

        if (type === null) {
            // REMOVER REACCIÓN
            userLikeRef.remove().then(() => {
                statsRef.transaction(c => (c || 0) - 1);
                reactionsRef.child(currentReaction).transaction(c => (c || 0) - 1); // Restar al específico
                addXP(-2);
                if (!['comment', 'reply'].includes(context)) updateReactionUI(context, id);
            }).catch(err => {
                console.error("Error removing reaction:", err);
                showToast("Error al quitar la reacción.");
            });
        } else {
            // NUEVA REACCIÓN O CAMBIO
            userLikeRef.set(type).then(() => {
                // Si no tenía reacción antes, incrementar contador global
                if (!currentReaction) {
                    statsRef.transaction(c => (c || 0) + 1);
                    reactionsRef.child(type).transaction(c => (c || 0) + 1); // Sumar al nuevo
                    addXP(2);
                    playSound('success');
                } else {
                    // Si es un cambio (ej. Love -> Haha)
                    reactionsRef.child(currentReaction).transaction(c => (c || 0) - 1); // Restar al viejo
                    reactionsRef.child(type).transaction(c => (c || 0) + 1); // Sumar al nuevo
                }
                if (!['comment', 'reply'].includes(context)) updateReactionUI(context, id);
            }).catch(err => {
                console.error("Error setting reaction:", err);
                showToast("Error al guardar la reacción.");
            });
        }
    });
};

function updateReactionUI(context, id) {
    const { statsPath, uiIds } = getReactionConfig(context, id);
    if (!uiIds || !uiIds.btn) return;

    const btn = document.getElementById(uiIds.btn);
    const icon = document.getElementById(uiIds.icon);
    const count = document.getElementById(uiIds.count);
    if (!btn) return;

    const statsRef = db.ref(statsPath);
    statsRef.on('value', s => { if (count) count.innerText = s.val() || 0; });

    const reactionsRef = db.ref(statsPath.replace('/likes', '/reactions'));
    reactionsRef.on('value', s => {
        const data = s.val() || {};
        const setTxt = (type) => {
            const el = document.getElementById(`rc-${context}-${type}`);
            if (el) el.innerText = data[type] || 0;
        };
        ['love', 'haha', 'wow', 'angry'].forEach(setTxt);
    });

    let userLikesRef = null;
    if(currentUser) {
        const userPath = `userLikes/${currentUser.uid}/${id}`;
        userLikesRef = db.ref(userPath);
        userLikesRef.on('value', s => {
            const type = s.val();
            // Limpiar clases previas
            btn.classList.remove('btn-reacted-love', 'btn-reacted-haha', 'btn-reacted-wow', 'btn-reacted-angry');
            
            if (type && REACTION_ICONS[type]) {
                if (icon) icon.innerText = REACTION_ICONS[type];
                btn.classList.add(`btn-reacted-${type}`);
            } else {
                if (icon) icon.innerText = '❤️';
            }
        });
    } else {
        btn.classList.remove('btn-reacted-love', 'btn-reacted-haha', 'btn-reacted-wow', 'btn-reacted-angry');
        if(icon) icon.innerText = '❤️';
    }

    if (context === 'video') {
        currentVideoRefs.push(statsRef);
        currentVideoRefs.push(reactionsRef);
        if (userLikesRef) {
            currentVideoRefs.push(userLikesRef);
        }
    }
}

// === OTRAS FUNCIONES DE MÚSICA ===
window.toggleLyrics = () => {
    document.getElementById('ytm-lyrics').classList.toggle('show');
};

window.shareCurrentTrack = () => {
    if (currentTrackIndex === -1) return;
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
    const numStars = 600; // Cantidad de estrellas (cuidado si pones mil, se alenta el cel)
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

// === LÓGICA DE CARRUSEL DE FOTOS Y COMENTARIOS ===

window.openPhotoViewer = (index) => {
    if (index < 0 || index >= photoList.length) return;
    currentPhotoIndex = index;
    const modal = document.getElementById('photo-viewer-modal');
    modal.classList.add('active');
    loadPhotoDetails(index);
};

window.closePhotoViewer = () => {
    document.getElementById('photo-viewer-modal').classList.remove('active');
    if (currentPhotoCommentsRef) currentPhotoCommentsRef.off(); // Dejar de escuchar comentarios
};

window.nextPhoto = () => {
    let next = currentPhotoIndex + 1;
    if (next >= photoList.length) next = 0;
    loadPhotoDetails(next);
};

window.prevPhoto = () => {
    let prev = currentPhotoIndex - 1;
    if (prev < 0) prev = photoList.length - 1;
    loadPhotoDetails(prev);
};

function loadPhotoDetails(index) {
    currentPhotoIndex = index;
    const photo = photoList[index];
    
    // UI Update
    document.getElementById('pv-image').src = photo.poster || photo.url;
    document.getElementById('pv-title').innerText = photo.title;
    
    updateReactionUI('photo', photo.id);
    // Cargar Comentarios
    loadPhotoComments(photo.id);
}

function loadPhotoComments(photoId) {
    const list = document.getElementById('pv-comments-list');
    list.innerHTML = '<div style="text-align:center; color:#666; padding:20px;">Cargando...</div>';
    
    if (currentPhotoCommentsRef) currentPhotoCommentsRef.off();
    
    currentPhotoCommentsRef = db.ref(`comments/${photoId}`);
    currentPhotoCommentsRef.on('value', s => {
        list.innerHTML = "";
        const data = s.val();
        if (!data) {
            list.innerHTML = '<div style="text-align:center; color:#666; padding:20px;">Sé el primero en comentar.</div>';
            return;
        }
        
        Object.entries(data).reverse().forEach(([k, c]) => {
            const div = document.createElement('div');
            div.className = "comment-block";
            div.style.borderBottom = "1px solid #222";
            const isOwner = currentUser && (c.uid === currentUser.uid || currentUser.email === ADMIN_EMAIL);
            
            div.innerHTML = `
                <div class="comment-row">
                    <img src="${c.photoURL}" class="comment-avatar-mini">
                    <div style="width:100%">
                        <div class="comment-header" style="font-size:0.85rem;"><strong>${c.user}</strong></div>
                        <div class="comment-body" style="font-size:0.9rem;">${c.text}</div>
                        ${isOwner ? `<button onclick="window.deletePhotoComment('${photoId}', '${k}')" class="btn-delete-mini">🗑️ Eliminar</button>` : ''}
                    </div>
                </div>`;
            list.appendChild(div);
        });
    });
}

window.publicarComentarioFoto = () => {
    if (!currentUser) {
        showToast("Inicia sesión para comentar");
        return window.loginGoogle();
    }
    const input = document.getElementById('pv-comment-input');
    if (!input.value.trim()) return;
    const photo = photoList[currentPhotoIndex];
    
    db.ref(`comments/${photo.id}`).push({
        user: currentUser.displayName, uid: currentUser.uid, photoURL: currentUser.photoURL,
        text: input.value.trim(), timestamp: Date.now()
    }).then(() => { input.value = ""; addXP(2); showToast("Comentario enviado"); });
};

window.deletePhotoComment = (photoId, key) => {
    if (confirm("¿Borrar comentario?")) db.ref(`comments/${photoId}/${key}`).remove();
};

// === HORUS APPS ===
const appsData = [
    { id: 'facebook', name: 'Facebook', icon: 'assets/facebook.png',     type: 'link', url: 'https://www.facebook.com/abramhorus/' },
    { id: 'instagram', name: 'Instagram', icon: 'assets/instagram_icon.png', type: 'link', url: 'https://www.instagram.com/abraham_horus/' },
    { id: 'tiktok', name: 'TikTok', icon: 'assets/tiktok_icon.png', type: 'link', url: 'https://www.tiktok.com/@abrahamhorus' }
];

function initializeDock() {
    const grid = document.getElementById('launcher-grid');
    if (!grid) return;

    // Llenar la cuadrícula con las redes sociales
    grid.innerHTML = ""; // Limpiar antes de llenar
    appsData.forEach(app => {
        const item = document.createElement('div');
        item.className = 'launcher-menu-item';
        item.onclick = () => {
            openApp(app.id);
        };
        item.innerHTML = `
            <img src="${app.icon}" alt="${app.name}">
            <span>${app.name}</span>
        `;
        grid.appendChild(item);
    });
}

function openApp(appId) {
    const app = appsData.find(a => a.id === appId);
    if (!app) return;

    showToast(`🚀 Viajando a ${app.name}...`);
    window.open(app.url, '_blank');
}

// === HORUS AI TRANSLATOR (VIA CLOUD FUNCTION) ===

let isTranslating = false;
let originalTexts = new Map(); // Cache para guardar textos originales y poder revertir a español.
const traduccionesCache = new Map(); // MEMORIA: Cache persistente de traducciones
let translationObserver = null; // OBSERVADOR: Para contenido dinámico

const ALL_LANGUAGES = [
    { name: 'Español', code: 'es', flag: '🇪🇸' },
    { name: 'English', code: 'en', flag: '🇺🇸' },
    { name: 'Français', code: 'fr', flag: '🇫🇷' },
    { name: 'Deutsch', code: 'de', flag: '🇩🇪' },
    { name: 'Português', code: 'pt', flag: '🇧🇷' },
    { name: '日本語', code: 'ja', flag: '🇯🇵' },
    { name: 'Русский', code: 'ru', flag: '🇷🇺' },
    { name: '中文', code: 'zh', flag: '🇨🇳' },
    { name: 'Potaxio', code: 'po', flag: '🥑' },
];

// UX: Debounce para entradas de texto vivo
const debounce = (fn, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
};

// UX: Typing Effect (Palabra por palabra)
function typeTextEffect(node, text) {
    if (!text) return;
    // OPTIMIZACIÓN: Renderizar de golpe si es largo o para evitar lag en letras rápidas
    if (text.length > 50) {
        node.nodeValue = text;
        return;
    }
    const words = text.split(' ');
    let current = "";
    let i = 0;
    const interval = setInterval(() => {
        if (i >= words.length) { clearInterval(interval); return; }
        current += (i > 0 ? " " : "") + words[i];
        node.nodeValue = current;
        i++;
    }, 5); // Acelerado de 30ms a 5ms para mayor fluidez
}

/**
 * Llama a la Cloud Function para traducir un array de textos.
 * @param {string[]} textos - Array con los textos a traducir.
 * @param {string} idiomaDestino - Código del idioma destino (ej. "en").
 * @returns {Promise<string[]>} - Promesa que resuelve a un array con los textos traducidos.
 */
async function traducirConHorus(textos, idiomaDestino) {
    const url = "https://us-central1-abrahamhorus1996.cloudfunctions.net/traducirHorus";
    const lyricsRegex = /^(\[\d{2}:\d{2}(?:[:.]\d{2,3})?\])\s*(.*)/; // REPRODUCTOR: Regex más flexible (soporta .000 o :00)
    
    // 1. MEMORIA: Verificar caché y preparar Batch
    const toFetch = [];
    const mapping = []; // Mantiene el orden y tipo de origen

    textos.forEach((texto, index) => {
        const cacheKey = `${idiomaDestino}_${texto}`;
        if (traduccionesCache.has(cacheKey)) {
            mapping[index] = { type: 'cache', value: traduccionesCache.get(cacheKey) };
        } else {
            // Procesar letras de canciones
            const match = texto.match(lyricsRegex);
            let payload = texto;
            let prefix = "";
            
            if (match) {
                prefix = match[1] + " "; // Guardar timestamp [00:00.00]
                payload = match[2]; // Texto a traducir
            }

            if (!payload.trim()) {
                mapping[index] = { type: 'immediate', value: texto };
            } else {
                mapping[index] = { type: 'fetch', original: texto, prefix, payload };
                toFetch.push(payload);
            }
        }
    });

    if (toFetch.length === 0) return mapping.map(m => m.value);

    // Filtrar duplicados para ahorrar tokens
    const uniqueToFetch = [...new Set(toFetch)];
    let translatedMap = {};

    // 2. Procesar Traducción (Local o API)
    if (idiomaDestino === 'po') {
        const terminaciones = ['e', 'i', 'o', 'u'];
        uniqueToFetch.forEach(txt => {
            translatedMap[txt] = txt.split(' ').map(palabra => {
                // Reemplaza la última vocal de la palabra por 'e' si cumple las condiciones
                let ultimaVocalIndex = -1;
                for (let i = palabra.length - 1; i >= 0; i--) {
                    if (terminaciones.includes(palabra[i].toLowerCase())) {
                        ultimaVocalIndex = i;
                        break;
                    }
                }
                if (ultimaVocalIndex !== -1) {
                    return palabra.substring(0, ultimaVocalIndex) + 'e' + palabra.substring(ultimaVocalIndex + 1);
                }
                return palabra;
            }).join(' ');
        });
    } else {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ textos: uniqueToFetch, targetLang: idiomaDestino })
            });

            if (!response.ok) throw new Error("API Error");
            
            const data = await response.json();
            if (data.traducciones) {
                uniqueToFetch.forEach((t, i) => translatedMap[t] = data.traducciones[i] || t);
            }
        } catch (error) {
            console.error('Error al llamar a la Cloud Function:', error);
            showToast("🥑 Error de red.");
            return textos; // Fallback
        }
    }

    // 3. Reconstruir y Actualizar Caché
    return mapping.map(m => {
        if (m.type === 'cache' || m.type === 'immediate') return m.value;
        
        const translatedText = translatedMap[m.payload] || m.payload;
        const finalResult = m.prefix + translatedText; // Re-adjuntar timestamp
        
        traduccionesCache.set(`${idiomaDestino}_${m.original}`, finalResult);
        return finalResult;
    });
}

// INFILTRACIÓN SHADOW DOM: Función recursiva
function getAllTextNodes(root) {
    let nodes = [];
    
    // 1. Escanear Light DOM actual
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: function(node) {
            const parentTag = node.parentElement ? node.parentElement.tagName.toLowerCase() : '';
            if (['script', 'style', 'pre', 'code', 'textarea'].includes(parentTag) || 
                (node.parentElement && node.parentElement.isContentEditable)) {
                return NodeFilter.FILTER_REJECT;
            }
            if (!node.nodeValue || node.nodeValue.trim().length <= 1) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
        }
    }, false);

    let node;
    while (node = walker.nextNode()) nodes.push(node);

    // 2. Infiltrar Shadow Roots (Recursión)
    const elements = root.querySelectorAll ? root.querySelectorAll('*') : [];
    elements.forEach(el => {
        if (el.shadowRoot) {
            nodes = nodes.concat(getAllTextNodes(el.shadowRoot));
        }
    });

    return nodes;
}

/**
 * Recorre el DOM, recolecta textos, los traduce y actualiza la UI.
 * @param {string} targetLang - Código del idioma al que se va a traducir.
 */
async function cambiarIdiomaHorus(targetLang) {
    if (isTranslating) {
        showToast("Traducción en progreso, espere un momento...");
        return;
    }
    isTranslating = true;
    const langData = ALL_LANGUAGES.find(l => l.code === targetLang);
    showToast(`Traduciendo a ${langData.name} ${langData.flag}...`);

    try {
        // --- Lógica para restaurar a Español ---
        if (targetLang === 'es') {
            if (originalTexts.size > 0) {
                for (const [node, originalText] of originalTexts.entries()) {
                    node.nodeValue = originalText;
                }
                originalTexts.clear(); // Limpiar el cache después de restaurar
                showToast("Idioma restaurado a Español.");
            }
            isTranslating = false;
            return;
        }

        // --- Lógica para traducir a otro idioma ---
        // Usar la nueva función de infiltración Shadow DOM
        const textNodes = getAllTextNodes(document.body);

        const aTraducir = textNodes.map(node => {
            // Guardar el original solo si no está ya en el cache (primera traducción desde 'es')
            if (!originalTexts.has(node)) {
                originalTexts.set(node, node.nodeValue);
            }
            // Devolvemos el texto original para la traducción
            return originalTexts.get(node);
        });

        if (aTraducir.length === 0) {
            isTranslating = false;
            return;
        }

        // Llamar a la función de la nube
        const textosTraducidos = await traducirConHorus(aTraducir, targetLang);

        if (textosTraducidos && textosTraducidos.length === textNodes.length) {
            textNodes.forEach((node, index) => {
                // UX: Typing Effect
                typeTextEffect(node, textosTraducidos[index]);
            });
            showToast("Traducción completada.");
        } else {
            showToast("Error durante la traducción, no se recibieron todos los textos.");
            // Restaurar por seguridad
            for (const [node, originalText] of originalTexts.entries()) {
                if (textNodes.includes(node)) {
                    node.nodeValue = originalText;
                }
            }
        }
    } catch (error) {
        console.error("Error en el proceso de cambio de idioma:", error);
        showToast("Ocurrió un error general al traducir.");
    } finally {
        isTranslating = false;
        
        // ACTIVAR OBSERVADOR PARA TEXTO NUEVO (Chat, Comentarios, etc.)
        if (translationObserver) translationObserver.disconnect();
        
        if (targetLang !== 'es') {
            // ACUMULADOR DE NODOS: Evita perder texto si el debounce descarta argumentos
            let pendingAddedNodes = [];

            const processTranslationQueue = debounce(async () => {
                if (pendingAddedNodes.length === 0) return;
                
                // Copiar y limpiar cola
                const nodesSnapshot = [...pendingAddedNodes];
                pendingAddedNodes = [];

                let textNodesToTranslate = [];
                nodesSnapshot.forEach(root => {
                    if (root.nodeType === Node.ELEMENT_NODE) textNodesToTranslate = textNodesToTranslate.concat(getAllTextNodes(root));
                    else if (root.nodeType === Node.TEXT_NODE && root.nodeValue.trim().length > 1) textNodesToTranslate.push(root);
                });
                
                // Filtrar duplicados
                textNodesToTranslate = [...new Set(textNodesToTranslate)];

                if (textNodesToTranslate.length === 0) return;

                // Guardar originales de lo nuevo
                textNodesToTranslate.forEach(n => { if (!originalTexts.has(n)) originalTexts.set(n, n.nodeValue); });

                const texts = textNodesToTranslate.map(n => n.nodeValue);
                const translated = await traducirConHorus(texts, targetLang);
                
                textNodesToTranslate.forEach((node, i) => {
                    if (translated[i] !== texts[i]) typeTextEffect(node, translated[i]);
                });
            }, 200);

            translationObserver = new MutationObserver((mutations) => {
                let hasUpdates = false;
                mutations.forEach(m => {
                    m.addedNodes.forEach(n => { pendingAddedNodes.push(n); hasUpdates = true; });
                });
                if (hasUpdates) processTranslationQueue();
            });
            
            translationObserver.observe(document.body, { childList: true, subtree: true });
        }
    }
}


function initLanguageSelector() {
    const datalist = document.getElementById('idiomas-lista');
    const input = document.getElementById('idioma-input');
    
    if (!datalist || !input) return;

    // 1. Llenar Datalist
    datalist.innerHTML = '';
    ALL_LANGUAGES.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang.name;
        option.setAttribute('data-code', lang.code);
        datalist.appendChild(option);
    });

    // 2. Lógica de Inicialización de Idioma
    let finalLangCode = 'es';
    const savedLangCode = localStorage.getItem('horus_user_pref_lang');
    
    if (savedLangCode && ALL_LANGUAGES.some(l => l.code === savedLangCode)) {
        finalLangCode = savedLangCode;
    } else {
        const browserLang = (navigator.language || 'es').substring(0, 2);
        if (ALL_LANGUAGES.some(l => l.code === browserLang)) {
            finalLangCode = browserLang;
        }
    }

    const langData = ALL_LANGUAGES.find(l => l.code === finalLangCode);
    if (langData) {
        input.value = langData.name;
    }

    // Traducir al cargar la página si el idioma guardado no es español
    if (finalLangCode !== 'es') {
        // Esperar a que el contenido principal se cargue un poco
        setTimeout(() => {
            console.log(`Iniciando traducción automática a: ${finalLangCode}`);
            cambiarIdiomaHorus(finalLangCode);
        }, 1500); 
    }

    // 3. Manejar selección del usuario
    input.addEventListener('change', debounce((e) => { // UX: Debounce 500ms
        const selectedName = e.target.value;
        const selectedLang = ALL_LANGUAGES.find(l => l.name.toLowerCase() === selectedName.toLowerCase());
        
        if (selectedLang) {
            if (selectedLang.code !== localStorage.getItem('horus_user_pref_lang')) {
                localStorage.setItem('horus_user_pref_lang', selectedLang.code);
                cambiarIdiomaHorus(selectedLang.code);
            }
        }
    }, 500));

    // UX Mejorada
    input.addEventListener('focus', () => {
        input.value = '';
        input.placeholder = 'Busca un idioma...';
    });
    input.addEventListener('blur', () => {
        const currentLangCode = localStorage.getItem('horus_user_pref_lang') || 'es';
        const currentLangData = ALL_LANGUAGES.find(l => l.code === currentLangCode);
        if (currentLangData) {
            input.value = currentLangData.name;
        }
        input.placeholder = 'Selecciona Idioma';
    });
}
