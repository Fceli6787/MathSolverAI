/**
 * Módulo de comunicación con la API
 */

/**
 * Resuelve un problema matemático
 * @param {string} text - Texto del problema
 * @param {Array} images - Array de imágenes en Base64
 * @returns {Promise<Object>} - Respuesta de la API
 */
export async function solveMathProblem(text, images) {
    try {
        const response = await fetch('/api/solve', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                images: images
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error en el servidor');
        }

        return await response.json();
    } catch (error) {
        console.error('Error calling API:', error);
        throw error;
    }
}

/**
 * Verifica el estado del servidor
 * @returns {Promise<Object>} - Estado del servidor
 */
export async function checkServerHealth() {
    try {
        const response = await fetch('/api/health');
        return await response.json();
    } catch (error) {
        console.error('Error checking server health:', error);
        return { status: 'error', message: error.message };
    }
}
