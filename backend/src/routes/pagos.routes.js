import { Router } from 'express';
import { registrarPagoWebhook, generarLinkDePago } from '../controllers/pagos.controller.js';

const router = Router();

/**
 * @swagger
 * /api/pagos/generar-link:
 *   post:
 *     summary: Genera un link de pago con Padi
 *     description: Se comunica con la API de Padi para generar un enlace de pago para una boleta específica.
 *     tags: [Pagos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_obligacion:
 *                 type: integer
 *                 description: ID de la boleta (Obligación Tributaria) a pagar
 *                 example: 1
 *     responses:
 *       200:
 *         description: Link de pago generado exitosamente.
 *       404:
 *         description: Boleta no encontrada.
 *       500:
 *         description: Error de conexión con la pasarela de pagos.
 */
router.post('/generar-link', generarLinkDePago);

/**
 * @swagger
 * /api/pagos/webhook:
 *   post:
 *     summary: Webhook para recibir notificaciones de pago
 *     description: Endpoint que consumirá el grupo Padi (Billetera Virtual) para informarnos que un contribuyente pagó su boleta.
 *     tags: [Pagos]
 */
router.post('/webhook', registrarPagoWebhook);

export default router;