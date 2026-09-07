import { Router } from 'express';
import * as tipoSemillaCtrl from './tipo_semilla.controller.js';

export const tipoSemillaRouter = Router();

tipoSemillaRouter.get('/', tipoSemillaCtrl.listarTiposSemilla);
tipoSemillaRouter.get('/:id', tipoSemillaCtrl.obtenerTipoSemilla);
tipoSemillaRouter.post('/', tipoSemillaCtrl.crearTipoSemilla);
tipoSemillaRouter.put('/:id', tipoSemillaCtrl.actualizarTipoSemilla);
tipoSemillaRouter.delete('/:id', tipoSemillaCtrl.eliminarTipoSemilla);
