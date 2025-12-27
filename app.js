document.addEventListener('DOMContentLoaded', () => {
    // 1. CONFIGURACIÓN FIREBASE
    const firebaseConfig = {
        databaseURL: "https://abrahamhorus1996-default-rtdb.firebaseio.com/",
        projectId: "abrahamhorus1996"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.database();

    // 2. ELEMENTOS DEL DOM (Asegúrate que estos IDs coincidan con tu HTML)
    const viewCountElement = document.getElementById('live-views'); // Cambiado para tu HTML
    const leadForm = document.getElementById('lead-form');
    const chatBox = document.getElementById('chat-box');
    const chatInput = document.getElementById('user-msg');
    const sendBtn = document.getElementById('send-msg');
    const ding = document.getElementById('ding-sound');

    // 3. SIMULACIÓN DE CONTADOR (La chispa de la página)
    setInterval(() => {
        if (viewCountElement) {
            let count = parseInt(viewCountElement.innerText);
            let change = Math.floor(Math.random() * 5) - 2; 
            viewCountElement.innerText = Math.max(50, count + change);
        }
    }, 4000);

    // 4. CAPTURA DE LEADS Y REDIRECCIÓN A WHATSAPP
    if (leadForm) {
        leadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const country = document.getElementById('country').value;
            const submitBtn = leadForm.querySelector('button');

            submitBtn.innerText = "REGISTRANDO...";
            submitBtn.disabled = true;

            // Guardar en Firebase
            db.ref('leads').push({
                email: email,
                country: country,
                timestamp: Date.now()
            }).then(() => {
                submitBtn.innerText = "¡LISTO! REDIRIGIENDO...";
                submitBtn.style.backgroundColor = "#00ff88";
                
                setTimeout(() => {
                    window.open("https://chat.whatsapp.com/TU_LINK_DE_GRUPO", "_blank");
                    submitBtn.disabled = false;
                    submitBtn.innerText = "ACCESO VIP";
                    leadForm.reset();
                }, 1500);
            });
        });
    }

    // 5. ENVIAR MENSAJES REALES A FIREBASE
    const sendMessage = () => {
        const text = chatInput.value.trim();
        if (text !== "") {
            sendBtn.disabled = true;
            db.ref('messages').push({
                text: text,
                timestamp: Date.now()
            }).then(() => {
                chatInput.value = "";
                sendBtn.disabled = false;
            }).catch(() => {
                sendBtn.disabled = false;
            });
        }
    };

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // 6. RECIBIR MENSAJES EN TIEMPO REAL (Filtro Potra + Ding)
    db.ref('messages').limitToLast(15).on('child_added', (snapshot) => {
        const data = snapshot.val();
        if (!data.text) return;

        const msgDiv = document.createElement('div');
        
        if (data.text.startsWith('*')) {
            msgDiv.className = 'msg artista-vip';
            msgDiv.innerHTML = `<span>👑 LA POTRA:</span> ${data.text.substring(1)}`;
            if(ding) ding.play().catch(() => {});
        } else {
            msgDiv.className = 'msg';
            msgDiv.innerHTML = `<span>Fan:</span> ${data.text}`;
        }

        chatBox.appendChild(msgDiv);

        // Scroll suave para que no se trabe
        setTimeout(() => {
            chatBox.scrollTo({
                top: chatBox.scrollHeight,
                behavior: 'smooth'
            });
        }, 100);
    });
});