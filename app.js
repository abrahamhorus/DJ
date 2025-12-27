const firebaseConfig = {
    databaseURL: "https://abrahamhorus1996-default-rtdb.firebaseio.com/",
    projectId: "abrahamhorus1996"
};
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.database();
let fanName = localStorage.getItem('fanName') || null;

// 1. LIKES & CONTADOR
db.ref('likes').on('value', snap => {
    document.getElementById('likes-count').innerText = (snap.val() || 0).toLocaleString();
});
window.darLike = () => db.ref('likes').transaction(c => (c || 0) + 1);

db.ref('comments').on('value', snap => {
    document.getElementById('comments-count').innerText = snap.numChildren();
});

// 2. CHAT EN VIVO
db.ref('messages').limitToLast(20).on('child_added', snap => {
    const d = snap.val();
    const div = document.createElement('div');
    if (d.text.startsWith('*')) {
        div.className = 'msg artista-vip';
        div.innerHTML = `<b>👑 LA POTRA:</b> ${d.text.substring(1)}`;
        document.getElementById('ding-sound').play().catch(()=>{});
    } else {
        div.className = 'msg';
        div.innerHTML = `<b>${d.userName}:</b> ${d.text}`;
    }
    document.getElementById('chat-box').appendChild(div);
    document.getElementById('chat-box').scrollTop = document.getElementById('chat-box').scrollHeight;
});

window.enviarMsg = () => {
    const input = document.getElementById('user-msg');
    if (input.value.trim()) {
        verificarNombre();
        db.ref('messages').push({ text: input.value, userName: fanName });
        input.value = "";
    }
};

// 3. COMENTARIOS Y RESPUESTAS
db.ref('comments').on('child_added', snap => {
    const c = snap.val();
    const id = snap.key;
    const div = document.createElement('div');
    div.className = 'comment-item';
    div.id = `comment-${id}`;
    div.innerHTML = `
        <span class="comment-user">@${c.userName}</span>
        <span class="comment-content">${c.text}</span>
        <button class="reply-btn" onclick="abrirReply('${id}')">Responder</button>
        <div id="replies-${id}" class="replies-container"></div>
    `;
    document.getElementById('comments-list').prepend(div);

    // Escuchar respuestas para este comentario
    db.ref(`replies/${id}`).on('child_added', rSnap => {
        const r = rSnap.val();
        const rDiv = document.createElement('div');
        rDiv.style.marginBottom = "10px";
        rDiv.innerHTML = `<span class="comment-user" style="font-size:0.75rem">@${r.userName}</span>
                          <span class="comment-content" style="font-size:0.85rem">${r.text}</span>`;
        document.getElementById(`replies-${id}`).appendChild(rDiv);
    });
});

window.enviarComentario = () => {
    const input = document.getElementById('comment-text');
    if (input.value.trim()) {
        verificarNombre();
        db.ref('comments').push({ text: input.value, userName: fanName });
        input.value = "";
    }
};

window.abrirReply = (id) => {
    if (document.getElementById(`ri-${id}`)) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'reply-input-wrapper';
    wrapper.id = `ri-${id}`;
    wrapper.innerHTML = `
        <input type="text" id="ti-${id}" placeholder="Escribe respuesta...">
        <button onclick="enviarReply('${id}')" style="background:var(--accent);border:none;border-radius:4px;padding:2px 8px;font-size:10px;cursor:pointer">OK</button>
    `;
    document.getElementById(`comment-${id}`).appendChild(wrapper);
};

window.enviarReply = (id) => {
    const input = document.getElementById(`ti-${id}`);
    if (input.value.trim()) {
        verificarNombre();
        db.ref(`replies/${id}`).push({ text: input.value, userName: fanName });
        document.getElementById(`ri-${id}`).remove();
    }
};

function verificarNombre() {
    if (!fanName) {
        fanName = prompt("¿Tu nombre?");
        if (!fanName) fanName = "Fan" + Math.floor(Math.random()*99);
        localStorage.setItem('fanName', fanName);
    }
}

document.getElementById('send-msg').onclick = enviarMsg;
window.showPage = (id) => {
    document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
};