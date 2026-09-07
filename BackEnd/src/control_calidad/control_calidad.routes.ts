import { Router } from 'express';
import * as controlCalidadCtrl from './control_calidad.controller.js';

// Se anida bajo /api/lotes/:loteId/controles-calidad (ver app.ts)
export const controlCalidadPorLoteRouter = Router({ mergeParams: true });
controlCalidadPorLoteRouter.get('/', controlCalidadCtrl.listarControlesPorLote);

// CUU02 - "Registrar Control de Calidad" (sobre Lote)
export const controlCalidadRouter = Router();
controlCalidadRouter.post('/lote', controlCalidadCtrl.registrarControlCalidadLote);
