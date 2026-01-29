/**
 * Utilidades para procesamiento de contenido y formato
 */

/**
 * Procesa contenido con LaTeX y Markdown
 * @param {string} text - Texto a procesar
 * @returns {string} - Texto procesado
 */
export function processContent(text) {
    // Preservar bloques de LaTeX
    const blocks = [];
    text = text.replace(/(\\\\\\[\\s\\S]*?\\\\\\]|\\\\\\(\\s\\S]*?\\\\\\))/g, (match) => {
        blocks.push(match);
        return `@@BLOCK${blocks.length - 1}@@`;
    });

    // Procesar Markdown
    text = text
        // Encabezados
        .replace(/^### (.*$)/gm, '<h3 class="text-2xl font-bold mt-6 mb-4">$1</h3>')
        .replace(/^## (.*$)/gm, '<h2 class="text-3xl font-bold mt-8 mb-4">$1</h2>')
        .replace(/^# (.*$)/gm, '<h1 class="text-4xl font-bold mt-10 mb-6">$1</h1>')
        // Negrita y cursiva
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Listas
        .replace(/^\s*[-*+]\s+(.*)$/gm, '<li class="ml-4 mb-2">$1</li>')
        // Párrafos
        .replace(/\n\n/g, '</p><p class="mb-4">')
        .replace(/\n(?!<\/?[uo]l|<\/?\w+>)/g, '<br>');

    // Restaurar bloques de LaTeX
    text = text.replace(/@@BLOCK(\d+)@@/g, (_, i) => blocks[i]);

    // Procesar otros formatos de LaTeX
    text = text
        .replace(/\$\$(.*?)\$\$/g, '\\\\[$1\\\\]')
        .replace(/\$(.*?)\$/g, '\\\\($1\\\\)');

    return text;
}

/**
 * Renderiza contenido Markdown con LaTeX
 * @param {string} content - Contenido a renderizar
 * @returns {string} - HTML renderizado
 */
export function renderMarkdown(content) {
    const processed = `<div class="prose max-w-none"><p class="mb-4">${processContent(content)}</p></div>`;
    
    // Forzar a MathJax a reprocesar el contenido
    if (window.MathJax && window.MathJax.typesetPromise) {
        setTimeout(() => {
            window.MathJax.typesetPromise().catch((err) => {
                console.error('Error rendering MathJax:', err);
            });
        }, 100);
    }

    return processed;
}

/**
 * Convierte archivo a Base64
 * @param {File} file - Archivo a convertir
 * @returns {Promise<string>} - Promesa con el string Base64
 */
export function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}

/**
 * Genera un ID único
 * @returns {string} - ID único
 */
export function generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
}

/**
 * Debounce para optimizar eventos
 * @param {Function} func - Función a ejecutar
 * @param {number} wait - Tiempo de espera en ms
 * @returns {Function} - Función debounced
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
