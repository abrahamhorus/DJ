// 1. FIREBASE CONFIG
const firebaseConfig = {
    databaseURL: "https://abrahamhorus1996-default-rtdb.firebaseio.com/",
    projectId: "abrahamhorus1996"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.database();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

let currentUser = null;

// 2. SESIÓN DE USUARIO
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        console.log("Sesión activa");
        if(document.getElementById('login-modal')) document.getElementById('login-modal').style.display = 'none';
    }
});

// 3. FUNCIONES DE NAVEGACIÓN
window.showPage = function(pageId) {
    if (pageId !== 'p-videos' && !currentUser) {
        document.getElementById('login-modal').style.display = 'flex';
        return;
    }
    document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    document.getElementById(pageId).classList.add('active');
};

window.loginConGoogle = function() {
    auth.signInWithPopup(provider).then(() => {
        location.reload();
    }).catch(err => alert("Error Google: " + err.message));
};

window.closeLogin = function() {
    document.getElementById('login-modal').style.display = 'none';
};

// 4. LÓGICA DEL CHAT
document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box');
    const sendBtn = document.getElementById('send-msg');
    const chatInput = document.getElementById('user-msg');
    const ding = document.getElementById('ding-sound');

    // Escuchar mensajes
    db.ref('messages').limitToLast(20).on('child_added', (snap) => {
        const d = snap.val();
        if (!chatBox) return;

        const div = document.createElement('div');
        if (d.text.startsWith('*')) {
            div.className = 'msg artista-vip';
            div.innerHTML = `<b>👑 LA POTRA:</b> ${d.text.substring(1)}`;
            if(ding) ding.play().catch(()=>{});
        } else {
            div.className = 'msg';
            div.innerHTML = `<b>${d.userName || 'Fan'}:</b> ${d.text}`;
        }
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
    });

    // Enviar mensaje
    function enviar() {
        if (!currentUser) {
            document.getElementById('login-modal').style.display = 'flex';
            return;
        }
        const text = chatInput.value.trim();
        if (text !== "") {
            db.ref('messages').push({
                text: text,
                userName: currentUser.displayName,
                timestamp: Date.now()
            });
            chatInput.value = "";
        }
    }

    if(sendBtn) sendBtn.onclick = enviar;
    if(chatInput) chatInput.onkeypress = (e) => { if (e.key === 'Enter') enviar(); };
});

// 5. CONTADOR DE FANS
setInterval(() => {
    const el = document.getElementById('live-views');
    if (el) {
        let n = parseInt(el.innerText.replace(',','')) || 2540;
        n += Math.floor(Math.random() * 20) - 10;
        el.innerText = Math.max(100, n).toLocaleString();
    }
}, 3000);