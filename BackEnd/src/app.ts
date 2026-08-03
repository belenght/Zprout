import 'reflect-metadata';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { RequestContext } from '@mikro-orm/core';
import type { MySqlDriver } from '@mikro-orm/mysql';
import { MikroORM } from '@mikro-orm/core';

// Importamos las funciones de inicialización que creamos en orm.ts
import { initORM, syncSchema } from './shared/db/orm.js'; 

// Variable global para mantener la instancia de la base de datos
export let orm: MikroORM<MySqlDriver>;

const app = express();
app.set('trust proxy', 1);

// 1. SEGURIDAD BASE
app.use(helmet());

// CORS Dinámico: Toma el origen permitido del .env (ej: FRONTEND_URL=http://localhost:4200)
// Si no hay variable, permite todo
const frontendUrl = process.env.FRONTEND_URL;
app.use(cors({
    origin: frontendUrl ? [frontendUrl] : '*',
    credentials: true
}));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 300,
    standardHeaders: true, 
    legacyHeaders: false,
    message: { message: 'Demasiadas peticiones, intenta más tarde.' }
});
app.use(limiter);

// 2. PARSEO Y MIDDLEWARES
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// 3. CONTEXTO DE MIKRO-ORM
//cada petición HTTP tiene su propio entorno de base de datos aislado
app.use((req, res, next) => {
    if (!orm) {
        return res.status(500).json({ message: 'Base de datos no inicializada' });
    }
    RequestContext.create(orm.em, next);
});

// 4. RUTAS

// Health Check genérico revision que el servidor está on
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'UP', 
        message: 'API funcionando correctamente' 
    });
});

// TODO: Importar y agregar tus rutas modulares aquí
// app.use('/api/auth', authRouter);
// app.use('/api/usuarios', usuarioRouter);


// 5. MANEJO DE ERRORES GLOBALES

// Error 404 para rutas inexistentes
app.use((req: Request, res: Response) => {
    res.status(404).json({ message: 'Ruta no encontrada' });
});

// Capturador global de errores
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Error no controlado:', err);
    res.status(500).json({ 
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ==========================================
// 6. INICIALIZACIÓN DEL SERVIDOR
// ==========================================
async function startServer() {
    try {
        // 1. Inicializamos el ORM y lo asignamos a la variable global
        orm = await initORM();
        
        // 2. Sincronizamos el esquema de forma segura
        await syncSchema(orm);
        
        // 3. Levantamos el servidor Express
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`Servidor corriendo en http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('Error crítico al iniciar el servidor:', error);
        process.exit(1);
    }
}

startServer();