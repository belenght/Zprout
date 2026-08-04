import { Request, Response } from 'express';
import { initORM } from '../shared/db/orm.js';
import { User } from './usuario.entity.js';

export const createTestUser = async (req: Request, res: Response) => {
  try {
    const db = await initORM(); 
    const em = db.em.fork();

    const newUser = em.create(User, {
      name: 'Admin Prueba',
      email: 'admin@alquimia.com',
      password: 'password123'
    });

    await em.persistAndFlush(newUser);
    const allUsers = await em.find(User, {});

    res.json({ 
      message: '¡Usuario creado desde el controlador modular!', 
      data: allUsers 
    });
  } catch (error: any) {
    console.error('Error en el controlador de usuario:', error);
    res.status(500).json({ error: error.message });
  }
};