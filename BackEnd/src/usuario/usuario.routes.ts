import { Router } from 'express';
import { createTestUser } from './usuario.controller.js';

export const usuarioRouter = Router();

// Definimos la ruta y le conectamos el controlador
usuarioRouter.get('/test-db', createTestUser);