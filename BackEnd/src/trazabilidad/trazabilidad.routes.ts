import { Router } from 'express';
import * as ctrl from './trazabilidad.controller.js';

export const trazabilidadRouter = Router();
trazabilidadRouter.get('/buscar', ctrl.buscar);
trazabilidadRouter.get('/lote/:id', ctrl.porLote);
trazabilidadRouter.get('/partida/:id', ctrl.porPartida);
trazabilidadRouter.get('/cliente', ctrl.porCliente);
