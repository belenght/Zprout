import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { LoteService } from '../../services/lote.service';
import { PartidaService } from '../../services/partida.service';
import { LimpiezaService } from '../../services/limpieza.service';
import { ControlCalidadService } from '../../services/control-calidad.service';
import { PedidoService } from '../../services/pedido.service';
import { AlmacenService } from '../../services/almacen.service';
import { EstimacionVentaService } from '../../services/estimacion-venta.service';
import { Lote } from '../../interfaces/lote';
import { Partida } from '../../interfaces/partida';
import { LimpiezaClasificacion } from '../../interfaces/limpieza';
import { ControlDeCalidad, TipoControl } from '../../interfaces/control-calidad';
import { Pedido } from '../../interfaces/pedido';
import { Almacen } from '../../interfaces/almacen';
import { EstimacionVenta } from '../../interfaces/estimacion-venta';
import { TipoDeSemilla } from '../../interfaces/catalogos';
import { ESTADOS_LOTE } from '../../shared/estado-nombres';
import { claseBadgeEstado, claseBadgeEstadoSolido } from '../../shared/estado-badge';
import { exportarCsv } from '../../shared/exportar-csv';

// Vocabularios cerrados (espejo de BackEnd/src/estado/estado_nombres.ts y pedido.entity.ts)
const ESTADOS_PARTIDA = ['Envasado', 'Apto para comercializacion', 'Rechazado'];
const ESTADOS_PEDIDO = ['Aprobado para despacho', 'Pendiente de stock', 'Despachado', 'Cancelado'];

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MS_DIA = 86_400_000;

export type Periodo = 'todo' | '30' | '90' | '365';

interface Barra {
  nombre: string;
  valor: number;
  porcentaje: number; // ancho de la barra (0-100)
  detalle?: string;
  clase?: string; // color de la barra
}

interface EtapaCalidad {
  etapa: string;
  total: number;
  aptos: number;
  noAptos: number;
  porcentajeApto: number | null;
  humedad: number | null;
  poderGerminativo: number | null;
  pureza: number | null;
}

interface CoberturaEspecie {
  nombre: string;
  estimadoTn: number;
  curadoTn: number;
  cobertura: number; // curado / estimado * 100
}

interface MesSerie {
  etiqueta: string;
  ingresadoTn: number;
  curadoTn: number;
  alturaIngresado: number;
  alturaCurado: number;
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.css'
})
export class ReportesComponent implements OnInit {
  // ---- Filtros ----
  periodo: Periodo = 'todo';
  especieFiltro: number | null = null;
  especiesDisponibles: { id: number; etiqueta: string }[] = [];
  readonly periodos: { valor: Periodo; etiqueta: string }[] = [
    { valor: 'todo', etiqueta: 'Todo el historial' },
    { valor: '30', etiqueta: 'Últimos 30 días' },
    { valor: '90', etiqueta: 'Últimos 90 días' },
    { valor: '365', etiqueta: 'Último año' },
  ];

  // ---- Indicadores principales ----
  ingresadoTn = 0;
  cantidadLotes = 0;
  volumenProcesadoTn = 0; // curado (se mantiene el nombre del reporte original)
  bolsasTotales = 0;
  mermaPromedioPct: number | null = null;
  mermaTotalTn = 0;
  poderGerminativoPromedio: number | null = null;
  totalControles = 0;
  aptitudCCPct: number | null = null;
  informesGenerados = 0;
  partidasRechazadas = 0;
  pedidosTotal = 0;
  pedidosDespachados = 0;
  pedidosPendientes = 0;
  cicloPromedioDias: number | null = null;

  // ---- Detalles ----
  flujoVolumen: Barra[] = [];
  serieMensual: MesSerie[] = [];
  maxMensualTn = 0;
  calidadPorEtapa: EtapaCalidad[] = [];
  procesadoPorEspecie: Barra[] = [];
  mermaPorEspecie: Barra[] = [];
  coberturaPorEspecie: CoberturaEspecie[] = [];
  lotesPorEstado: Barra[] = [];
  partidasPorEstado: Barra[] = [];
  pedidosPorEstado: Barra[] = [];
  pedidosPorTipo: Barra[] = [];
  tipoCurado: Barra[] = [];
  ocupacionAlmacen: (Barra & { ocupadoTn: number; capacidadTn: number })[] = [];

  cargando = true;
  errorMessage: string | null = null;

  claseBadgeEstado = claseBadgeEstado;
  claseBadgeEstadoSolido = claseBadgeEstadoSolido;

  // Datos crudos: se cargan una sola vez y los filtros solo recalculan
  private lotes: Lote[] = [];
  private partidas: Partida[] = [];
  private limpiezas: LimpiezaClasificacion[] = [];
  private controles: ControlDeCalidad[] = [];
  private pedidos: Pedido[] = [];
  private almacenes: Almacen[] = [];
  private estimaciones: EstimacionVenta[] = [];

  private lotePorId = new Map<number, Lote>();
  private partidaPorId = new Map<number, Partida>();
  private semillaPorId = new Map<number, TipoDeSemilla>();

  private cd = inject(ChangeDetectorRef);

  constructor(
    private loteService: LoteService,
    private partidaService: PartidaService,
    private limpiezaService: LimpiezaService,
    private controlCalidadService: ControlCalidadService,
    private pedidoService: PedidoService,
    private almacenService: AlmacenService,
    private estimacionVentaService: EstimacionVentaService
  ) {}

  ngOnInit(): void {
    this.cargarReportes();
  }

  // ---- Eventos de filtros ----
  onPeriodoChange(valor: string): void {
    this.periodo = valor as Periodo;
    this.recalcular();
  }

  onEspecieChange(valor: string): void {
    this.especieFiltro = valor ? Number(valor) : null;
    this.recalcular();
  }

  get hayFiltros(): boolean {
    return this.periodo !== 'todo' || this.especieFiltro !== null;
  }

  limpiarFiltros(): void {
    this.periodo = 'todo';
    this.especieFiltro = null;
    this.recalcular();
  }

  // ---- Carga ----
  private cargarReportes(): void {
    this.cargando = true;
    this.errorMessage = null;

    forkJoin({
      lotes: this.loteService.getLotes(),
      partidas: this.partidaService.getPartidas(),
      limpiezas: this.limpiezaService.getLimpiezas(),
      controles: this.controlCalidadService.getControles(),
      pedidos: this.pedidoService.getPedidos(),
      almacenes: this.almacenService.getAlmacenes(),
      estimaciones: this.estimacionVentaService.getEstimaciones(),
    }).subscribe({
      next: (datos) => {
        this.lotes = datos.lotes;
        this.partidas = datos.partidas;
        this.limpiezas = datos.limpiezas;
        this.controles = datos.controles;
        this.pedidos = datos.pedidos;
        this.almacenes = datos.almacenes;
        this.estimaciones = datos.estimaciones;

        this.indexar();
        this.recalcular();

        this.cargando = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        this.errorMessage = `Error al cargar los reportes: ${err.message}`;
        this.cargando = false;
        this.cd.detectChanges();
      }
    });
  }

  private indexar(): void {
    this.lotePorId.clear();
    this.partidaPorId.clear();
    this.semillaPorId.clear();

    for (const l of this.lotes) {
      if (l.id_lote != null) this.lotePorId.set(l.id_lote, l);
      if (typeof l.tipo_semilla === 'object' && l.tipo_semilla.id_semilla != null) {
        this.semillaPorId.set(l.tipo_semilla.id_semilla, l.tipo_semilla);
      }
    }
    for (const p of this.partidas) this.partidaPorId.set(p.id_partida, p);

    this.especiesDisponibles = Array.from(this.semillaPorId.values())
      .map((s) => ({
        id: s.id_semilla as number,
        etiqueta: s.variante_semilla ? `${s.nombre_semilla} · ${s.variante_semilla}` : s.nombre_semilla,
      }))
      .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta));
  }

  // ---- Helpers de relaciones ----
  private loteDe(ref: Lote | number | null | undefined): Lote | undefined {
    if (ref == null) return undefined;
    return typeof ref === 'object' ? ref : this.lotePorId.get(ref);
  }

  private semillaDe(lote?: Lote): TipoDeSemilla | undefined {
    if (!lote) return undefined;
    const ts = lote.tipo_semilla;
    return typeof ts === 'object' ? ts : this.semillaPorId.get(ts);
  }

  private nombreEspecie(lote?: Lote): string {
    return this.semillaDe(lote)?.nombre_semilla ?? 'Sin especie';
  }

  private loteDeControl(c: ControlDeCalidad): Lote | undefined {
    if (c.lote != null) return this.loteDe(c.lote);
    if (c.partida != null) {
      const partida = typeof c.partida === 'object' ? c.partida : this.partidaPorId.get(c.partida);
      const completa = partida ? (this.partidaPorId.get(partida.id_partida) ?? partida) : undefined;
      return this.loteDe(completa?.lote);
    }
    return undefined;
  }

  private especieOk(lote?: Lote): boolean {
    if (this.especieFiltro === null) return true;
    if (!lote) return false;
    const ts = lote.tipo_semilla;
    const id = typeof ts === 'object' ? ts.id_semilla : ts;
    return id === this.especieFiltro;
  }

  private enPeriodo(fecha?: string | null): boolean {
    if (this.periodo === 'todo' || !fecha) return true;
    const t = new Date(fecha).getTime();
    if (isNaN(t)) return true;
    return t >= Date.now() - Number(this.periodo) * MS_DIA;
  }

  // ---- Utilidades numéricas ----
  private num(v: unknown): number {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  }

  private promedio(valores: number[]): number | null {
    return valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null;
  }

  private barras(mapa: Map<string, number>, clase = 'bg-brand-600', ordenar = true): Barra[] {
    const maximo = Math.max(...mapa.values(), 0) || 1;
    const lista = Array.from(mapa.entries()).map(([nombre, valor]) => ({
      nombre,
      valor,
      porcentaje: (valor / maximo) * 100,
      clase,
    }));
    return ordenar ? lista.sort((a, b) => b.valor - a.valor) : lista;
  }

  private distribucion(nombres: string[], conteo: Map<string, number>): Barra[] {
    const extra = Array.from(conteo.keys()).filter((k) => !nombres.includes(k));
    const todos = [...nombres, ...extra];
    const total = todos.reduce((acc, n) => acc + (conteo.get(n) ?? 0), 0) || 1;
    return todos.map((nombre) => {
      const valor = conteo.get(nombre) ?? 0;
      return { nombre, valor, porcentaje: (valor / total) * 100 };
    });
  }

  private contar<T>(items: T[], clave: (x: T) => string): Map<string, number> {
    const m = new Map<string, number>();
    for (const i of items) {
      const k = clave(i);
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }

  private claveMes(fecha?: string | null): string | null {
    if (!fecha) return null;
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return null;
    return `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
  }

  // ---- Cálculo de todos los reportes según los filtros ----
  private recalcular(): void {
    // 1) filtro por especie (se aplica a todo lo que tiene lote asociado)
    const lotesE = this.lotes.filter((l) => this.especieOk(l));
    const limpE = this.limpiezas.filter((x) => this.especieOk(this.loteDe(x.lote)));
    const ctrlE = this.controles.filter((c) => this.especieOk(this.loteDeControl(c)));
    const partE = this.partidas.filter((p) => this.especieOk(this.loteDe(p.lote)));
    const estE = this.estimaciones.filter((e) => this.especieOk(this.loteDe(e.lote)));

    // 2) filtro por período, cada dataset con su propia fecha de negocio
    const lotes = lotesE.filter((l) => this.enPeriodo(l.fecha_ingreso));
    const limp = limpE.filter((x) => this.enPeriodo(x.fecha));
    const ctrl = ctrlE.filter((c) => this.enPeriodo(c.fecha));
    const part = partE.filter((p) => this.enPeriodo(p.fecha_envasado ?? p.fecha_curado));
    const est = estE.filter((e) => this.enPeriodo(e.fecha_carga));
    const ped = this.pedidos.filter((p) => this.enPeriodo(p.fecha_pedido));

    this.calcularIndicadores(lotes, limp, ctrl, part, ped);
    this.calcularFlujo(lotes, limp, part);
    this.calcularSerieMensual(lotesE, partE);
    this.calcularCalidad(ctrl);
    this.calcularPorEspecie(limp, part, est);
    this.calcularEstados(lotes, part, ped);
    this.calcularCurado(part);
    this.calcularAlmacen();

    this.cd.detectChanges();
  }

  private calcularIndicadores(
    lotes: Lote[],
    limp: LimpiezaClasificacion[],
    ctrl: ControlDeCalidad[],
    part: Partida[],
    ped: Pedido[]
  ): void {
    this.cantidadLotes = lotes.length;
    this.ingresadoTn = lotes.reduce((a, l) => a + this.num(l.cantidad_semillas_en_tn), 0);

    this.volumenProcesadoTn = part.reduce((a, p) => a + this.num(p.volumen_en_tn), 0);
    this.bolsasTotales = part.reduce((a, p) => a + this.num(p.cantidad_bolsas_20kg), 0);

    this.mermaTotalTn = limp.reduce((a, l) => a + this.num(l.merma_tn), 0);
    this.mermaPromedioPct = this.promedio(
      limp.map((l) => {
        const merma = this.num(l.merma_tn);
        const total = merma + this.num(l.volumen_restante_tn);
        return total > 0 ? (merma / total) * 100 : 0;
      })
    );

    this.totalControles = ctrl.length;
    this.poderGerminativoPromedio = this.promedio(ctrl.map((c) => this.num(c.poder_germinativo)));
    this.aptitudCCPct = ctrl.length ? (ctrl.filter((c) => c.resultado === 'Apto').length / ctrl.length) * 100 : null;

    this.informesGenerados = part.filter((p) => p.estado_actual === 'Apto para comercializacion').length;
    this.partidasRechazadas = part.filter((p) => p.estado_actual === 'Rechazado').length;

    this.pedidosTotal = ped.length;
    this.pedidosDespachados = ped.filter((p) => p.estado_pedido === 'Despachado').length;
    this.pedidosPendientes = ped.filter((p) => p.estado_pedido === 'Pendiente de stock').length;

    // Trazabilidad: días entre el ingreso del lote y el envasado de su partida
    const ciclos: number[] = [];
    for (const p of part) {
      const lote = this.loteDe(p.lote);
      if (!lote?.fecha_ingreso || !p.fecha_envasado) continue;
      const dias = (new Date(p.fecha_envasado).getTime() - new Date(lote.fecha_ingreso).getTime()) / MS_DIA;
      if (!isNaN(dias) && dias >= 0) ciclos.push(dias);
    }
    this.cicloPromedioDias = this.promedio(ciclos);
  }

  private calcularFlujo(lotes: Lote[], limp: LimpiezaClasificacion[], part: Partida[]): void {
    const ingresado = lotes.reduce((a, l) => a + this.num(l.cantidad_semillas_en_tn), 0);
    const postLimpieza = limp.reduce((a, l) => a + this.num(l.volumen_restante_tn), 0);
    const curado = part.reduce((a, p) => a + this.num(p.volumen_en_tn), 0);
    const habilitado = part
      .filter((p) => p.estado_actual === 'Apto para comercializacion')
      .reduce((a, p) => a + this.num(p.volumen_en_tn), 0);

    const base = Math.max(ingresado, postLimpieza, curado, habilitado) || 1;
    const etapa = (nombre: string, valor: number, clase: string): Barra => ({
      nombre,
      valor,
      porcentaje: (valor / base) * 100,
      clase,
    });
    this.flujoVolumen = [
      etapa('Ingresado', ingresado, 'bg-brand-900'),
      etapa('Post-limpieza', postLimpieza, 'bg-brand-700'),
      etapa('Curado', curado, 'bg-brand-600'),
      etapa('Habilitado', habilitado, 'bg-gold-500'),
    ];
  }

  private calcularSerieMensual(lotesE: Lote[], partE: Partida[]): void {
    const hoy = new Date();
    const meses: { clave: string; etiqueta: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - i, 1));
      meses.push({ clave: `${d.getUTCFullYear()}-${d.getUTCMonth()}`, etiqueta: `${MESES[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}` });
    }

    const ingresado = new Map<string, number>();
    for (const l of lotesE) {
      const k = this.claveMes(l.fecha_ingreso);
      if (k) ingresado.set(k, (ingresado.get(k) ?? 0) + this.num(l.cantidad_semillas_en_tn));
    }
    const curado = new Map<string, number>();
    for (const p of partE) {
      const k = this.claveMes(p.fecha_curado ?? p.fecha_envasado);
      if (k) curado.set(k, (curado.get(k) ?? 0) + this.num(p.volumen_en_tn));
    }

    this.maxMensualTn = Math.max(...meses.map((m) => Math.max(ingresado.get(m.clave) ?? 0, curado.get(m.clave) ?? 0)), 0);
    const base = this.maxMensualTn || 1;
    this.serieMensual = meses.map((m) => {
      const i = ingresado.get(m.clave) ?? 0;
      const c = curado.get(m.clave) ?? 0;
      return { etiqueta: m.etiqueta, ingresadoTn: i, curadoTn: c, alturaIngresado: (i / base) * 100, alturaCurado: (c / base) * 100 };
    });
  }

  private calcularCalidad(ctrl: ControlDeCalidad[]): void {
    const etapas: { tipo: TipoControl; etiqueta: string }[] = [
      { tipo: 'inicial', etiqueta: 'CC inicial' },
      { tipo: 'intermedio', etiqueta: 'CC intermedio' },
      { tipo: 'final', etiqueta: 'CC final' },
    ];
    this.calidadPorEtapa = etapas.map(({ tipo, etiqueta }) => {
      const delTipo = ctrl.filter((c) => c.tipo_control === tipo);
      const aptos = delTipo.filter((c) => c.resultado === 'Apto').length;
      return {
        etapa: etiqueta,
        total: delTipo.length,
        aptos,
        noAptos: delTipo.length - aptos,
        porcentajeApto: delTipo.length ? (aptos / delTipo.length) * 100 : null,
        humedad: this.promedio(delTipo.map((c) => this.num(c.humedad))),
        poderGerminativo: this.promedio(delTipo.map((c) => this.num(c.poder_germinativo))),
        pureza: this.promedio(delTipo.map((c) => this.num(c.nivel_de_pureza))),
      };
    });
  }

  private calcularPorEspecie(limp: LimpiezaClasificacion[], part: Partida[], est: EstimacionVenta[]): void {
    // Volumen curado por especie (reporte original)
    const curado = new Map<string, number>();
    for (const p of part) {
      const n = this.nombreEspecie(this.loteDe(p.lote));
      curado.set(n, (curado.get(n) ?? 0) + this.num(p.volumen_en_tn));
    }
    const totalCurado = Array.from(curado.values()).reduce((a, b) => a + b, 0) || 1;
    this.procesadoPorEspecie = Array.from(curado.entries())
      .map(([nombre, tn]) => ({ nombre, valor: tn, porcentaje: (tn / totalCurado) * 100 }))
      .sort((a, b) => b.valor - a.valor);

    // Merma promedio (%) por especie
    const mermas = new Map<string, number[]>();
    for (const l of limp) {
      const n = this.nombreEspecie(this.loteDe(l.lote));
      const merma = this.num(l.merma_tn);
      const total = merma + this.num(l.volumen_restante_tn);
      const lista = mermas.get(n) ?? [];
      lista.push(total > 0 ? (merma / total) * 100 : 0);
      mermas.set(n, lista);
    }
    const mermaProm = new Map<string, number>();
    mermas.forEach((v, k) => mermaProm.set(k, this.promedio(v) ?? 0));
    const maxMerma = Math.max(...mermaProm.values(), 0) || 1;
    this.mermaPorEspecie = Array.from(mermaProm.entries())
      .map(([nombre, valor]) => ({
        nombre,
        valor,
        porcentaje: (valor / maxMerma) * 100,
        detalle: `${mermas.get(nombre)?.length ?? 0} limpieza(s)`,
        clase: valor >= 10 ? 'bg-red-500' : valor >= 6 ? 'bg-gold-500' : 'bg-brand-600',
      }))
      .sort((a, b) => b.valor - a.valor);

    // Cobertura de la demanda estimada con lo ya curado
    const estimado = new Map<string, number>();
    for (const e of est) {
      const n = this.nombreEspecie(this.loteDe(e.lote));
      estimado.set(n, (estimado.get(n) ?? 0) + this.num(e.volumen_estimado_tn));
    }
    this.coberturaPorEspecie = Array.from(estimado.entries())
      .filter(([, tn]) => tn > 0)
      .map(([nombre, estimadoTn]) => {
        const curadoTn = curado.get(nombre) ?? 0;
        return { nombre, estimadoTn, curadoTn, cobertura: (curadoTn / estimadoTn) * 100 };
      })
      .sort((a, b) => a.cobertura - b.cobertura); // las más descubiertas primero
  }

  private calcularEstados(lotes: Lote[], part: Partida[], ped: Pedido[]): void {
    this.lotesPorEstado = this.distribucion(
      [...ESTADOS_LOTE],
      this.contar(lotes, (l) => l.estado_actual ?? 'Sin estado')
    );
    this.partidasPorEstado = this.distribucion(
      ESTADOS_PARTIDA,
      this.contar(part, (p) => p.estado_actual ?? 'Sin estado')
    );
    this.pedidosPorEstado = this.distribucion(
      ESTADOS_PEDIDO,
      this.contar(ped, (p) => p.estado_pedido)
    );

    const etiquetaTipo: Record<string, string> = { hibrida: 'Semilla híbrida', grano: 'Grano' };
    this.pedidosPorTipo = this.distribucion(
      ['Semilla híbrida', 'Grano'],
      this.contar(ped, (p) => etiquetaTipo[p.tipo] ?? p.tipo)
    );
  }

  private calcularCurado(part: Partida[]): void {
    const etiqueta: Record<string, string> = { fungicida: 'Fungicida', insecticida: 'Insecticida', mixto: 'Mixto' };
    const tn = new Map<string, number>([['Fungicida', 0], ['Insecticida', 0], ['Mixto', 0]]);
    const cantidad = new Map<string, number>();
    for (const p of part) {
      const n = etiqueta[p.tipo_curado] ?? p.tipo_curado;
      tn.set(n, (tn.get(n) ?? 0) + this.num(p.volumen_en_tn));
      cantidad.set(n, (cantidad.get(n) ?? 0) + 1);
    }
    this.tipoCurado = this.barras(tn, 'bg-brand-600', false).map((b) => ({
      ...b,
      detalle: `${cantidad.get(b.nombre) ?? 0} partida(s)`,
    }));
  }

  // La ocupación es una foto del momento: no depende de los filtros
  private calcularAlmacen(): void {
    this.ocupacionAlmacen = this.almacenes.map((a) => {
      const capacidad = this.num(a.capacidad);
      const ocupado = this.num(a.ocupado_tn);
      const pct = capacidad > 0 ? Math.min((ocupado / capacidad) * 100, 100) : 0;
      return {
        nombre: `${a.tipo.charAt(0).toUpperCase()}${a.tipo.slice(1)} #${a.id_almacen}`,
        valor: pct,
        porcentaje: pct,
        ocupadoTn: ocupado,
        capacidadTn: capacidad,
        clase: pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-gold-500' : 'bg-brand-600',
      };
    });
  }

  // ---- Informe imprimible y exportacion a Excel ----
  hoy = new Date();

  get etiquetaFiltros(): string {
    const per = this.periodos.find((x) => x.valor === this.periodo)?.etiqueta ?? '';
    const esp = this.especieFiltro !== null ? this.especiesDisponibles.find((e) => e.id === this.especieFiltro)?.etiqueta : null;
    return `Período: ${per}${esp ? ' · Semilla/variedad: ' + esp : ''}`;
  }

  imprimir(): void {
    this.hoy = new Date();
    this.cd.detectChanges();
    setTimeout(() => window.print());
  }

  exportar(): void {
    const filas: (string | number | null)[][] = [
      ['Indicadores', 'Volumen ingresado (tn)', this.ingresadoTn, `${this.cantidadLotes} lote(s)`],
      ['Indicadores', 'Volumen procesado - curado (tn)', this.volumenProcesadoTn, `${this.bolsasTotales} bolsas de 20 kg`],
      ['Indicadores', 'Merma promedio (%)', this.mermaPromedioPct, `${this.mermaTotalTn} tn descartadas`],
    ];
    for (const b of this.procesadoPorEspecie) filas.push(['Procesado por especie (tn)', b.nombre, Number(b.valor.toFixed(2)), '']);
    for (const b of this.mermaPorEspecie) filas.push(['Merma promedio por especie (%)', b.nombre, Number(b.valor.toFixed(2)), b.detalle ?? '']);
    for (const c of this.coberturaPorEspecie) filas.push(['Cobertura de la estimación (%)', c.nombre, Number(c.cobertura.toFixed(1)), `estimado ${c.estimadoTn} tn / curado ${c.curadoTn} tn`]);
    for (const e of this.calidadPorEtapa) filas.push(['Calidad por etapa', e.etapa, e.porcentajeApto !== null ? Number(e.porcentajeApto.toFixed(1)) : null, `${e.total} control(es), ${e.aptos} aptos, ${e.noAptos} no aptos`]);
    for (const b of this.lotesPorEstado) filas.push(['Lotes por estado', b.nombre, b.valor, '']);
    for (const b of this.pedidosPorEstado) filas.push(['Pedidos por estado', b.nombre, b.valor, '']);
    filas.unshift(['Filtros', this.etiquetaFiltros, '', '']);
    exportarCsv('reportes', ['Sección', 'Concepto', 'Valor', 'Detalle'], filas);
  }
}
