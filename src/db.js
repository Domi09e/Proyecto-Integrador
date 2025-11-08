// src/db.js
import Sequelize from 'sequelize';
// Importamos la configuración para MySQL
import { DB_DATABASE, DB_SERVER, DB_USER, DB_PASSWORD, DB_PORT } from './config.js';

const sequelize = new Sequelize({
    database: DB_DATABASE,
    username: DB_USER,
    password: DB_PASSWORD,
    host: DB_SERVER,
    port: DB_PORT,
    dialect: 'mysql',
    logging: false, // Puedes ponerlo en `true` para ver las consultas SQL en la consola
});

export const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('MySQL (XAMPP) is connected successfully.');
    } catch (error) {
        // Damos un mensaje de error más específico para MySQL
        console.error('Unable to connect to the MySQL database:', error);
    }
};

export default sequelize;

