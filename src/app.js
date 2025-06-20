// * Configuración de variables de entorno
require('dotenv').config();

const express    = require('express');
const path       = require('path');
const http       = require('http');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const helmet     = require('helmet');

// * Importación de configuraciones
const corsOptions = require('./config/corsOptions');

// * Importación de la conexión a la base de datos
const db = require('./config/db');

// * Importación de rutas
const authRoutes      = require('./routes/authRoutes');
const timeEntryRoutes = require('./routes/timeEntryRoutes');

// * Middlewares
const app = express();
const server = http.createServer(app);

// Helmet con CSP, frameguard, referrerPolicy
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:      ["'self'"],
      scriptSrc:       ["'self'", "https://apis.google.com"],
      objectSrc:       ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  frameguard:    { action: 'deny' },
  referrerPolicy:{ policy: 'no-referrer' },
}));

app.set('trust proxy', 1);
app.use(express.json());
app.use(cors(corsOptions));

// * Rate limiting global (todas las rutas)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,                 // 100 req por IP
});
app.use(globalLimiter);

// * Rate limiting específico para login/register
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10,                  // 10 requests por IP
  message: { error: 'Too many auth attempts, try again in 1h' }
});
app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);

// * Middleware de validación de tipo de archivo (límite 10MB)
app.use((req, res, next) => {
  if (req.files && req.files.myFile) {
    const allowed = ['image/jpeg','image/png','application/pdf'];
    if (!allowed.includes(req.files.myFile.mimetype)) {
      return res.status(400).json({ message: 'File type not allowed' });
    }
  }
  next();
});

// * Manejo de errores de JWT (opcional, capturar JsonWebTokenError)
app.use((err, req, res, next) => {
  // solo atrapar errores de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' });
  }
  next(err);
});

// * Rutas
app.use('/api/auth', authRoutes);
app.use('/api',      timeEntryRoutes);

// * Healthcheck / home
app.get('/', (req, res) => {
  res.send('Backend Time Tracker - Running');
});

// * Verificación inicial de BD
(async () => {
  try {
    const conn = await db.getConexion();
    console.log('✅ DB connection successful');
    conn.release();
  } catch (error) {
    console.error('❌ DB connection error:', error);
  }
})();

// * Servir cliente en producción
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist', 'client')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'client', 'index.html'));
  });
}

// * Levantar servidor
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
