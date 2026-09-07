import 'reflect-metadata';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { RequestContext } from '@mikro-orm/core';
import type { MySqlDriver } from '@mikro-orm/mysql';
import { MikroORM } from '@mikro-orm/core';
import { initORM, syncSchema } from './shared/db/orm.js';

import { rolRouter } from './rol/rol.routes.js';
import { usuarioRouter, authRouter } from './usuario/usuario.routes.js';
import { campoRouter } from './campo/campo.routes.js';
import { proveedorRouter } from './proveedor/proveedor.routes.js';
import { tipoSemillaRouter } from './tipo_semilla/tipo_semilla.routes.js';
import { almacenRouter } from './almacen/almacen.routes.js';
import { insumoRouter } from './insumo/insumo.routes.js';
import { campanaRouter } from './campana/campana.routes.js';
import { estimacionVentaRouter } from './estimacion_venta/estimacion_venta.routes.js';
import { estadoRouter } from './estado/estado.routes.js';
import { loteRouter } from './lote/lote.routes.js';
import { controlCalidadPorLoteRouter, controlCalidadRouter } from './control_calidad/control_calidad.routes.js';
import { limpiezaPorLoteRouter, limpiezaRouter } from './limpieza_clasificacion/limpieza_clasificacion.routes.js';
import { partidaRouter } from './partida/partida.routes.js';
import { pedidoRouter } from './pedido/pedido.routes.js';
import { detallePorPedidoRouter, detallePorPartidaRouter } from './pedido_detalle/pedido_detalle.routes.js';

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

// --- Auth / Usuario ---
app.use('/api/auth', authRouter);
app.use('/api/usuarios', usuarioRouter);

// --- Catalogos ---
app.use('/api/roles', rolRouter);
app.use('/api/campos', campoRouter);
app.use('/api/proveedores', proveedorRouter);
app.use('/api/tipos-semilla', tipoSemillaRouter);
app.use('/api/almacenes', almacenRouter);
app.use('/api/insumos', insumoRouter);
app.use('/api/campanas', campanaRouter);
app.use('/api/estimaciones-venta', estimacionVentaRouter);

// --- Estado (solo lectura / historial, ver estado_helper.ts) ---
app.use('/api/estados', estadoRouter);

// --- Lote (CUU01) ---
app.use('/api/lotes', loteRouter);

// --- ControlDeCalidad sobre Lote (CUU02) ---
app.use('/api/lotes/:loteId/controles-calidad', controlCalidadPorLoteRouter);
app.use('/api/controles-calidad', controlCalidadRouter);

// --- LimpiezaClasificacion (CUU03) ---
app.use('/api/lotes/:loteId/limpiezas', limpiezaPorLoteRouter);
app.use('/api/limpiezas', limpiezaRouter);

// --- Partida: curado (CUU05) y control final + informe (CUU06) ---
app.use('/api/partidas', partidaRouter);

// --- Pedido (CUU07) ---
app.use('/api/pedidos', pedidoRouter);

// --- PedidoDetalle (solo lectura) ---
app.use('/api/pedidos/:pedidoId/detalle', detallePorPedidoRouter);
app.use('/api/partidas/:partidaId/pedidos', detallePorPartidaRouter);


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