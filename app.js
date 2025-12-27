// 1. CONFIGURACIÓN FIREBASE
const firebaseConfig = {
    databaseURL: "https://abrahamhorus1996-default-rtdb.firebaseio.com/",
    projectId: "abrahamhorus1996"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// 2. ELEMENTOS DEL DOM
const viewCountElement = document.getElementById('live-views');
const chatBox = document.getElementById('chat-box');
const chatInput = document.getElementById('user-msg');
const sendBtn = document.getElementById('send-msg');
const ding = document.getElementById('ding-sound');

let currentUser = null;

// 3. CONTROL DE SESIÓN
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        // Si hay modal abierto, lo cerramos
        const modal = document.getElementById('login-modal');
        if(modal) modal.style.display = 'none';
        
        // Guardar lead
        db.ref('leads/' + user.uid).update({
            nombre: user.displayName,
            email: user.email,
            foto: user.photoURL,
            ultimaConexion: Date.now()
        });
    }
});

// 4. FUNCIONES DE NAVEGACIÓN Y LOGIN
window.loginConGoogle = () => {
    auth.signInWithPopup(provider).catch(err => console.error("Error Login:", err));
};

window.showPage = (pageId) => {
    // Si la página es VIP y no hay usuario, lanzamos modal
    if (pageId !== 'p-videos' && !currentUser) {
        document.getElementById('login-modal').style.display = 'flex';
        return;
    }

    // Cambiar clases
    document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    document.getElementById(pageId).classList.add('active');
    
    // Iluminar icono
    const navItems = document.querySelectorAll('.nav-item');
    if (pageId === 'p-videos') navItems[0].classList.add('active');
    if (pageId === 'p-fotos') navItems[1].classList.add('active');
    if (pageId === 'p-eventos') navItems[2].classList.add('active');
    if (pageId === 'p-tienda') navItems[3].classList.add('active');
};

window.closeLogin = () => {
    document.getElementById('login-modal').style.display = 'none';
};

// 5. ENVIAR MENSAJE (Solo si está logueado)
const enviarMensaje = () => {
    const text = chatInput.value.trim();
    
    if (!currentUser) {
        document.getElementById('login-modal').style.display = 'flex';
        return;
    }

    if (text !== "") {
        db.ref('messages').push({
            text: text,
            userName: currentUser.displayName,
            userFoto: currentUser.photoURL,
            timestamp: Date.now()
        }).then(() => {
            chatInput.value = "";
        });
    }
};

if(sendBtn) sendBtn.addEventListener('click', enviarMensaje);
if(chatInput) chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') enviarMensaje(); });

// 6. RECIBIR MENSAJES (Con foto y efecto Potra)
db.ref('messages').limitToLast(20).on('child_added', (snapshot) => {
    const data = snapshot.val();
    if (!chatBox) return;

    const msgDiv = document.createElement('div');
    
    if (data.text.startsWith('*')) {
        msgDiv.className = 'msg artista-vip';
        msgDiv.innerHTML = `<span>👑 LA POTRA:</span> ${data.text.substring(1)}`;
        if (ding) ding.play().catch(() => {});
    } else {
        msgDiv.className = 'msg';
        const foto = data.userFoto || 'https://via.placeholder.com/30';
        msgDiv.style.display = 'flex';
        msgDiv.style.gap = '10px';
        msgDiv.innerHTML = `
            <img src="${foto}" style="width:30px; height:30px; border-radius:50%;">
            <div>
                <span style="font-size:0.7rem; color:var(--accent);">${data.userName || 'Fan'}</span>
                <p style="margin:0;">${data.text}</p>
            </div>
        `;
    }

    chatBox.appendChild(msgDiv);
    setTimeout(() => {
        chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
    }, 100);
});

// 7. CONTADOR DE FANS (Simulado Pro)
setInterval(() => {
    if (viewCountElement) {
        let count = parseInt(viewCountElement.innerText.replace(',', '')) || 2540;
        let change = Math.floor(Math.random() * 60) - 25;
        let newCount = Math.max(100, Math.min(10000, count + change));
        viewCountElement.innerText = newCount.toLocaleString();
    }
}, 4000);