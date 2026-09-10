import { Router } from 'express';
import * as loteCtrl from './lote.controller.js';

export const loteRouter = Router();

// CUU01 - "Registrar Ingreso de lote de Semillas"
loteRouter.get('/', loteCtrl.listarLotes);
loteRouter.get('/:id', loteCtrl.obtenerLote);
loteRouter.post('/', loteCtrl.registrarIngresoLote);
// Asignacion de deposito fisico (ver modulo Almacen, GUI-15)
loteRouter.patch('/:id/almacen', loteCtrl.asignarAlmacenLote);
