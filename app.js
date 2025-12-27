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

// 2. VARIABLES GLOBALES
let currentUser = null;
const viewCountElement = document.getElementById('live-views');
const chatBox = document.getElementById('chat-box');
const chatInput = document.getElementById('user-msg');
const sendBtn = document.getElementById('send-msg');
const ding = document.getElementById('ding-sound');

// 3. OBSERVADOR DE SESIÓN (Detecta si ya se logueó antes)
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        console.log("VIP Logueado:", user.displayName);
        // Ocultamos el modal si estaba abierto
        closeLogin();
        // Guardamos o actualizamos al lead en la DB
        db.ref('leads/' + user.uid).update({
            nombre: user.displayName,
            email: user.email,
            foto: user.photoURL,
            ultimaConexion: Date.now()
        });
    } else {
        currentUser = null;
        console.log("Navegando como invitado");
    }
});

// 4. FUNCIÓN LOGIN CON GOOGLE
window.loginConGoogle = () => {
    auth.signInWithPopup(provider)
        .then((result) => {
            console.log("Acceso concedido");
        })
        .catch((error) => {
            console.error("Error en login:", error);
            alert("No se pudo iniciar sesión. Inténtalo de nuevo.");
        });
};

// 5. NAVEGACIÓN TIPO INSTAGRAM (Público vs Privado)
window.showPage = (pageId) => {
    // Si intenta entrar a algo que no sea 'p-videos' y no está logueado
    if (pageId !== 'p-videos' && !currentUser) {
        document.getElementById('login-modal').style.display = 'flex';
        return;
    }

    // Cambiar clases de visualización
    document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    document.getElementById(pageId).classList.add('active');
    
    // Iluminar icono en la nav (necesitamos encontrar el elemento que disparó el clic)
    const items = document.querySelectorAll('.nav-item');
    if (pageId === 'p-videos') items[0].classList.add('active');
    if (pageId === 'p-fotos') items[1].classList.add('active');
    if (pageId === 'p-eventos') items[2].classList.add('active');
    if (pageId === 'p-tienda') items[3].classList.add('active');
};

window.closeLogin = () => {
    document.getElementById('login-modal').style.display = 'none';
};

// 6. SIMULADOR DE FANS (100 a 10,000)
setInterval(() => {
    if (viewCountElement) {
        let count = parseInt(viewCountElement.innerText.replace(',', ''));
        if (isNaN(count) || count < 100) count = 2540;

        let change = Math.floor(Math.random() * 80) - 30;
        let newCount = count + change;

        if (newCount < 100) newCount = 110;
        if (newCount > 10000) newCount = 9800;

        viewCountElement.innerText = newCount.toLocaleString();
    }
}, 3500);

// 7. LÓGICA DEL CHAT (ENVIAR)
const enviarMensaje = () => {
    const text = chatInput.value.trim();
    
    // Si no está logueado, le pedimos que se registre para hablar
    if (!currentUser) {
        document.getElementById('login-modal').style.display = 'flex';
        return;
    }

    if (text !== "") {
        db.ref('messages').push({
            text: text,
            userName: currentUser.displayName,
            userFoto: currentUser.photoURL,
            userId: currentUser.uid,
            timestamp: Date.now()
        }).then(() => {
            chatInput.value = "";
        });
    }
};

sendBtn.addEventListener('click', enviarMensaje);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') enviarMensaje();
});

// 8. LÓGICA DEL CHAT (RECIBIR CON FOTOS Y EFECTO DIVA)
db.ref('messages').limitToLast(15).on('child_added', (snapshot) => {
    const data = snapshot.val();
    const msgDiv = document.createElement('div');

    if (data.text.startsWith('*')) {
        // MENSAJE DE LA POTRA
        msgDiv.className = 'msg artista-vip';
        msgDiv.innerHTML = `<span>👑 LA POTRA:</span> ${data.text.substring(1)}`;
        if (ding) ding.play().catch(() => {});
    } else {
        // MENSAJE DE FAN CON FOTO DE GOOGLE
        msgDiv.className = 'msg fan-msg';
        const foto = data.userFoto || 'https://via.placeholder.com/30';
        msgDiv.style.display = 'flex';
        msgDiv.style.gap = '10px';
        msgDiv.style.alignItems = 'center';
        
        msgDiv.innerHTML = `
            <img src="${foto}" style="width:30px; height:30px; border-radius:50%; border:1px solid #333;">
            <div style="display:flex; flex-direction:column;">
                <span style="font-size:0.65rem; color:#888;">${data.userName || 'Fan'}</span>
                <p style="margin:0; font-size:0.85rem;">${data.text}</p>
            </div>
        `;
    }

    chatBox.appendChild(msgDiv);
    
    setTimeout(() => {
        chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
    }, 100);
});