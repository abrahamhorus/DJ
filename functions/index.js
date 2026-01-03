const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Definimos el secreto (la API Key que guardaremos luego)
const geminiApiKey = defineSecret("GEMINI_API_KEY");

exports.traducirHorus = onRequest({ secrets: [geminiApiKey], cors: true }, async (req, res) => {
    try {
        const { textos, targetLang } = req.body;

        if (!textos || !Array.isArray(textos) || !targetLang) {
            return res.status(400).send({ error: "Datos inválidos. Se requiere un array de 'textos' y un 'targetLang'." });
        }

        // Inicializamos Gemini con la llave secreta
        const genAI = new GoogleGenerativeAI(geminiApiKey.value());
        // Usando el modelo flash más reciente y estable para asegurar compatibilidad.
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Prompt robusto y claro.
        const prompt = `Translate the following JSON array of strings into the language with code "${targetLang}".
        Respond ONLY with a valid JSON array containing the translated strings in the exact same order.
        Do not include any other text, explanations, or markdown code fences like \`\`\`json.
        
        Input JSON: ${JSON.stringify(textos)}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const rawText = response.text();

        // Limpiar la respuesta para quedarnos solo con el JSON
        const jsonText = rawText.replace(/```json|```/g, "").trim();

        const traducciones = JSON.parse(jsonText);

        // Enviar el objeto en el formato que el frontend espera.
        res.status(200).json({ traducciones });

    } catch (error) {
        console.error("Error en la Cloud Function 'traducirHorus':", error);
        res.status(500).send({ error: "Ocurrió un error en el servidor de traducción. Revisa los logs de la función." });
    }
});
