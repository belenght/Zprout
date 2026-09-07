import { Router } from 'express';
import * as proveedorCtrl from './proveedor.controller.js';

export const proveedorRouter = Router();

proveedorRouter.get('/', proveedorCtrl.listarProveedores);
proveedorRouter.get('/:id', proveedorCtrl.obtenerProveedor);
proveedorRouter.post('/', proveedorCtrl.crearProveedor);
proveedorRouter.put('/:id', proveedorCtrl.actualizarProveedor);
proveedorRouter.delete('/:id', proveedorCtrl.eliminarProveedor);
