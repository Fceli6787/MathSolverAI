/**
 * Rutas de autenticación para Math Solver IA
 * Maneja registro, login y verificación de límites de uso
 * Estilo: CommonJS (require/module.exports)
 */

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// ==================== CONFIGURACIÓN ====================
const JWT_SECRET = process.env.JWT_SECRET || 'cambia-esto-en-produccion-min-32-caracteres-seguros';
const JWT_EXPIRES_IN = '7d';

// Base de datos en memoria (REEMPLAZAR CON MongoDB/PostgreSQL en producción)
const users = new Map();
const usageTracker = new Map();

// ==================== UTILS ====================

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function getOrCreateTracker(identifier) {
  const today = new Date().toDateString();
  let tracker = usageTracker.get(identifier);
  
  if (!tracker || tracker.date !== today) {
    tracker = { count: 0, date: today, limit: 2 };
    usageTracker.set(identifier, tracker);
  }
  
  return tracker;
}

// Middleware para verificar token JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticación requerido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido o expirado' });
    }
    req.user = user;
    next();
  });
};

// ==================== RUTAS PÚBLICAS ====================

// POST /api/auth/check-usage
router.post('/check-usage', (req, res) => {
  try {
    const identifier = req.ip || req.connection.remoteAddress || 'unknown';
    const tracker = getOrCreateTracker(identifier);
    
    const isLimited = tracker.count >= tracker.limit;
    
    res.json({
      remaining: Math.max(0, tracker.limit - tracker.count),
      isLimited,
      total: tracker.limit,
      used: tracker.count
    });
  } catch (error) {
    console.error('Error checking usage:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }
    
    if (users.has(email.toLowerCase())) {
      return res.status(409).json({ error: 'El usuario ya está registrado' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    
    const newUser = {
      id: userId,
      email: email.toLowerCase(),
      password: hashedPassword,
      name: name || email.split('@')[0],
      provider: 'local',
      createdAt: new Date().toISOString(),
      dailyLimit: 10,
      usageCount: 0,
      lastReset: new Date().toDateString()
    };
    
    users.set(email.toLowerCase(), newUser);
    
    const token = generateToken({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name
    });
    
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.status(201).json({
      message: 'Usuario creado exitosamente',
      token,
      user: userWithoutPassword
    });
    
    console.log(`✅ Nuevo usuario registrado: ${email}`);
    
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error en el registro. Inténtalo de nuevo.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }
    
    const user = users.get(email.toLowerCase());
    
    if (!user) {
      await new Promise(resolve => setTimeout(resolve, 200));
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    const token = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name
    });
    
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      message: 'Login exitoso',
      token,
      user: userWithoutPassword
    });
    
    console.log(`✅ Login exitoso: ${email}`);
    
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error en el login. Inténtalo de nuevo.' });
  }
});

// POST /api/auth/google (placeholder)
router.post('/google', async (req, res) => {
  try {
    const { tokenId, email, name } = req.body;
    
    if (!email || !tokenId) {
      return res.status(400).json({ error: 'Email y tokenId son requeridos' });
    }
    
    const emailLower = email.toLowerCase();
    
    if (!users.has(emailLower)) {
      const newUser = {
        id: uuidv4(),
        email: emailLower,
        name: name || email.split('@')[0],
        provider: 'google',
        createdAt: new Date().toISOString(),
        dailyLimit: 10,
        usageCount: 0,
        lastReset: new Date().toDateString()
      };
      users.set(emailLower, newUser);
      console.log(`✅ Nuevo usuario Google: ${email}`);
    }
    
    const user = users.get(emailLower);
    
    const token = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      provider: 'google'
    });
    
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      message: 'Login con Google exitoso',
      token,
      user: userWithoutPassword
    });
    
  } catch (error) {
    console.error('Error en Google login:', error);
    res.status(500).json({ error: 'Error en login con Google' });
  }
});

// POST /api/auth/apple (placeholder)
router.post('/apple', async (req, res) => {
  try {
    const { identityToken, email, name } = req.body;
    
    if (!email || !identityToken) {
      return res.status(400).json({ error: 'Email y identityToken son requeridos' });
    }
    
    const emailLower = email.toLowerCase();
    
    if (!users.has(emailLower)) {
      const newUser = {
        id: uuidv4(),
        email: emailLower,
        name: name || email.split('@')[0],
        provider: 'apple',
        createdAt: new Date().toISOString(),
        dailyLimit: 10,
        usageCount: 0,
        lastReset: new Date().toDateString()
      };
      users.set(emailLower, newUser);
      console.log(`✅ Nuevo usuario Apple: ${email}`);
    }
    
    const user = users.get(emailLower);
    
    const token = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      provider: 'apple'
    });
    
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      message: 'Login con Apple exitoso',
      token,
      user: userWithoutPassword
    });
    
  } catch (error) {
    console.error('Error en Apple login:', error);
    res.status(500).json({ error: 'Error en login con Apple' });
  }
});

// ==================== RUTAS PROTEGIDAS ====================

// POST /api/auth/usage/increment
router.post('/usage/increment', authenticateToken, (req, res) => {
  try {
    const identifier = req.user.email;
    const tracker = getOrCreateTracker(identifier);
    
    tracker.limit = 10; // Premium limit para registrados
    tracker.count++;
    usageTracker.set(identifier, tracker);
    
    res.json({
      remaining: Math.max(0, tracker.limit - tracker.count),
      used: tracker.count,
      total: tracker.limit
    });
  } catch (error) {
    console.error('Error incrementing usage:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = users.get(req.user.email);
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    const { password: _, ...userWithoutPassword } = user;
    const tracker = getOrCreateTracker(req.user.email);
    tracker.limit = 10;
    
    res.json({
      user: userWithoutPassword,
      usage: {
        remaining: Math.max(0, tracker.limit - tracker.count),
        used: tracker.count,
        total: tracker.limit,
        resetsAt: new Date(new Date().setDate(new Date().getDate() + 1)).setHours(0,0,0,0)
      }
    });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = { router, authenticateToken };