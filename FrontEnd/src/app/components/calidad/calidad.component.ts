import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface LotePendienteCC {
  nro_lote: string;
  semilla_variedad: string;
  etapa: 'CC inicial' | 'CC intermedio' | 'CC final';
  fecha_ingreso_cola: string;
}

@Component({
  selector: 'app-calidad',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calidad.component.html',
  styleUrl: './calidad.component.css'
})
export class CalidadComponent {
  // Datos de ejemplo (GUI-14). El backend ya tiene control_calidad.controller.ts
  // con los endpoints; falta el service + la conexion real en el front.
  lotesPendientes: LotePendienteCC[] = [
    { nro_lote: 'L-2026-042', semilla_variedad: 'Soja / DM 5958', etapa: 'CC inicial', fecha_ingreso_cola: '17/06/26' },
    { nro_lote: 'L-2026-039', semilla_variedad: 'Soja / NS 5909', etapa: 'CC intermedio', fecha_ingreso_cola: '16/06/26' },
    { nro_lote: 'L-2026-035', semilla_variedad: 'Girasol / SY 4045', etapa: 'CC final', fecha_ingreso_cola: '15/06/26' },
  ];

  get pendientesInicial(): number {
    return this.lotesPendientes.filter((l) => l.etapa === 'CC inicial').length;
  }

  get pendientesIntermedio(): number {
    return this.lotesPendientes.filter((l) => l.etapa === 'CC intermedio').length;
  }

  get pendientesFinal(): number {
    return this.lotesPendientes.filter((l) => l.etapa === 'CC final').length;
  }
}
