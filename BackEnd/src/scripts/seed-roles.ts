import 'reflect-metadata';
import { initORM } from '../shared/db/orm.js';
import { Rol } from '../rol/rol.entity.js';

/**
 * Crea los roles funcionales de Zprout si no existen (idempotente).
 * Uso (desde BackEnd/, con build hecho):  node dist/scripts/seed-roles.js
 *
 * Si cambias algun desc_rol, cambialo tambien en FrontEnd/src/app/shared/roles.ts.
 */
const ROLES = ['administrador', 'encargado_acopio', 'responsable_calidad', 'operario_planta', 'encargado_comercial', 'director'];

async function main() {
  const orm = await initORM();
  const em = orm.em.fork();
  try {
    for (const desc_rol of ROLES) {
      const existe = await em.findOne(Rol, { desc_rol });
      if (existe) {
        console.log(`Rol "${desc_rol}" ya existe.`);
        continue;
      }
      em.persist(em.create(Rol, { desc_rol }));
      console.log(`Rol "${desc_rol}" creado.`);
    }
    await em.flush();
  } finally {
    await orm.close(true);
  }
}

main().catch((err) => {
  console.error('Error al crear los roles:', err);
  process.exit(1);
});