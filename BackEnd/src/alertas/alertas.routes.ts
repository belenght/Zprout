import { Router } from 'express';
import { listarAlertas } from './alertas.controller.js';

export const alertasRouter = Router();
alertasRouter.get('/', listarAlertas);
