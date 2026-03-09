/**
 * Módulo de comunicación con la API
 */

const API_BASE = '/api';

/**
 * Resuelve un problema matemático
 * @param {string} text - Texto del problema
 * @param {Array} images - Array de imágenes en Base64
 * @param {string} token - Token de autenticación (opcional)
 * @returns {Promise<Object>} - Respuesta de la API
 */
export async function solveMathProblem(text, images, token = null) {
    try {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE}/solve`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                text: text,
                images: images
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            
            // Manejar error de límite diario
            if (response.status === 429 && errorData.code === 'DAILY_LIMIT_REACHED') {
                throw new Error('LIMIT_REACHED');
            }
            
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
        const response = await fetch(`${API_BASE}/health`);
        return await response.json();
    } catch (error) {
        console.error('Error checking server health:', error);
        return { status: 'error', message: error.message };
    }
}

// ==================== NUEVAS FUNCIONES DE AUTENTICACIÓN ====================

/**
 * Verifica el uso diario restante para usuarios anónimos
 * @returns {Promise<Object>} - { remaining, isLimited, total }
 */
export async function checkUsage() {
    try {
        const response = await fetch(`${API_BASE}/auth/check-usage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        return await response.json();
    } catch (error) {
        console.error('Error checking usage:', error);
        return { remaining: 2, isLimited: false, total: 2, error: true };
    }
}

/**
 * Registra un nuevo usuario
 * @param {Object} userData - { name, email, password }
 * @returns {Promise<Object>} - { token, user }
 */
export async function register(userData) {
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Error en el registro');
        }

        return data;
    } catch (error) {
        console.error('Error registering:', error);
        throw error;
    }
}

/**
 * Inicia sesión con email/password
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<Object>} - { token, user }
 */
export async function login(email, password) {
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Credenciales inválidas');
        }

        return data;
    } catch (error) {
        console.error('Error logging in:', error);
        throw error;
    }
}

/**
 * Inicia sesión con Google (OAuth)
 * @param {Object} googleData - { tokenId, email, name }
 * @returns {Promise<Object>} - { token, user }
 */
export async function loginWithGoogle(googleData) {
    try {
        const response = await fetch(`${API_BASE}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(googleData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Error en login con Google');
        }

        return data;
    } catch (error) {
        console.error('Error with Google login:', error);
        throw error;
    }
}

/**
 * Inicia sesión con Apple (OAuth)
 * @param {Object} appleData - { identityToken, email, name }
 * @returns {Promise<Object>} - { token, user }
 */
export async function loginWithApple(appleData) {
    try {
        const response = await fetch(`${API_BASE}/auth/apple`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appleData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Error en login con Apple');
        }

        return data;
    } catch (error) {
        console.error('Error with Apple login:', error);
        throw error;
    }
}

/**
 * Cierra sesión (limpia token local)
 */
export function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
}

/**
 * Verifica si el usuario está autenticado
 * @returns {boolean}
 */
export function isAuthenticated() {
    return !!localStorage.getItem('authToken');
}

/**
 * Obtiene el token de autenticación
 * @returns {string|null}
 */
export function getAuthToken() {
    return localStorage.getItem('authToken');
}