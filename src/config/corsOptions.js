const corsOptions = {
    origin: function (origin, callback) {
        // Lista de orígenes permitidos
        const whitelist = new Set([
            // 'http://localhost:5174',
            // 'http://127.0.0.1:5173',
            'https://ia-academy.com.co'
        ]);

        // Permitir peticiones sin origen (como Postman o herramientas locales)
        if (!origin) {
            return callback(null, true);
        }

        try {
            // Obtener el hostname del origen
            const domain = new URL(origin).hostname;

            // Validar si el origen está en la lista blanca o si es un subdominio de .ia-academy.com.co
            if (whitelist.has(origin) || domain.endsWith('.ia-academy.com.co') || domain === '.ia-academy.com.co') {
                return callback(null, true);
            } else {
                callback(new Error('No permitido por CORS'));
            }
        } catch (error) {
            // Si hay un error al procesar el origen (ejemplo: URL malformada)
            callback(new Error('Origen no válido en CORS'));
        }
    },

    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
    exposedHeaders: ['Authorization', 'X-Request-ID', 'Content-Length'],
    maxAge: process.env.NODE_ENV === 'development' ? 3600 : 86400  // 1 hora en desarrollo, 1 día en producción
};

module.exports = corsOptions;
