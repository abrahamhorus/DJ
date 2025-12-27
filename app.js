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
        let count = parseInt(viewCountElement.innerText.replace(',', '')); // Limpiamos comas si las hay
        
        // Si el número es menor a 100, lo subimos de golpe para el "arranque"
        if (count < 100) {
            count = Math.floor(Math.random() * (500 - 100 + 1)) + 100;
        }

        // Definimos un cambio aleatorio (entre ganar 50 o perder 30 fans)
        let change = Math.floor(Math.random() * 80) - 30; 
        let newCount = count + change;

        // Mantenemos el rango entre 100 y 10,000
        if (newCount < 100) newCount = 100 + Math.floor(Math.random() * 20);
        if (newCount > 10000) newCount = 9900 - Math.floor(Math.random() * 50);

        // Lo pintamos con formato de miles para que se vea pro (ej. 1,250)
        viewCountElement.innerText = newCount.toLocaleString();
    }
}, 3000); // Cambia cada 3 segundos para que se vea activo

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
// CONFIGURACIÓN DE PROVEEDOR
const provider = new firebase.auth.GoogleAuthProvider();

// FUNCIÓN PARA LOGUEARSE
const loginConGoogle = () => {
    firebase.auth().signInWithPopup(provider)
        .then((result) => {
            const user = result.user;
            console.log("Bienvenido:", user.displayName);
            // Aquí ocultamos el login y mostramos la app
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('app-content').style.display = 'block';
        })
        .catch((error) => {
            console.error("Error en login:", error);
        });
};