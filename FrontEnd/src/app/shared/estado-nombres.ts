// Espejo de BackEnd/src/estado/estado_nombres.ts (ESTADOS_LOTE). Se mantiene
// aca porque el front no importa codigo del backend; si el backend cambia
// este vocabulario, actualizar tambien esta lista.
export const ESTADOS_LOTE = [
  'Pendiente CC',
  'En limpieza',
  'Para curar',
  'No apto',
  'Venta como grano',
  'Descarte',
] as const;
