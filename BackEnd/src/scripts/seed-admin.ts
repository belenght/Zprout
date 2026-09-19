import 'reflect-metadata';
import { initORM } from '../shared/db/orm.js';
import { Usuario } from '../usuario/usuario.entity.js';
import { Rol } from '../rol/rol.entity.js';
import { hashPassword } from '../auth/auth.service.js';

/**
 * Seed del primer usuario administrador.
 *
 * Por que existe este script: POST /api/usuarios esta restringido a
 * verificarRol('administrador') (ver usuario.routes.ts), asi que no hay
 * forma de crear el primer admin pegandole a la API - no existe todavia
 * nadie logueado como admin para pasar ese chequeo. Este script usa el
 * mismo MikroORM/entidades del proyecto para insertar ese primer usuario
 * directo en la base, una sola vez.
 *
 * Uso (desde BackEnd/, con el build ya hecho o via pnpm dev en otra
 * terminal para que exista dist/):
 *   pnpm build
 *   node dist/scripts/seed-admin.js <nombre_usuario> <password> <nombre> <apellido> <email>
 *
 * Ejemplo:
 *   node dist/scripts/seed-admin.js belen.guastoni "MiPassword123!" Belen Guastoni belen@zprout.com
 */
async function main() {
  const [nombre_usuario, password, nombre, apellido, email] = process.argv.slice(2);

  if (!nombre_usuario || !password || !nombre || !apellido || !email) {
    console.error(
      'Uso: node dist/scripts/seed-admin.js <nombre_usuario> <password> <nombre> <apellido> <email>',
    );
    process.exit(1);
  }

  const orm = await initORM();
  const em = orm.em.fork();

  try {
    const existente = await em.findOne(Usuario, { nombre_usuario, deleted_at: null });
    if (existente) {
      console.error(`Ya existe un usuario con nombre_usuario "${nombre_usuario}". Abortando.`);
      process.exit(1);
    }

    let rolAdmin = await em.findOne(Rol, { desc_rol: 'administrador' });
    if (!rolAdmin) {
      rolAdmin = em.create(Rol, { desc_rol: 'administrador' });
      em.persist(rolAdmin);
      console.log('Rol "administrador" creado.');
    }

    const passwordHasheada = await hashPassword(password);
    const usuario = em.create(Usuario, {
      nombre,
      apellido,
      nombre_usuario,
      email,
      password: passwordHasheada,
      rol: rolAdmin,
    });
    em.persist(usuario);

    await em.flush();

    console.log(`Usuario administrador "${nombre_usuario}" creado con id_usuario=${usuario.id_usuario}.`);
  } finally {
    await orm.close(true);
  }
}

main().catch((err) => {
  console.error('Error al crear el usuario administrador:', err);
  process.exit(1);
});