// CONFIGURACIÓN DE TU FIREBASE
const firebaseConfig = {
    databaseURL: "https://abrahamhorus1996-default-rtdb.firebaseio.com/",
    projectId: "abrahamhorus1996"
};

// Inicializar Firebase
if (!firebase.apps.length) { 
    firebase.initializeApp(firebaseConfig); 
}
const db = firebase.database();

// VARIABLES DE USUARIO
let fanName = localStorage.getItem('fanName') || null;

// 1. ESCUCHAR MENSAJES EN TIEMPO REAL
const chatBox = document.getElementById('chat-box');
db.ref('messages').limitToLast(25).on('child_added', (snap) => {
    const d = snap.val();
    if (!chatBox) return;

    const div = document.createElement('div');
    
    // DETECCIÓN DE MENSAJE DE LA PATRONA (Empieza con *)
    if (d.text && d.text.trim().startsWith('*')) {
        div.className = 'msg artista-vip'; 
        // Quitamos el asterisco y mostramos el título de Reina
        div.innerHTML = `<b>👑 LA POTRA:</b> ${d.text.trim().substring(1)}`;
        
        // Sonido opcional si lo tienes
        const ding = document.getElementById('ding-sound');
        if(ding) ding.play().catch(()=>{});
    } else {
        // Mensaje normal de fan
        div.className = 'msg';
        div.innerHTML = `<b>${d.userName || 'Fan'}:</b> ${d.text}`;
    }
    
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll al último mensaje
});

// 2. FUNCIÓN PARA ENVIAR MENSAJES
window.enviarMsg = function() {
    const input = document.getElementById('user-msg');
    const text = input.value.trim();

    if (text !== "") {
        // Si es un fan y no tiene nombre, se lo pedimos una sola vez
        if (!text.startsWith('*') && !fanName) {
            fanName = prompt("¡Dinos tu nombre o apodo!");
            if (!fanName || fanName.trim() === "") fanName = "Fan Anónimo";
            localStorage.setItem('fanName', fanName);
        }

        db.ref('messages').push({
            text: text,
            userName: text.startsWith('*') ? "LA POTRA" : fanName,
            timestamp: Date.now()
        });
        input.value = "";
    }
};

// 3. ASIGNAR EVENTOS (Click y Enter)
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('send-msg');
    const input = document.getElementById('user-msg');

    if(btn) btn.onclick = window.enviarMsg;
    if(input) {
        input.onkeypress = (e) => { 
            if(e.key === 'Enter') window.enviarMsg(); 
        };
    }
});

//