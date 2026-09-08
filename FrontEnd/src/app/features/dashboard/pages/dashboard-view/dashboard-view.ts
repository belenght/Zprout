import { Component, signal } from '@angular/core';

interface MetricaCard {
  label: string;
  valor: string;
  icono: string;
}

interface FilaLote {
  nroLote: number;
  semilla: string;
  variedad: string;
  cantidadTn: number;
  estado: string;
}

interface EventoActividad {
  descripcion: string;
  fecha: string;
}

@Component({
  selector: 'app-dashboard-view',
  standalone: true,
  imports: [],
  templateUrl: './dashboard-view.html'
})
export class DashboardViewComponent {
  // TODO: reemplazar por datos reales combinando lote.service, estado.service y partida.service.
  metricas = signal<MetricaCard[]>([
    { label: 'Lotes en proceso', valor: '—', icono: 'inventory_2' },
    { label: 'Pendientes CC', valor: '—', icono: 'science' },
    { label: 'Para curar (tn)', valor: '—', icono: 'eco' },
    { label: 'Stock curado (tn)', valor: '—', icono: 'warehouse' }
  ]);

  ultimosLotes = signal<FilaLote[]>([]);
  actividadReciente = signal<EventoActividad[]>([]);
}
