const firebaseConfig = {
    databaseURL: "https://abrahamhorus1996-default-rtdb.firebaseio.com/",
    projectId: "abrahamhorus1996"
};
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.database();
let fanName = localStorage.getItem('fanName') || null;

// LIKES
db.ref('likes').on('value', (snap) => {
    document.getElementById('likes-count').innerText = (snap.val() || 0).toLocaleString();
});

window.darLike = function() {
    db.ref('likes').transaction((c) => (c || 0) + 1);
};

// CHAT EN VIVO
const chatBox = document.getElementById('chat-box');
db.ref('messages').limitToLast(15).on('child_added', (snap) => {
    const d = snap.val();
    const div = document.createElement('div');
    if (d.text && d.text.trim().startsWith('*')) {
        div.className = 'msg artista-vip';
        div.innerHTML = `<b>👑 LA POTRA:</b> ${d.text.trim().substring(1)}`;
        document.getElementById('ding-sound').play().catch(()=>{});
    } else {
        div.className = 'msg';
        div.innerHTML = `<b>${d.userName || 'Fan'}:</b> ${d.text}`;
    }
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
});

window.enviarMsg = function() {
    const input = document.getElementById('user-msg');
    const text = input.value.trim();
    if (text !== "") {
        verificarNombre();
        db.ref('messages').push({ text: text, userName: text.startsWith('*') ? "LA POTRA" : fanName });
        input.value = "";
    }
};

// COMENTARIOS TIPO YOUTUBE
const comList = document.getElementById('comments-list');
db.ref('comments').on('child_added', (snap) => {
    const c = snap.val();
    const div = document.createElement('div');
    div.className = 'comment-item';
    div.innerHTML = `<span class="comment-user">@${c.userName}</span><span class="comment-content">${c.text}</span>`;
    comList.prepend(div);
});

window.enviarComentario = function() {
    const input = document.getElementById('comment-text');
    const text = input.value.trim();
    if (text !== "") {
        verificarNombre();
        db.ref('comments').push({ text: text, userName: fanName });
        input.value = "";
    }
};

function verificarNombre() {
    if (!fanName) {
        fanName = prompt("¡Dinos tu apodo!");
        if (!fanName) fanName = "Fan";
        localStorage.setItem('fanName', fanName);
    }
}

document.getElementById('send-msg').onclick = enviarMsg;
document.getElementById('user-msg').onkeypress = (e) => { if(e.key === 'Enter') enviarMsg(); };

window.showPage = (id) => {
    document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    event.currentTarget.classList.add('active');
};