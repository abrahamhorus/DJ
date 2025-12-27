const firebaseConfig = {
    databaseURL: "https://abrahamhorus1996-default-rtdb.firebaseio.com/",
    projectId: "abrahamhorus1996"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.database();

// 1. CARGAR CHAT (Sincronizado con tu CSS)
const chatBox = document.getElementById('chat-box');
db.ref('messages').limitToLast(20).on('child_added', (snap) => {
    const d = snap.val();
    if (chatBox) {
        const div = document.createElement('div');
        div.className = 'msg';
        div.innerHTML = `<b>${d.userName || 'Fan'}:</b> ${d.text}`;
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
    }
});

// 2. ENVIAR MENSAJE (SIN AUTENTICACIÓN)
window.enviarMsg = function() {
    const input = document.getElementById('user-msg');
    const text = input.value.trim();
    
    if (text !== "") {
        db.ref('messages').push({
            text: text,
            userName: "Fan Anónimo", // Nombre por defecto
            timestamp: Date.now()
        });
        input.value = "";
    }
};

// 3. ASIGNAR EVENTOS
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('send-msg');
    const input = document.getElementById('user-msg');
    
    if(btn) btn.onclick = window.enviarMsg;
    if(input) input.onkeypress = (e) => { if(e.key === 'Enter') window.enviarMsg(); };
});

// 4. NAVEGACIÓN LIBRE
window.showPage = (id) => {
    document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const target = document.getElementById(id);
    if(target) target.classList.add('active');
};