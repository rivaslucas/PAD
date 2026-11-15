import { Router } from 'express';
import { 
  consultarLibreDeudaAutomotor,
  consultarConstanciaInscripcion,
  consultarLibreDeudaPorDNI,
  consultarLibreDeudaInmobiliario
} from '../controllers/servicios.controller.js';

const router = Router();

/**
 * @swagger
 * /api/servicios/libre-deuda/automotor/{patente}:
 *   get:
 *     summary: Consulta el libre deuda de un vehículo
 *     description: Verifica si un vehículo posee deudas exigibles. Ideal para sistemas de Seguros, Concesionarias o Tránsito.
 *     tags: [Servicios]
 *     parameters:
 *       - in: path
 *         name: patente
 *         required: true
 *         schema:
 *           type: string
 *         description: Dominio del vehículo (Ej. AB123CD)
 *     responses:
 *       200:
 *         description: Consulta exitosa. Devuelve el estado de deuda.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 dominio:
 *                   type: string
 *                 libre_deuda:
 *                   type: boolean
 *                 mensaje:
 *                   type: string
 *                 fecha_consulta:
 *                   type: string
 *                 deuda_total:
 *                   type: number
 *                 periodos_adeudados:
 *                   type: integer
 *       404:
 *         description: Vehículo no registrado
 */
router.get('/libre-deuda/automotor/:patente', consultarLibreDeudaAutomotor);
/**
 * @swagger
 * /api/servicios/libre-deuda/persona/{dni}:
 *   get:
 *     summary: Consulta el libre deuda general de una persona
 *     description: Verifica si un contribuyente posee deudas en cualquiera de sus bienes registrados. Ideal para Inmobiliarias o RRHH.
 *     tags: [Servicios]
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Consulta exitosa.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 dni:
 *                   type: string
 *                 nombre:
 *                   type: string
 *                 libre_deuda:
 *                   type: boolean
 *                 deuda_total:
 *                   type: number
 *                 bienes_con_deuda:
 *                   type: array
 *                   items:
 *                     type: string
 *                 boletas_vencidas:
 *                   type: integer
 *       404:
 *         description: Contribuyente no registrado.
 */
router.get('/libre-deuda/persona/:dni', consultarLibreDeudaPorDNI);
/**
 * @swagger
 * /api/servicios/libre-deuda/inmobiliario/{partida}:
 *   get:
 *     summary: Consulta el libre deuda de una propiedad
 *     description: Verifica si una casa o terreno posee deudas de impuesto inmobiliario usando su Padrón o Partida.
 *     tags: [Servicios]
 *     parameters:
 *       - in: path
 *         name: partida
 *         required: true
 *         schema:
 *           type: string
 *         description: Padrón o Partida Inmobiliaria (Ej. PADRON-987654)
 *     responses:
 *       200:
 *         description: Consulta exitosa.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 partida:
 *                   type: string
 *                 libre_deuda:
 *                   type: boolean
 *                 mensaje:
 *                   type: string
 *                 fecha_consulta:
 *                   type: string
 *                 deuda_total:
 *                   type: number
 *                 periodos_adeudados:
 *                   type: integer
 *       404:
 *         description: Inmueble no registrado.
 */
router.get('/libre-deuda/inmobiliario/:partida', consultarLibreDeudaInmobiliario);
/**
 * @swagger
 * /api/servicios/constancia-inscripcion/{cuit}:
 *   get:
 *     summary: Valida la constancia de inscripción (CUIT)
 *     description: Verifica si una persona física o jurídica está registrada como contribuyente activo. Ideal para sistemas B2B o Inmobiliarias.
 *     tags: [Servicios]
 *     parameters:
 *       - in: path
 *         name: cuit
 *         required: true
 *         schema:
 *           type: string
 *         description: CUIT del contribuyente sin guiones (Ej. 20351234567)
 *     responses:
 *       200:
 *         description: Contribuyente activo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cuit:
 *                   type: string
 *                 estado:
 *                   type: string
 *                 nombre_razon_social:
 *                   type: string
 *                 fecha_alta:
 *                   type: string
 *                 impuestos_activos:
 *                   type: array
 *                   items:
 *                     type: string
 *       404:
 *         description: Contribuyente inexistente
 */
router.get('/constancia-inscripcion/:cuit', consultarConstanciaInscripcion);

export default router;