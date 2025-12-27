const firebaseConfig = { 
    databaseURL: "https://abrahamhorus1996-default-rtdb.firebaseio.com/", 
    projectId: "abrahamhorus1996" 
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();
let fanName = localStorage.getItem('fanName') || null;

// LIKES
db.ref('likes').on('value', s => {
    const el = document.getElementById('likes-count');
    if(el) el.innerText = (s.val() || 0).toLocaleString();
});
window.darLike = () => db.ref('likes').transaction(c => (c || 0) + 1);

// CHAT EN VIVO
const chatBox = document.getElementById('chat-box');
db.ref('messages').limitToLast(20).on('child_added', s => {
    const d = s.val();
    if (!chatBox) return;
    const div = document.createElement('div');
    const isVIP = d.text && d.text.startsWith('*');
    div.className = isVIP ? 'msg artista-vip' : 'msg';
    div.innerHTML = `<b>${isVIP ? '👑 LA POTRA' : (d.userName || 'Fan')}:</b> ${isVIP ? d.text.substring(1) : d.text}`;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    if(isVIP) document.getElementById('ding-sound').play().catch(()=>{});
});

window.enviarMsg = () => {
    const input = document.getElementById('user-msg');
    const text = input.value.trim();
    if (text) {
        if(!text.startsWith('*')) verificarNombre();
        db.ref('messages').push({ text: text, userName: text.startsWith('*') ? "LA POTRA" : fanName });
        input.value = "";
    }
};

// COMENTARIOS
db.ref('comments').on('value', s => {
    const el = document.getElementById('comments-count');
    if(el) el.innerText = s.numChildren();
});

db.ref('comments').on('child_added', snap => {
    const c = snap.val();
    const id = snap.key;
    const list = document.getElementById('comments-list');
    if(!list) return;

    const div = document.createElement('div');
    div.className = 'comment-item';
    div.id = `comment-${id}`;
    div.innerHTML = `
        <span class="comment-user">@${c.userName}</span>
        <p class="comment-content">${c.text}</p>
        <button class="reply-btn" onclick="window.abrirReply('${id}')">Responder</button>
        <div id="replies-${id}" class="replies-container"></div>
    `;
    list.prepend(div);

    db.ref(`replies/${id}`).on('child_added', rs => {
        const r = rs.val();
        const rDiv = document.createElement('div');
        rDiv.style.marginTop = "8px";
        rDiv.innerHTML = `<span class="comment-user" style="font-size:0.75rem">@${r.userName}</span>
                          <p class="comment-content" style="font-size:0.85rem">${r.text}</p>`;
        document.getElementById(`replies-${id}`).appendChild(rDiv);
    });
});

window.enviarComentario = () => {
    const input = document.getElementById('comment-text');
    const text = input.value.trim();
    if (text) {
        verificarNombre();
        db.ref('comments').push({ text: text, userName: fanName });
        input.value = "";
    }
};

window.abrirReply = (id) => {
    if (document.getElementById(`ri-${id}`)) return;
    const w = document.createElement('div');
    w.id = `ri-${id}`;
    w.style.display = "flex"; w.style.gap = "5px"; w.style.marginTop = "5px";
    w.innerHTML = `
        <input type="text" id="ti-${id}" placeholder="Responde..." style="flex:1; background:#111; border:1px solid #333; color:#fff; padding:5px; border-radius:5px;">
        <button onclick="window.enviarReply('${id}')" style="background:var(--accent); border:none; border-radius:5px; padding:0 10px; cursor:pointer; font-weight:bold;">OK</button>
    `;
    document.getElementById(`comment-${id}`).appendChild(w);
};

window.enviarReply = (id) => {
    const input = document.getElementById(`ti-${id}`);
    const text = input.value.trim();
    if (text) {
        verificarNombre();
        db.ref(`replies/${id}`).push({ text: text, userName: fanName });
        document.getElementById(`ri-${id}`).remove();
    }
};

function verificarNombre() {
    if (!fanName) {
        fanName = prompt("¡Dinos tu apodo!");
        if (!fanName) fanName = "Fan" + Math.floor(Math.random()*99);
        localStorage.setItem('fanName', fanName);
    }
}

// Evento ENTER para el chat
document.getElementById('user-msg').addEventListener('keypress', (e) => {
    if(e.key === 'Enter') window.enviarMsg();
});

window.showPage = (id) => {
    document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if(event) event.currentTarget.classList.add('active');
};