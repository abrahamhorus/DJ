document.addEventListener('DOMContentLoaded', () => {
    const subscribeForm = document.getElementById('subscribe-form');
    const viewCountElement = document.getElementById('view-count');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');

    // 1. SIMULACIÓN DE CONTADOR DINÁMICO
    setInterval(() => {
        let count = parseInt(viewCountElement.innerText);
        let change = Math.floor(Math.random() * 5) - 2; 
        viewCountElement.innerText = Math.max(50, count + change);
    }, 4000);

    // 2. LÓGICA DE SUSCRIPCIÓN Y REDIRECCIÓN
    subscribeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('user-email').value;
        const country = document.getElementById('country-select').value;
        const btn = document.getElementById('submit-btn');

        // Efecto visual de carga
        btn.innerText = "REGISTRANDO...";
        btn.disabled = true;

        console.log(`Lead capturado: ${email} de ${country}`);

        setTimeout(() => {
            btn.innerText = "¡LISTO! REDIRIGIENDO...";
            btn.style.backgroundColor = "#00ff88";
            
            // Redirige al grupo de WhatsApp (Abre en nueva pestaña)
            window.open("https://chat.whatsapp.com/TU_LINK_DE_GRUPO", "_blank");
        }, 1500);
    });

    // 3. SIMULACIÓN DE CHAT (Para que no se vea vacío al inicio)
    const sendMessage = () => {
        const text = chatInput.value.trim();
        if (text !== "") {
            const msgDiv = document.createElement('div');
            msgDiv.className = 'message';
            msgDiv.innerHTML = `<span class="name">Tú:</span> ${text}`;
            chatMessages.appendChild(msgDiv);
            chatInput.value = "";
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    };

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
});