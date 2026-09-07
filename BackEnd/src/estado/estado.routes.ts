import { Router } from 'express';
import * as estadoCtrl from './estado.controller.js';

// Estado no tiene endpoints de escritura directos: los estados se generan
// como efecto de las acciones de negocio (ver estado_helper.ts). Estos
// endpoints son de solo lectura, para historial/trazabilidad.
export const estadoRouter = Router();

estadoRouter.get('/lote/:loteId', estadoCtrl.historialPorLote);
estadoRouter.get('/lote/:loteId/actual', estadoCtrl.estadoActualLote);
estadoRouter.get('/partida/:partidaId', estadoCtrl.historialPorPartida);
estadoRouter.get('/partida/:partidaId/actual', estadoCtrl.estadoActualPartida);
