import 'reflect-metadata';
import { initORM } from '../shared/db/orm.js';
import { Campo } from '../campo/campo.entity.js';
import { Proveedor } from '../proveedor/proveedor.entity.js';
import { TipoDeSemilla } from '../tipo_semilla/tipo_semilla.entity.js';
import { Campana } from '../campana/campana.entity.js';
import { Insumo } from '../insumo/insumo.entity.js';

/**
 * Seed de catalogos base para poder probar el flujo end-to-end (CUU01 a
 * CUU07) en un ambiente nuevo. Sin esto, "Nuevo Lote" en el front no tiene
 * nada para elegir en "Cultivo/Variedad" ni "Campo de procedencia": no es un
 * bug, es que TipoDeSemilla/Campo/Proveedor/Campana estan vacios (el unico
 * seed que existe hoy es seed-admin.ts, que solo crea el usuario).
 *
 * Idempotente: si un registro con esa clave/nombre ya existe, lo saltea en
 * vez de duplicarlo, asi se puede correr mas de una vez sin problema.
 *
 * Uso (desde BackEnd/, con el build ya hecho):
 *   pnpm build
 *   node dist/scripts/seed-catalogos.js
 */
async function main() {
  const orm = await initORM();
  const em = orm.em.fork();

  try {
    // --- Campana vigente (CUU08 - Dashboard la usa para el saludo) ---
    let campana = await em.findOne(Campana, { nombre: '2025/2026' });
    if (!campana) {
      campana = em.create(Campana, {
        nombre: '2025/2026',
        fecha_inicio: new Date('2025-09-01'),
        vigente: true,
      });
      em.persist(campana);
      console.log('Campana "2025/2026" creada (vigente).');
    }

    // --- Campos propios ---
    const campos = [
      { nro_campo: 'Campo Norte', ubicacion: 'Ruta 34 km 12, Rosario, Santa Fe' },
      { nro_campo: 'Campo Sur', ubicacion: 'Ruta 9 km 45, Casilda, Santa Fe' },
    ];
    for (const c of campos) {
      const existe = await em.findOne(Campo, { nro_campo: c.nro_campo, deleted_at: null });
      if (!existe) {
        em.persist(em.create(Campo, c));
        console.log(`Campo "${c.nro_campo}" creado.`);
      }
    }

    // --- Proveedores externos ---
    const proveedores = [
      { razon_social: 'Semillera del Litoral S.A.', cuit: '30-71234567-8', contacto: 'ventas@semillasdellitoral.com.ar' },
      { razon_social: 'AgroInsumos Pampeanos S.R.L.', cuit: '30-70987654-3', contacto: 'contacto@agropampeanos.com.ar' },
    ];
    for (const p of proveedores) {
      const existe = await em.findOne(Proveedor, { razon_social: p.razon_social, deleted_at: null });
      if (!existe) {
        em.persist(em.create(Proveedor, p));
        console.log(`Proveedor "${p.razon_social}" creado.`);
      }
    }

    // --- Tipos de semilla, con rangos de calidad (usados por CUU02/CUU06) ---
    const tiposSemilla = [
      { nombre_semilla: 'Soja', variante_semilla: 'DM 4670', humedad_min: '10', humedad_max: '14', poder_germinativo_min: '85', poder_germinativo_max: '100', nivel_pureza_min: '97', nivel_pureza_max: '100', duracion: '120 dias' },
      { nombre_semilla: 'Soja', variante_semilla: 'DM 5958', humedad_min: '10', humedad_max: '14', poder_germinativo_min: '85', poder_germinativo_max: '100', nivel_pureza_min: '97', nivel_pureza_max: '100', duracion: '125 dias' },
      { nombre_semilla: 'Maiz', variante_semilla: 'AX882', humedad_min: '10', humedad_max: '13', poder_germinativo_min: '90', poder_germinativo_max: '100', nivel_pureza_min: '98', nivel_pureza_max: '100', duracion: '140 dias' },
      { nombre_semilla: 'Girasol', variante_semilla: 'Paraiso 20', humedad_min: '8', humedad_max: '11', poder_germinativo_min: '85', poder_germinativo_max: '100', nivel_pureza_min: '96', nivel_pureza_max: '100', duracion: '110 dias' },
    ];
    for (const t of tiposSemilla) {
      const existe = await em.findOne(TipoDeSemilla, { nombre_semilla: t.nombre_semilla, variante_semilla: t.variante_semilla, deleted_at: null });
      if (!existe) {
        em.persist(em.create(TipoDeSemilla, t));
        console.log(`TipoDeSemilla "${t.nombre_semilla} / ${t.variante_semilla}" creado.`);
      }
    }

    // --- Insumos usados en el curado (CUU05) ---
    const insumos = [
      { nombre_insumo: 'Maxim XL 035 FS', unidad_medida: 'ml/100kg' },
      { nombre_insumo: 'Cruiser 350 FS', unidad_medida: 'ml/100kg' },
    ];
    for (const i of insumos) {
      const existe = await em.findOne(Insumo, { nombre_insumo: i.nombre_insumo, deleted_at: null });
      if (!existe) {
        em.persist(em.create(Insumo, i));
        console.log(`Insumo "${i.nombre_insumo}" creado.`);
      }
    }

    await em.flush();
    console.log('Seed de catalogos completado.');
  } finally {
    await orm.close(true);
  }
}

main().catch((err) => {
  console.error('Error al cargar los catalogos:', err);
  process.exit(1);
});
