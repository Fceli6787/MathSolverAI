/**
 * Módulo de gestión de interfaz de usuario
 */

import { renderMarkdown } from './utils.js';

// Referencias a elementos del DOM
let elements = {};

/**
 * Inicializa las referencias a elementos del DOM
 */
export function initializeElements() {
    elements = {
        inputText: document.getElementById('inputText'),
        uploadBtn: document.getElementById('uploadBtn'),
        fileInput: document.getElementById('fileInput'),
        imagePreview: document.getElementById('imagePreview'),
        selectedModel: document.getElementById('selectedModel'),
        solveBtn: document.getElementById('solveBtn'),
        solveBtnText: document.getElementById('solveBtnText'),
        errorSection: document.getElementById('errorSection'),
        errorMessage: document.getElementById('errorMessage'),
        loadingSection: document.getElementById('loadingSection'),
        loadingMessage: document.getElementById('loadingMessage'),
        solutionSection: document.getElementById('solutionSection'),
        solutionContent: document.getElementById('solutionContent')
    };
}

/**
 * Muestra un mensaje de error
 * @param {string} message - Mensaje de error
 */
export function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorSection.classList.remove('hidden');
    
    // Inicializar iconos de Lucide
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

/**
 * Oculta el mensaje de error
 */
export function hideError() {
    elements.errorSection.classList.add('hidden');
}

/**
 * Muestra la sección de carga
 * @param {string} message - Mensaje de carga
 */
export function showLoading(message = 'Pensando en la solución...') {
    elements.loadingMessage.textContent = message;
    elements.loadingSection.classList.remove('hidden');
    elements.solutionSection.classList.add('hidden');
}

/**
 * Oculta la sección de carga
 */
export function hideLoading() {
    elements.loadingSection.classList.add('hidden');
}

/**
 * Muestra la solución
 * @param {string} content - Contenido de la solución
 */
export function showSolution(content) {
    elements.solutionContent.innerHTML = renderMarkdown(content);
    elements.solutionSection.classList.remove('hidden');
    
    // Scroll suave a la solución
    elements.solutionSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Inicializar iconos de Lucide
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

/**
 * Actualiza el preview de imágenes
 * @param {Array} images - Array de objetos imagen
 * @param {Function} removeCallback - Función callback para remover imagen
 */
export function updateImagePreview(images, removeCallback) {
    if (images.length > 0) {
        elements.imagePreview.classList.remove('hidden');
        elements.imagePreview.innerHTML = images.map(image => `
            <div class="relative group image-preview-item">
                <img src="${image.url}" alt="${image.name}" class="w-full h-24 object-cover rounded-lg border border-gray-200">
                <button 
                    data-image-id="${image.id}"
                    class="remove-btn absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                >
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
        `).join('');
        
        // Agregar event listeners a los botones de remover
        elements.imagePreview.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const imageId = e.currentTarget.getAttribute('data-image-id');
                removeCallback(imageId);
            });
        });
        
        // Inicializar iconos de Lucide
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } else {
        elements.imagePreview.classList.add('hidden');
    }
}

/**
 * Actualiza la información del modelo
 * @param {boolean} hasImages - Indica si hay imágenes subidas
 */
export function updateModelInfo(hasImages) {
    if (hasImages) {
        elements.selectedModel.textContent = 'Google Gemma 3 27B (con visión para imágenes)';
    } else {
        elements.selectedModel.textContent = 'DeepSeek Prover V2 (optimizado para matemáticas)';
    }
}

/**
 * Actualiza el estado del botón de resolver
 * @param {boolean} enabled - Estado del botón
 * @param {boolean} loading - Indica si está cargando
 */
export function updateSolveButton(enabled, loading = false) {
    elements.solveBtn.disabled = !enabled || loading;
    elements.solveBtnText.textContent = loading ? 'Resolviendo...' : 'Resolver Problema';
}

/**
 * Obtiene el texto del input
 * @returns {string} - Texto del input
 */
export function getInputText() {
    return elements.inputText.value.trim();
}

/**
 * Obtiene las referencias a elementos para event listeners
 * @returns {Object} - Objeto con referencias a elementos
 */
export function getElements() {
    return elements;
}
