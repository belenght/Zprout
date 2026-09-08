export interface NavItem {
  label: string;
  path: string;
  icon: string; // nombre de icono de Material Symbols, se usa como texto/clase, no como <mat-icon>
}

export interface NavGroup {
  titulo?: string;
  items: NavItem[];
}

// Estructura de menu tal como la pide el brief: modulos de operacion arriba,
// catalogos de mantenimiento abajo (no forman parte del flujo diario pero
// necesitan pantallas de alta/baja/modificacion).
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: 'bar_chart' },
      { label: 'Lotes', path: '/lotes', icon: 'inventory_2' },
      { label: 'Calidad', path: '/calidad', icon: 'science' },
      { label: 'Limpieza', path: '/limpieza', icon: 'filter_alt' },
      { label: 'Curado', path: '/curado', icon: 'eco' },
      { label: 'Pedidos', path: '/pedidos', icon: 'shopping_cart' },
      { label: 'Reportes', path: '/reportes', icon: 'trending_up' }
    ]
  },
  {
    titulo: 'Catalogos',
    items: [
      { label: 'Almacenes', path: '/almacen', icon: 'warehouse' },
      { label: 'Campos', path: '/campo', icon: 'grass' },
      { label: 'Campanas', path: '/campana', icon: 'event' },
      { label: 'Insumos', path: '/insumo', icon: 'inventory' },
      { label: 'Proveedores', path: '/proveedor', icon: 'local_shipping' },
      { label: 'Tipos de semilla', path: '/tipo-semilla', icon: 'yard' },
      { label: 'Usuarios', path: '/usuario', icon: 'group' },
      { label: 'Roles', path: '/rol', icon: 'admin_panel_settings' }
    ]
  }
];
