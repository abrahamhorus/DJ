const firebaseConfig = {
    databaseURL: "https://abrahamhorus1996-default-rtdb.firebaseio.com/",
    projectId: "abrahamhorus1996"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

let currentUser = null;

// GESTIÓN DE PÁGINAS
window.showPage = (pageId) => {
    if (pageId !== 'p-videos' && !currentUser) {
        document.getElementById('login-modal').style.display = 'flex';
        return;
    }
    document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    // Actualizar Nav
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    // (Asignar la clase active según el orden si es necesario)
};

window.closeLogin = () => document.getElementById('login-modal').style.display = 'none';

window.loginConGoogle = () => {
    auth.signInWithPopup(provider).then(() => location.reload()).catch(e => console.log(e));
};

auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        document.getElementById('login-modal').style.display = 'none';
    }
});

// LÓGICA DE CHAT RE-CONECTADA
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('send-msg');
    const input = document.getElementById('user-msg');
    const box = document.getElementById('chat-box');

    function enviar() {
        const t = input.value.trim();
        if (!currentUser) { document.getElementById('login-modal').style.display = 'flex'; return; }
        if (t !== "") {
            db.ref('messages').push({
                text: t,
                userName: currentUser.displayName,
                userFoto: currentUser.photoURL,
                timestamp: Date.now()
            });
            input.value = "";
        }
    }

    if (btn) btn.onclick = enviar;
    if (input) input.onkeypress = (e) => { if (e.key === 'Enter') enviar(); };

    // ESCUCHAR FIREBASE
    db.ref('messages').limitToLast(20).on('child_added', (snap) => {
        const d = snap.val();
        const div = document.createElement('div');
        div.className = 'msg';
        div.innerHTML = `<span>${d.userName || 'Fan'}:</span> ${d.text}`;
        box.appendChild(div);
        box.scrollTop = box.scrollHeight;
    });
});

// CONTADOR
setInterval(() => {
    const el = document.getElementById('live-views');
    if (el) {
        let n = parseInt(el.innerText.replace(',','')) + Math.floor(Math.random()*20-10);
        el.innerText = Math.max(100, n).toLocaleString();
    }
}, 3000);