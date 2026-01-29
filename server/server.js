/**
 * Servidor Express para Math Solver IA
 * Este servidor actúa como proxy seguro para las llamadas a OpenRouter API
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*'
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));
app.use('/src', express.static(path.join(__dirname, '../src')));

// Rutas API
app.use('/api', apiRoutes);

// Ruta principal - servir index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Manejador de errores 404
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Ruta no encontrada',
        path: req.path 
    });
});

// Manejador de errores global
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Verificar que la API key esté configurada
if (!process.env.OPENROUTER_API_KEY) {
    console.error('⚠️  ERROR: OPENROUTER_API_KEY no está configurada en .env');
    console.error('Por favor, crea un archivo .env con tu API key de OpenRouter');
    process.exit(1);
}

// Iniciar servidor
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 Math Solver IA - Servidor iniciado');
    console.log('='.repeat(50));
    console.log(`📡 Servidor corriendo en: http://localhost:${PORT}`);
    console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔑 API Key configurada: ${process.env.OPENROUTER_API_KEY ? '✅' : '❌'}`);
    console.log('='.repeat(50) + '\n');
});

// Manejo de cierre graceful
process.on('SIGTERM', () => {
    console.log('\n👋 Cerrando servidor...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n👋 Cerrando servidor...');
    process.exit(0);
});
