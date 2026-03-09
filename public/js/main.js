/**
 * Script principal de la aplicación Math Solver IA
 * Con sistema de límites de uso y autenticación
 */

import { 
    solveMathProblem, 
    checkUsage, 
    register, 
    login, 
    loginWithGoogle, 
    loginWithApple,
    logout,
    isAuthenticated,
    getAuthToken
} from './api.js';
import { 
    initializeElements, 
    showError, 
    hideError, 
    showLoading, 
    hideLoading, 
    showSolution,
    updateImagePreview,
    updateModelInfo,
    updateSolveButton,
    getInputText,
    getElements
} from './ui.js';
import { fileToBase64, generateId } from './utils.js';

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    FREE_LIMIT: 2,           // Usos gratis por día para anónimos
    PREMIUM_LIMIT: 10,       // Usos por día para registrados
    STORAGE_KEYS: {
        USAGE_COUNT: 'mathSolver_usageCount',
        LAST_RESET: 'mathSolver_lastReset',
        AUTH_TOKEN: 'authToken',
        USER_EMAIL: 'userEmail',
        USER_NAME: 'userName'
    }
};

// ==================== ESTADO DE LA APLICACIÓN ====================
const state = {
    uploadedImages: [],
    isLoading: false,
    usageCount: 0,
    isLimited: false,
    authToken: null,
    user: null
};

// Mensajes de carga animados
const loadingMessages = [
    'Pensando en la solución...',
    'Analizando el problema...',
    'Casi listo...'
];

// ==================== ELEMENTOS DEL DOM ====================
let elements = {};
let limitModal, closeLimitModal, usageCounter, remainingUsesEl;
let toggleAuthBtn, toggleAuthText, loginForm, registerForm, authSuccess;
let googleLoginBtn, appleLoginBtn;

/**
 * Inicializa la aplicación
 */
async function init() {
    // Inicializar elementos del DOM
    initializeElements();
    cacheElements();
    
    // Inicializar iconos de Lucide
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Cargar estado de autenticación y uso
    await loadAuthState();
    await initializeUsage();
    
    // Configurar event listeners
    setupEventListeners();
    setupAuthListeners();
    
    // Estado inicial del botón
    updateSolveButton(false);
    
    console.log('✅ Math Solver IA inicializado correctamente');
}

/**
 * Cachea elementos del modal y contador
 */
function cacheElements() {
    elements = getElements();
    
    // Modal de límite
    limitModal = document.getElementById('limitModal');
    closeLimitModal = document.getElementById('closeLimitModal');
    
    // Contador de usos
    usageCounter = document.getElementById('usageCounter');
    remainingUsesEl = document.getElementById('remainingUses');
    
    // Forms de auth
    toggleAuthBtn = document.getElementById('toggleAuthBtn');
    toggleAuthText = document.getElementById('toggleAuthText');
    loginForm = document.getElementById('loginForm');
    registerForm = document.getElementById('registerForm');
    authSuccess = document.getElementById('authSuccess');
    
    // Botones sociales
    googleLoginBtn = document.getElementById('googleLoginBtn');
    appleLoginBtn = document.getElementById('appleLoginBtn');
}

/**
 * Carga el estado de autenticación desde localStorage
 */
async function loadAuthState() {
    state.authToken = getAuthToken();
    state.user = {
        email: localStorage.getItem(CONFIG.STORAGE_KEYS.USER_EMAIL),
        name: localStorage.getItem(CONFIG.STORAGE_KEYS.USER_NAME)
    };
    
    if (state.authToken) {
        console.log('🔐 Usuario autenticado:', state.user.email);
    }
}

/**
 * Inicializa el contador de usos diarios
 */
async function initializeUsage() {
    const today = new Date().toDateString();
    const lastReset = localStorage.getItem(CONFIG.STORAGE_KEYS.LAST_RESET);
    
    // Resetear contador si es un nuevo día
    if (lastReset !== today) {
        state.usageCount = 0;
        localStorage.setItem(CONFIG.STORAGE_KEYS.USAGE_COUNT, '0');
        localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_RESET, today);
    } else {
        state.usageCount = parseInt(localStorage.getItem(CONFIG.STORAGE_KEYS.USAGE_COUNT)) || 0;
    }
    
    // Si está autenticado, verificar uso en backend también
    if (state.authToken) {
        const usage = await checkUsage();
        if (usage.remaining !== undefined) {
            state.usageCount = CONFIG.PREMIUM_LIMIT - usage.remaining;
        }
    }
    
    updateUsageDisplay();
}

/**
 * Actualiza la visualización del contador de usos
 */
function updateUsageDisplay() {
    const limit = state.authToken ? CONFIG.PREMIUM_LIMIT : CONFIG.FREE_LIMIT;
    const remaining = Math.max(0, limit - state.usageCount);
    
    if (remainingUsesEl) {
        remainingUsesEl.textContent = remaining;
    }
    
    // Mostrar/ocultar contador según estado de auth
    if (usageCounter) {
        if (state.authToken || state.isLimited) {
            usageCounter.classList.add('hidden');
        } else {
            usageCounter.classList.remove('hidden');
        }
    }
}

/**
 * Configura event listeners principales
 */
function setupEventListeners() {
    // Botón de subir imagen
    elements.uploadBtn?.addEventListener('click', () => {
        elements.fileInput?.click();
    });
    
    // Input de archivos
    elements.fileInput?.addEventListener('change', handleFileUpload);
    
    // Input de texto
    elements.inputText?.addEventListener('input', handleInputChange);
    
    // Botón de resolver
    elements.solveBtn?.addEventListener('click', handleSolve);
    
    // Enter en textarea (Ctrl+Enter para resolver)
    elements.inputText?.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            handleSolve();
        }
    });
}

/**
 * Configura event listeners de autenticación
 */
function setupAuthListeners() {
    // Cerrar modal
    closeLimitModal?.addEventListener('click', hideLimitModal);
    
    // Click fuera del modal para cerrar
    limitModal?.addEventListener('click', (e) => {
        if (e.target === limitModal) hideLimitModal();
    });
    
    // Toggle entre Login y Registro
    toggleAuthBtn?.addEventListener('click', toggleAuthMode);
    
    // Submit Login
    loginForm?.addEventListener('submit', handleLoginSubmit);
    
    // Submit Registro
    registerForm?.addEventListener('submit', handleRegisterSubmit);
    
    // Google Login
    googleLoginBtn?.addEventListener('click', handleGoogleLogin);
    
    // Apple Login
    appleLoginBtn?.addEventListener('click', handleAppleLogin);
}

/**
 * Alterna entre modo Login y Registro
 */
function toggleAuthMode() {
    const isLogin = !loginForm?.classList.contains('hidden');
    
    if (loginForm && registerForm && toggleAuthText && toggleAuthBtn) {
        loginForm.classList.toggle('hidden');
        registerForm.classList.toggle('hidden');
        
        if (isLogin) {
            toggleAuthText.textContent = '¿Ya tienes cuenta?';
            toggleAuthBtn.textContent = 'Inicia Sesión';
        } else {
            toggleAuthText.textContent = '¿No tienes cuenta?';
            toggleAuthBtn.textContent = 'Regístrate';
        }
    }
}

/**
 * Maneja la subida de archivos
 */
async function handleFileUpload(event) {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) return;
    
    // Validar tamaño total (máximo 10MB por imagen)
    const maxSize = 10 * 1024 * 1024;
    const invalidFiles = files.filter(file => file.size > maxSize);
    
    if (invalidFiles.length > 0) {
        showError(`Algunas imágenes exceden el tamaño máximo de 10MB`);
        return;
    }
    
    // Procesar cada archivo
    for (const file of files) {
        try {
            const base64 = await fileToBase64(file);
            const imageData = {
                id: generateId(),
                name: file.name,
                url: base64
            };
            state.uploadedImages.push(imageData);
        } catch (error) {
            console.error('Error reading file:', error);
            showError(`Error al leer la imagen ${file.name}`);
        }
    }
    
    // Actualizar UI
    updateImagePreview(state.uploadedImages, removeImage);
    updateModelInfo(state.uploadedImages.length > 0);
    updateSolveButton(canSolve());
    
    // Limpiar input
    event.target.value = '';
}

/**
 * Maneja cambios en el input de texto
 */
function handleInputChange() {
    updateSolveButton(canSolve());
}

/**
 * Verifica si se puede resolver el problema
 */
function canSolve() {
    return (getInputText().length > 0 || state.uploadedImages.length > 0) && !state.isLoading && !state.isLimited;
}

/**
 * Remueve una imagen del estado
 */
function removeImage(imageId) {
    state.uploadedImages = state.uploadedImages.filter(img => img.id !== imageId);
    updateImagePreview(state.uploadedImages, removeImage);
    updateModelInfo(state.uploadedImages.length > 0);
    updateSolveButton(canSolve());
}

/**
 * Muestra el modal de límite alcanzado
 */
function showLimitModal() {
    if (limitModal) {
        limitModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        // Resetear forms
        if (loginForm && registerForm && authSuccess) {
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
            authSuccess.classList.add('hidden');
            loginForm.reset();
            registerForm.reset();
            toggleAuthText.textContent = '¿No tienes cuenta?';
            toggleAuthBtn.textContent = 'Regístrate';
        }
    }
}

/**
 * Oculta el modal de límite
 */
function hideLimitModal() {
    if (limitModal) {
        limitModal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

/**
 * Verifica si el usuario puede usar el servicio
 */
async function checkUsageLimit() {
    // Usuarios autenticados siempre pueden usar (hasta su límite premium)
    if (state.authToken) {
        return true;
    }
    
    // Verificar límite para anónimos
    if (state.usageCount >= CONFIG.FREE_LIMIT) {
        state.isLimited = true;
        showLimitModal();
        updateSolveButton(false);
        return false;
    }
    
    return true;
}

/**
 * Incrementa el contador de usos
 */
function incrementUsage() {
    state.usageCount++;
    localStorage.setItem(CONFIG.STORAGE_KEYS.USAGE_COUNT, state.usageCount.toString());
    updateUsageDisplay();
}

/**
 * Maneja el login con email/password
 */
async function handleLoginSubmit(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail')?.value;
    const password = document.getElementById('loginPassword')?.value;
    
    if (!email || !password) {
        showError('Por favor completa todos los campos');
        return;
    }
    
    try {
        // Mostrar estado de carga
        const submitBtn = loginForm?.querySelector('button[type="submit"]');
        const originalText = submitBtn?.textContent;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Iniciando sesión...';
        }
        
        const result = await login(email, password);
        
        // Guardar token y datos de usuario
        localStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN, result.token);
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER_EMAIL, result.user?.email || email);
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER_NAME, result.user?.name || '');
        
        // Actualizar estado local
        state.authToken = result.token;
        state.user = result.user;
        
        // Mostrar éxito y cerrar modal
        if (authSuccess) {
            loginForm?.classList.add('hidden');
            authSuccess.classList.remove('hidden');
            
            setTimeout(() => {
                hideLimitModal();
                updateUsageDisplay();
                updateSolveButton(canSolve());
            }, 1500);
        }
        
        console.log('✅ Login exitoso');
        
    } catch (error) {
        showError(error.message || 'Error al iniciar sesión');
        console.error('Login error:', error);
    } finally {
        // Restaurar botón
        const submitBtn = loginForm?.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Iniciar Sesión';
        }
    }
}

/**
 * Maneja el registro de nuevo usuario
 */
async function handleRegisterSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName')?.value;
    const email = document.getElementById('registerEmail')?.value;
    const password = document.getElementById('registerPassword')?.value;
    
    if (!name || !email || !password) {
        showError('Por favor completa todos los campos');
        return;
    }
    
    if (password.length < 8) {
        showError('La contraseña debe tener al menos 8 caracteres');
        return;
    }
    
    try {
        // Mostrar estado de carga
        const submitBtn = registerForm?.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creando cuenta...';
        }
        
        const result = await register({ name, email, password });
        
        // Guardar token y datos
        localStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN, result.token);
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER_EMAIL, result.user?.email || email);
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER_NAME, result.user?.name || name);
        
        // Actualizar estado local
        state.authToken = result.token;
        state.user = result.user;
        
        // Mostrar éxito
        if (authSuccess) {
            registerForm?.classList.add('hidden');
            authSuccess.classList.remove('hidden');
            
            setTimeout(() => {
                hideLimitModal();
                updateUsageDisplay();
                updateSolveButton(canSolve());
            }, 1500);
        }
        
        console.log('✅ Registro exitoso');
        
    } catch (error) {
        showError(error.message || 'Error al crear la cuenta');
        console.error('Register error:', error);
    } finally {
        // Restaurar botón
        const submitBtn = registerForm?.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Crear Cuenta Gratis';
        }
    }
}

/**
 * Maneja login con Google (placeholder para OAuth real)
 */
async function handleGoogleLogin() {
    // NOTA: Para producción, implementar OAuth real con Google
    // https://developers.google.com/identity/sign-in/web/sign-in
    
    showError('Google Sign-In requiere configuración en Google Cloud Console. Contacta al administrador.');
    
    // Ejemplo de implementación real:
    /*
    try {
        const auth2 = await google.auth.init({ client_id: 'YOUR_CLIENT_ID' });
        const googleUser = await auth2.signIn();
        const profile = googleUser.getBasicProfile();
        
        const result = await loginWithGoogle({
            tokenId: googleUser.getAuthResponse().id_token,
            email: profile.getEmail(),
            name: profile.getName()
        });
        
        // Guardar sesión...
    } catch (error) {
        showError('Error con Google Sign-In');
    }
    */
}

/**
 * Maneja login con Apple (placeholder para OAuth real)
 */
async function handleAppleLogin() {
    // NOTA: Para producción, implementar Sign in with Apple
    // https://developer.apple.com/documentation/sign_in_with_apple
    
    showError('Apple Sign-In requiere configuración en Apple Developer. Contacta al administrador.');
    
    // Ejemplo de implementación real:
    /*
    try {
        AppleID.auth.init({ clientId: 'YOUR_CLIENT_ID', scope: 'name email', redirectURI: window.location.href });
        const response = await AppleID.auth.signIn();
        
        const result = await loginWithApple({
            identityToken: response.authorization.id_token,
            email: response.user?.email,
            name: response.user?.name
        });
        
        // Guardar sesión...
    } catch (error) {
        showError('Error con Apple Sign-In');
    }
    */
}

/**
 * Maneja el proceso de resolver el problema
 */
async function handleSolve() {
    if (!canSolve()) return;
    
    // Verificar límite de uso
    const canUse = await checkUsageLimit();
    if (!canUse) return;
    
    state.isLoading = true;
    updateSolveButton(false, true);
    hideError();
    
    try {
        // Mostrar mensajes de carga animados
        showLoading(loadingMessages[0]);
        
        let messageIndex = 0;
        const loadingInterval = setInterval(() => {
            messageIndex = (messageIndex + 1) % loadingMessages.length;
            showLoading(loadingMessages[messageIndex]);
        }, 2000);
        
        // Llamar a la API con token si está autenticado
        const result = await solveMathProblem(
            getInputText(),
            state.uploadedImages.map(img => img.url),
            state.authToken
        );
        
        // Limpiar intervalo
        clearInterval(loadingInterval);
        
        // Mostrar solución
        if (result.solution) {
            hideLoading();
            showSolution(result.solution);
            
            // Incrementar contador solo si fue exitoso
            incrementUsage();
        } else {
            throw new Error('No se recibió una solución válida');
        }
        
    } catch (error) {
        console.error('Error solving problem:', error);
        hideLoading();
        
        // Manejar error de límite alcanzado
        if (error.message === 'LIMIT_REACHED') {
            state.isLimited = true;
            showLimitModal();
        } else {
            showError(`Error: ${error.message}. Por favor, intenta nuevamente.`);
        }
    } finally {
        state.isLoading = false;
        updateSolveButton(canSolve(), false);
    }
}

// ==================== EXPORTS PARA DEBUG/TEST ====================
export const debug = {
    getState: () => ({ ...state }),
    resetUsage: () => {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USAGE_COUNT);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.LAST_RESET);
        state.usageCount = 0;
        updateUsageDisplay();
    },
    logout: () => {
        logout();
        state.authToken = null;
        state.user = null;
        updateUsageDisplay();
    }
};

// ==================== INICIALIZACIÓN ====================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}