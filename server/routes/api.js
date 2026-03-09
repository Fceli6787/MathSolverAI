/**
 * Rutas de la API para Math Solver IA
 * Estilo: CommonJS (require/module.exports)
 */

const express = require('express');
const router = express.Router();

const MODELS = {
  text: 'nvidia/nemotron-3-nano-30b-a3b:free',
  vision: 'google/gemma-3-27b-it:free'
};

const SYSTEM_PROMPTS = {
  text: `Eres un profesor experto en matemáticas con dominio en álgebra, cálculo, geometría, trigonometría, estadística, ecuaciones diferenciales y álgebra lineal.

INSTRUCCIONES:
- Resuelve siempre paso a paso, numerando cada paso claramente
- Usa LaTeX para todas las expresiones matemáticas: \\[ \\] para bloques y \\( \\) para inline
- Explica el razonamiento detrás de cada paso, no solo el procedimiento
- Si hay varios métodos de solución, menciona el más eficiente primero
- Al final, presenta el resultado final destacado claramente
- Si el problema está mal formulado o tiene error, indícalo amablemente
- Responde siempre en español`,

  vision: `Eres un profesor experto en matemáticas con visión computacional. Analiza imágenes de problemas matemáticos y resuélvelos paso a paso.

INSTRUCCIONES:
- Identifica primero qué tipo de problema aparece en la imagen
- Transcribe las expresiones matemáticas que veas antes de resolverlas
- Resuelve paso a paso numerando cada etapa
- Usa LaTeX para todas las fórmulas: \\[ \\] para bloques y \\( \\) para inline
- Presenta el resultado final destacado claramente
- Si la imagen no es clara o no contiene matemáticas, indícalo amablemente
- Responde siempre en español`
};

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Math Solver IA'
  });
});

router.post('/solve', async (req, res) => {
  try {
    const { text, images } = req.body;

    if (!text && (!images || images.length === 0)) {
      return res.status(400).json({
        error: 'Debe proporcionar texto o imágenes para resolver'
      });
    }

    if (text && text.length > 5000) {
      return res.status(400).json({
        error: 'El texto excede el límite de 5000 caracteres'
      });
    }

    if (images && (!Array.isArray(images) || images.length > 5)) {
      return res.status(400).json({
        error: 'Máximo 5 imágenes permitidas'
      });
    }

    const hasImages = Array.isArray(images) && images.length > 0;
    const model = hasImages ? MODELS.vision : MODELS.text;

    let messages;

    if (hasImages) {
      const content = [
        {
          type: 'text',
          text: text
            ? `Resuelve este problema matemático: ${text}`
            : 'Analiza la(s) imagen(es) y resuelve el problema matemático que se muestra.'
        }
      ];

      images.forEach(imageUrl => {
        content.push({
          type: 'image_url',
          image_url: { url: imageUrl }
        });
      });

      messages = [
        {
          role: 'system',
          content: SYSTEM_PROMPTS.vision
        },
        {
          role: 'user',
          content
        }
      ];
    } else {
      messages = [
        {
          role: 'system',
          content: SYSTEM_PROMPTS.text
        },
        {
          role: 'user',
          content: `Resuelve este problema matemático:\n\n${text}`
        }
      ];
    }

    console.log(
      JSON.stringify({
        time: new Date().toISOString(),
        event: 'solve_request',
        model,
        hasText: Boolean(text),
        imageCount: hasImages ? images.length : 0
      })
    );

    const response = await callOpenRouter(messages, model);

    const solution = response?.choices?.[0]?.message?.content;

    if (!solution) {
      throw new Error('Respuesta inválida del proveedor');
    }

    res.json({
      success: true,
      solution,
      model,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        time: new Date().toISOString(),
        type: 'api_error',
        route: '/api/solve',
        message: error.message
      })
    );

    // Manejar error de límite (429)
    if (error.status === 429) {
      return res.status(429).json({
        error: error.message,
        code: 'DAILY_LIMIT_REACHED'
      });
    }

    res.status(500).json({
      error: 'Error al procesar la solicitud',
      timestamp: new Date().toISOString()
    });
  }
});

async function callOpenRouter(messages, model) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('API key no configurada');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 30000);

  try {
    // ✅ URL corregida (sin espacios al final)
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
        'X-Title': 'Math Solver IA'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      let providerMessage = 'Error del proveedor';

      try {
        const errorData = await response.json();
        providerMessage = errorData?.error?.message || providerMessage;
      } catch (_) {}

      throw new Error(`OpenRouter: ${providerMessage}`);
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Timeout: OpenRouter no respondió en 30 segundos');
    }

    throw new Error('No se pudo completar la solicitud al modelo');
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = router;