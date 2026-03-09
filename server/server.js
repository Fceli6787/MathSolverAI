/**
 * Servidor Express para Math Solver IA
 * Proxy seguro para llamadas a OpenRouter + Sistema de límites de uso
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');
const { router: authRoutes, authenticateToken } = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Validar variables de entorno críticas
if (!process.env.OPENROUTER_API_KEY) {
  console.error('❌ ERROR: OPENROUTER_API_KEY no está configurada');
  process.exit(1);
}

// Configurar CORS
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origen no permitido por CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Headers de seguridad
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Logging middleware
app.use((req, res, next) => {
  console.log(JSON.stringify({
    time: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip
  }));
  next();
});

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../public')));

// Rutas de API
app.use('/api', apiRoutes);

// Rutas de autenticación
app.use('/api/auth', authRoutes);

// Middleware de límite de uso para la ruta /api/solve
app.use('/api/solve', (req, res, next) => {
  const identifier = req.headers.authorization 
    ? (req.user?.email || 'authenticated') 
    : (req.ip || req.connection.remoteAddress || 'unknown');
  
  const today = new Date().toDateString();
  
  // Si tiene token válido, permitir (el límite se maneja en auth routes)
  if (req.headers.authorization) {
    // Verificar token para adjuntar user a req
    const token = req.headers.authorization.split(' ')[1];
    jwt = require('jsonwebtoken');
    jwt.verify(token, process.env.JWT_SECRET || 'cambia-esto-en-produccion-min-32-caracteres-seguros', (err, user) => {
      if (!err) {
        req.user = user;
      }
      next();
    });
    return;
  }
  
  // Para usuarios anónimos: verificar límite de 2 usos/día
  const usageTracker = app.get('usageTracker') || new Map();
  let tracker = usageTracker.get(identifier);
  
  if (!tracker || tracker.date !== today) {
    tracker = { count: 0, date: today, limit: 2 };
    usageTracker.set(identifier, tracker);
    app.set('usageTracker', usageTracker);
  }
  
  if (tracker.count >= tracker.limit) {
    return res.status(429).json({
      error: 'Límite diario alcanzado',
      code: 'DAILY_LIMIT_REACHED',
      message: 'Has alcanzado el límite de 2 usos gratuitos por día. Crea una cuenta para obtener 10 usos diarios.',
      remaining: 0,
      total: 2
    });
  }
  
  // Incrementar contador para esta petición
  tracker.count++;
  usageTracker.set(identifier, tracker);
  app.set('usageTracker', usageTracker);
  
  next();
});

// Ruta raíz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.path
  });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error(JSON.stringify({
    time: new Date().toISOString(),
    type: 'server_error',
    path: req.path,
    method: req.method,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  }));

  if (err.message === 'Origen no permitido por CORS') {
    return res.status(403).json({ error: 'Acceso no permitido' });
  }

  res.status(500).json({
    error: 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🧮 Math Solver IA - Servidor iniciado');
  console.log(`📡 Servidor corriendo en: http://localhost:${PORT}`);
  console.log(`🔧 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 API Key configurada: ${process.env.OPENROUTER_API_KEY ? '✅ SÍ' : '❌ NO'}`);
  console.log(`🌐 CORS permitido para: ${allowedOrigins.join(', ') || 'todos'}`);
  console.log(`🔐 Auth JWT Secret: ${process.env.JWT_SECRET ? '✅ Configurado' : '⚠️ Usando default (cambiar en producción)'}`);
  console.log('='.repeat(60));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 Cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🔄 Cerrando servidor...');
  process.exit(0);
});