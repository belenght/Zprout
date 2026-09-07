import { Router } from 'express';
import * as loteCtrl from './lote.controller.js';

export const loteRouter = Router();

// CUU01 - "Registrar Ingreso de lote de Semillas"
loteRouter.get('/', loteCtrl.listarLotes);
loteRouter.get('/:id', loteCtrl.obtenerLote);
loteRouter.post('/', loteCtrl.registrarIngresoLote);
