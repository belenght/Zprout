import { Router } from 'express';
import * as partidaCtrl from './partida.controller.js';

export const partidaRouter = Router();

partidaRouter.get('/', partidaCtrl.listarPartidas);
partidaRouter.get('/:id', partidaCtrl.obtenerPartida);
// CUU05 - curado y envasado
partidaRouter.post('/curado', partidaCtrl.registrarCurado);
// CUU06 - control final + Informe de Partida
partidaRouter.post('/control-final', partidaCtrl.registrarControlFinalYGenerarInforme);
