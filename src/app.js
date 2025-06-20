// * Configuración de variables de entorno y dependencias principales
require("dotenv").config();
const express = require("express");
const path = require("path");
const http = require("http");
const cors = require('cors');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// * Importación de configuraciones
const corsOptions = require('/config/corsOptions');

// * Importación de la conexión a la base de datos
const db = require("/config/db");

// * Inicialización de la aplicación Express y el servidor HTTP
const app = express();
const server = http.createServer(app);

// * Middlewares
// Configuración avanzada de Helmet
app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://apis.google.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    frameguard: { action: 'deny' }, // Previene clickjacking
    referrerPolicy: { policy: 'no-referrer' },
  }
));
  
app.set('trust proxy', 1);
app.use(express.json());
app.use(cors(corsOptions));

// * Middleware global para manejo de archivos (límite 10MB)
app.use((req, res, next) => {
    if (req.files && req.files.myFile) {
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowedMimeTypes.includes(req.files.myFile.mimetype)) {
        return res.status(400).json({ message: 'Tipo de archivo no permitido' });
      }
    }
    next();
  }
);  

// ! Middleware para manejar errores de JWT
app.use((err, req, res, next) => {
    if (err instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ message: "Token inválido" });
    }
    next(err);
});

// * Importación de rutas de recursos
const authRoutes = require("/routes/authRoutes");

// * Configuración de los endpoints principales
app.use("/api/auth", authRoutes);

app.get('/', (req, res) => {
  res.send('Backend Time Tracker Produccion - Running');
});

// ? Configuración del rate limiting global
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Límite de 100 solicitudes por IP
});
app.use(limiter);

// ! Configuración del rate limiting específico para autenticación
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 10, // Máximo 10 intentos por hora
    message: {
        error: "Demasiados intentos de inicio de sesión. Intente nuevamente en 1 hora.",
    },
});

// Aplicar limitaciones a rutas de autenticación
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// * Verificación inicial de la conexión a la base de datos
(async () => {
    try {
        const connection = await db.getConexion();
        console.log("✅ Conexión exitosa a la base de datos.");
        connection.release();
    } catch (error) {
        console.error("❌ Error al conectar con la base de datos:", error);
    }
})();

// * Configuración específica para producción
if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "dist", "client")));
    app.get("*", (req, res) => {
        res.sendFile(path.join(__dirname, "dist", "client", "index.html"));
    });
}

// * Inicialización del servidor
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});