import { Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../../auth/services/auth.service';

interface MetricaCard {
  label: string;
  valor: string;
  caption: string;
  colorPill: string; // clases Tailwind para el pill del titulo (ver GUI-03)
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
  private auth = inject(AuthService);

  usuario = computed(() => this.auth.usuarioActual());

  // TODO: cuando exista el modulo de Campana, reemplazar por la campana activa real.
  campanaActiva = 'Campaña 2025/2026';

  // TODO: reemplazar por datos reales combinando lote.service, estado.service y partida.service.
  metricas = signal<MetricaCard[]>([
    { label: 'Lotes Activos', valor: '—', caption: 'en proceso', colorPill: 'bg-brand-700 text-white' },
    { label: 'Pendientes CC', valor: '—', caption: 'controles de calidad', colorPill: 'bg-gold-500 text-white' },
    { label: 'Para Curar', valor: '—', caption: 'listo para curado', colorPill: 'bg-brand-100 text-brand-800' },
    { label: 'Stock Curado', valor: '—', caption: 'disponible', colorPill: 'bg-brand-900 text-white' }
  ]);

  ultimosLotes = signal<FilaLote[]>([]);
  actividadReciente = signal<EventoActividad[]>([]);

  // Colores de estado, siguiendo el criterio de la GUI-03 (Limpieza=ambar,
  // Curado/Envasado=verde/azul, Habilitado=verde oscuro, Descartado=rojo).
  estadoPill(estado: string): string {
    const normalizado = estado.toLowerCase();
    if (normalizado.includes('limpieza')) return 'bg-amber-100 text-amber-800';
    if (normalizado.includes('envasado')) return 'bg-sky-100 text-sky-800';
    if (normalizado.includes('curado')) return 'bg-brand-100 text-brand-800';
    if (normalizado.includes('habilitado')) return 'bg-brand-800 text-white';
    if (normalizado.includes('descartado') || normalizado.includes('no apto')) return 'bg-red-100 text-red-700';
    return 'bg-stone-100 text-stone-700';
  }
}
