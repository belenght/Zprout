import { Router } from 'express';
import * as almacenCtrl from './almacen.controller.js';

export const almacenRouter = Router();

almacenRouter.get('/', almacenCtrl.listarAlmacenes);
almacenRouter.get('/:id', almacenCtrl.obtenerAlmacen);
almacenRouter.post('/', almacenCtrl.crearAlmacen);
almacenRouter.put('/:id', almacenCtrl.actualizarAlmacen);
almacenRouter.delete('/:id', almacenCtrl.eliminarAlmacen);
