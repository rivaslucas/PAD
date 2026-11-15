import { Router } from 'express';
import { obtenerDeudasPorDni, validarIdentidad } from '../controllers/contribuyentes.controller.js';

const router = Router();

/**
 * @swagger
 * /api/contribuyentes/validar:
 *   post:
 *     summary: Valida la identidad de un contribuyente mediante OpenRENAPER
 *     description: Consulta los datos filiatorios en la API externa de OpenRENAPER con respaldo en padrón local.
 *     tags: [Contribuyentes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dni:
 *                 type: string
 *                 example: "35123456"
 *     responses:
 *       200:
 *         description: Identidad validada exitosamente.
 *       404:
 *         description: Persona no encontrada.
 */
router.post('/validar', validarIdentidad);

// Ruta real: GET /api/contribuyentes/:dni/deudas
router.get('/:dni/deudas', obtenerDeudasPorDni);

export default router;