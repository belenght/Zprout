import { Router } from 'express';
import * as campanaCtrl from './campana.controller.js';

export const campanaRouter = Router();

campanaRouter.get('/', campanaCtrl.listarCampanas);
// Va antes de "/:id" (que no existe en este modulo, pero se mantiene el orden por claridad)
campanaRouter.get('/vigente', campanaCtrl.obtenerCampanaVigente);
campanaRouter.post('/', campanaCtrl.crearCampana);
campanaRouter.put('/:id', campanaCtrl.actualizarCampana);
campanaRouter.delete('/:id', campanaCtrl.eliminarCampana);
