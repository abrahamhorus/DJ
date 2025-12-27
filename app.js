const firebaseConfig = {
    databaseURL: "https://abrahamhorus1996-default-rtdb.firebaseio.com/",
    projectId: "abrahamhorus1996"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.database();
let fanName = localStorage.getItem('fanName') || null;

const chatBox = document.getElementById('chat-box');
db.ref('messages').limitToLast(20).on('child_added', (snap) => {
    const d = snap.val();
    if (!chatBox) return;
    const div = document.createElement('div');
    if (d.text && d.text.trim().startsWith('*')) {
        div.className = 'msg artista-vip';
        div.innerHTML = `<b>👑 LA POTRA:</b> ${d.text.trim().substring(1)}`;
        const ding = document.getElementById('ding-sound');
        if(ding) ding.play().catch(()=>{});
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
        if (!text.startsWith('*') && !fanName) {
            fanName = prompt("¡Dinos tu nombre o apodo!");
            if (!fanName) fanName = "Fan Anónimo";
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

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('send-msg').onclick = window.enviarMsg;
    document.getElementById('user-msg').onkeypress = (e) => { if(e.key === 'Enter') window.enviarMsg(); };
});

window.showPage = (id) => {
    document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    event.currentTarget.classList.add('active');
};