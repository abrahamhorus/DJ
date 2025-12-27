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

// 3. CONTROL DE SESIÓN
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        const modal = document.getElementById('login-modal');
        if(modal) modal.style.display = 'none';
        
        db.ref('leads/' + user.uid).update({
            nombre: user.displayName,
            email: user.email,
            foto: user.photoURL,
            ultimaConexion: Date.now()
        });
    }
});

// 4. FUNCIONES DE LOGIN Y NAVEGACIÓN
window.loginConGoogle = () => {
    auth.signInWithPopup(provider).catch(err => console.log(err));
};

window.showPage = (pageId) => {
    if (pageId !== 'p-videos' && !currentUser) {
        document.getElementById('login-modal').style.display = 'flex';
        return;
    }
    document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    // Iluminar icono correctamente
    const icons = document.querySelectorAll('.nav-item');
    if(pageId === 'p-videos') icons[0].classList.add('active');
    if(pageId === 'p-fotos') icons[1].classList.add('active');
    if(pageId === 'p-eventos') icons[2].classList.add('active');
    if(pageId === 'p-tienda') icons[3].classList.add('active');
};

window.closeLogin = () => {
    document.getElementById('login-modal').style.display = 'none';
};

// 5. LÓGICA DEL CHAT (ENVIAR Y RECIBIR)
document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box'); // Lo buscamos adentro
    const ding = document.getElementById('ding-sound');

    // ESCUCHAR MENSAJES (Movido aquí adentro para seguridad)
    db.ref('messages').limitToLast(20).on('child_added', (snapshot) => {
        const data = snapshot.val();
        if (!chatBox) return;

        const msgDiv = document.createElement('div');
        // ... (resto del código de la potra y fans que ya tienes) ...
        
        chatBox.appendChild(msgDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    });
});
// 6. CONTADOR DE FANS
setInterval(() => {
    const el = document.getElementById('live-views');
    if (el) {
        let count = parseInt(el.innerText.replace(',', '')) || 2540;
        let change = Math.floor(Math.random() * 60) - 25;
        let newCount = Math.max(100, Math.min(10000, count + change));
        el.innerText = newCount.toLocaleString();
    }
}, 4000);