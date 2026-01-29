/**
 * Script principal de la aplicación Math Solver IA
 */

import { solveMathProblem } from './api.js';
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

// Estado de la aplicación
const state = {
    uploadedImages: [],
    isLoading: false
};

// Mensajes de carga animados
const loadingMessages = [
    'Pensando en la solución...',
    'Analizando el problema...',
    'Casi listo...'
];

/**
 * Inicializa la aplicación
 */
function init() {
    // Inicializar elementos del DOM
    initializeElements();
    
    // Inicializar iconos de Lucide
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Configurar event listeners
    setupEventListeners();
    
    // Estado inicial
    updateSolveButton(false);
    
    console.log('Math Solver IA inicializado correctamente');
}

/**
 * Configura todos los event listeners
 */
function setupEventListeners() {
    const elements = getElements();
    
    // Botón de subir imagen
    elements.uploadBtn.addEventListener('click', () => {
        elements.fileInput.click();
    });
    
    // Input de archivos
    elements.fileInput.addEventListener('change', handleFileUpload);
    
    // Input de texto
    elements.inputText.addEventListener('input', handleInputChange);
    
    // Botón de resolver
    elements.solveBtn.addEventListener('click', handleSolve);
    
    // Enter en textarea (Ctrl+Enter para resolver)
    elements.inputText.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            handleSolve();
        }
    });
}

/**
 * Maneja la subida de archivos
 * @param {Event} event - Evento de cambio
 */
async function handleFileUpload(event) {
    const files = Array.from(event.target.files);
    
    if (files.length === 0) return;
    
    // Validar tamaño total (máximo 10MB por imagen)
    const maxSize = 10 * 1024 * 1024; // 10MB
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
 * @returns {boolean}
 */
function canSolve() {
    return (getInputText().length > 0 || state.uploadedImages.length > 0) && !state.isLoading;
}

/**
 * Remueve una imagen del estado
 * @param {string} imageId - ID de la imagen a remover
 */
function removeImage(imageId) {
    state.uploadedImages = state.uploadedImages.filter(img => img.id !== imageId);
    updateImagePreview(state.uploadedImages, removeImage);
    updateModelInfo(state.uploadedImages.length > 0);
    updateSolveButton(canSolve());
}

/**
 * Maneja el proceso de resolver el problema
 */
async function handleSolve() {
    if (!canSolve()) return;
    
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
        
        // Llamar a la API
        const result = await solveMathProblem(
            getInputText(),
            state.uploadedImages.map(img => img.url)
        );
        
        // Limpiar intervalo
        clearInterval(loadingInterval);
        
        // Mostrar solución
        if (result.solution) {
            hideLoading();
            showSolution(result.solution);
        } else {
            throw new Error('No se recibió una solución válida');
        }
        
    } catch (error) {
        console.error('Error solving problem:', error);
        hideLoading();
        showError(`Error: ${error.message}. Por favor, intenta nuevamente.`);
    } finally {
        state.isLoading = false;
        updateSolveButton(canSolve(), false);
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
