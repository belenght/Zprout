import { Router } from 'express';
import { createTestUser } from './usuario.controller.js';

export const userRouter = Router();

// Definimos la ruta y le conectamos el controlador
userRouter.get('/test-db', createTestUser);