// RN 13: si el tiempo de almacenamiento del lote en estado "Para curar"
// supera el limite maximo configurado, se emite una alerta para solicitar un
// segundo control de calidad previo al curado. Valor unico para backend
// (validacion de controles y alertas); el front lo espeja en detalle-lote.
export const DIAS_MAX_PARA_CURAR = 30;
