/**
 * Rutas de la API para Math Solver IA
 */

const express = require('express');
const router = express.Router();

// Configuración de modelos
const MODELS = {
    text: 'deepseek/deepseek-prover-v2:free',
    vision: 'google/gemma-3-27b-it:free'
};

/**
 * Endpoint de salud del servidor
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Math Solver IA'
    });
});

/**
 * Endpoint principal para resolver problemas matemáticos
 */
router.post('/solve', async (req, res) => {
    try {
        const { text, images } = req.body;

        // Validación de entrada
        if (!text && (!images || images.length === 0)) {
            return res.status(400).json({
                error: 'Debe proporcionar texto o imágenes para resolver'
            });
        }

        // Validación de texto
        if (text && text.length > 5000) {
            return res.status(400).json({
                error: 'El texto excede el límite de 5000 caracteres'
            });
        }

        // Validación de imágenes
        if (images && images.length > 5) {
            return res.status(400).json({
                error: 'Máximo 5 imágenes permitidas'
            });
        }

        // Determinar modelo y construir mensajes
        const hasImages = images && images.length > 0;
        const model = hasImages ? MODELS.vision : MODELS.text;

        let messages;

        if (hasImages) {
            // Construir mensaje con imágenes para modelo de visión
            const content = [
                {
                    type: 'text',
                    text: `Resuelve este problema matemático paso a paso. Proporciona una explicación detallada con todos los pasos necesarios. ${text || 'Analiza la(s) imagen(es) y resuelve el problema matemático que se muestra.'}`
                }
            ];

            // Agregar cada imagen
            images.forEach(imageUrl => {
                content.push({
                    type: 'image_url',
                    image_url: {
                        url: imageUrl
                    }
                });
            });

            messages = [
                {
                    role: 'user',
                    content: content
                }
            ];
        } else {
            // Mensaje simple para modelo de texto
            messages = [
                {
                    role: 'user',
                    content: `Resuelve este problema matemático paso a paso. Proporciona una explicación detallada y clara con todos los pasos necesarios para llegar a la solución. Usa formato markdown para las fórmulas matemáticas con LaTeX cuando sea necesario (usa \\[ \\] para ecuaciones en bloque y \\( \\) para ecuaciones inline).

Problema: ${text}`
                }
            ];
        }

        // Llamar a OpenRouter API
        console.log(`🤖 Usando modelo: ${model}`);
        console.log(`📝 Texto: ${text ? text.substring(0, 50) + '...' : 'Sin texto'}`);
        console.log(`🖼️  Imágenes: ${images ? images.length : 0}`);

        const response = await callOpenRouter(messages, model);

        if (response.choices && response.choices[0] && response.choices[0].message) {
            const solution = response.choices[0].message.content;
            
            res.json({
                success: true,
                solution: solution,
                model: model,
                timestamp: new Date().toISOString()
            });
        } else {
            throw new Error('Respuesta inválida de la API');
        }

    } catch (error) {
        console.error('❌ Error en /api/solve:', error.message);
        
        res.status(500).json({
            error: 'Error al procesar la solicitud',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Función para llamar a OpenRouter API
 * @param {Array} messages - Mensajes para la API
 * @param {string} model - Modelo a usar
 * @returns {Promise<Object>} - Respuesta de la API
 */
async function callOpenRouter(messages, model) {
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
        throw new Error('API key no configurada');
    }

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.CORS_ORIGIN || 'http://localhost:3000',
                'X-Title': 'Math Solver IA'
            },
            body: JSON.stringify({
                model: model,
                messages: messages
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `Error ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error calling OpenRouter:', error);
        throw error;
    }
}

module.exports = router;
