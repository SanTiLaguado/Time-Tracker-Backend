require('dotenv').config();

const mysql = require('mysql2/promise');

class Conexion {
    constructor() {
        this.config = {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT,
            database: process.env.DB_NAME,
            connectionLimit: 25,
            queueLimit: 0,
            waitForConnections: true,
            connectTimeout: 10000,
            idleTimeout: 60000,
            maxIdle: 10,
            timezone: '-05:00',
            dateStrings: ['TIMESTAMP','DATETIME']
        };
        
        this.pool = mysql.createPool(this.config);
        
        this.pool.on('connection', () => console.log('Nueva conexión creada'));
        this.pool.on('release', () => console.log('Conexión liberada al pool'));
    }

    async getConexion() {
        try {
            const connection = await this.pool.getConnection();
            return connection;
        } catch (error) {
            console.error('Error de conexión:', error.message);
            throw error;
        }
    }

    async query(query, params = []) {
        let connection;
        try {
            connection = await this.pool.getConnection();
            const [results] = await connection.query(query, params);
            return { status: 200, data: results };
        } catch (error) {
            console.error('Error en la query:', error.message);
            throw new Error(JSON.stringify({ 
                status: 500, 
                message: 'Error al ejecutar la consulta', 
                error 
            }));
        } finally {
            if (connection) connection.release();
        }
    }
}

module.exports = new Conexion();