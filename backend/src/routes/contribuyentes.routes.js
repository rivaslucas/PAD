import { Router } from 'express';
import { obtenerDeudasPorDni } from '../controllers/contribuyentes.controller.js';

const router = Router();

// Ruta real: GET /api/contribuyentes/:dni/deudas
router.get('/:dni/deudas', obtenerDeudasPorDni);

export default router;