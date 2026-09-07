import { Router } from 'express';
import * as limpiezaCtrl from './limpieza_clasificacion.controller.js';

// Se anida bajo /api/lotes/:loteId/limpiezas (ver app.ts)
export const limpiezaPorLoteRouter = Router({ mergeParams: true });
limpiezaPorLoteRouter.get('/', limpiezaCtrl.listarLimpiezasPorLote);

// CUU03 - "Registrar limpieza y clasificacion"
export const limpiezaRouter = Router();
limpiezaRouter.post('/', limpiezaCtrl.registrarLimpieza);
