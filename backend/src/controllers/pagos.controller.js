import crypto from 'node:crypto';
import prisma from '../config/db.js';

// Mapa temporal en memoria para asociar el ID del link de Padi con nuestra Boleta
const mapeoLinks = new Map();

// ==========================================
// 1. GENERAR LINK DE PAGO
// ==========================================
export const generarLinkDePago = async (req, res) => {
  try {
    const { id_obligacion } = req.body;

    const obligacion = await prisma.obligacionTributaria.findUnique({
      where: { id: id_obligacion },
      include: { bien: true }
    });

    if (!obligacion) return res.status(404).json({ error: "Boleta no encontrada" });

    const montoTotal = Number(obligacion.montoOriginal) + Number(obligacion.interesesMora);
    const apiKey = process.env.PADI_API_KEY;

    const padiResponse = await fetch('https://padi.runasp.net/api/v1/integrations/payment-links', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: montoTotal,
        title: `${obligacion.concepto} - ${obligacion.bien.identificador}`.substring(0, 128),
        currency: "ARS",
        type: "SingleUse"
      })
    });

    if (!padiResponse.ok) return res.status(500).json({ error: "Error en pasarela" });

    const dataPadi = await padiResponse.json();
    
    // GUARDAMOS LA ASOCIACIÓN: El ID que generó Padi le corresponde a nuestro id_obligacion
    mapeoLinks.set(dataPadi.id, id_obligacion);

    res.json({ link_pago: dataPadi.checkoutUrl }); 
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ==========================================
// 2. WEBHOOK: PADI NOS AVISA QUE YA SE COBRÓ
// ==========================================
export const registrarPagoWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-padi-signature'];
    const secret = process.env.PADI_WEBHOOK_SECRET;

    if (!signature || !secret) {
      return res.status(401).send('Faltan credenciales de webhook');
    }

    // 1. Validación de Seguridad HMAC-SHA256 (Padi)
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(req.body) // Usamos el buffer crudo (raw)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return res.status(401).send('Firma inválida');
    }

    // 2. Parseamos el JSON (ahora que sabemos que es 100% real y seguro)
    const payload = JSON.parse(req.body.toString('utf-8'));

    // 3. Procesamos el pago si fue exitoso
    if (payload.event === 'payment.succeeded') {
      const paymentLinkId = payload.data.paymentLinkId;
      const monto_abonado = payload.data.amount;
      const id_transaccion_padi = payload.data.paymentId;

      // Recuperamos qué boleta era usando el mapa que guardamos antes
      const id_obligacion = mapeoLinks.get(paymentLinkId);

      if (!id_obligacion) {
        console.warn(`No se encontró la boleta local para el link Padi: ${paymentLinkId}`);
        // Le respondemos 200 a Padi igual para que no reintente enviarnos el aviso infinitamente
        return res.status(200).json({ received: true }); 
      }

      // Transacción Prisma (Actualizamos BD)
      await prisma.$transaction([
        prisma.pago.create({
          data: {
            montoAbonado: monto_abonado,
            idTransaccionExterna: id_transaccion_padi,
            estado: 'COMPLETADO',
            obligacionId: id_obligacion
          }
        }),
        prisma.obligacionTributaria.update({
          where: { id: id_obligacion },
          data: { estado: 'PAGADO' }
        })
      ]);

      console.log(`✅ ¡Pago Exitoso! Boleta ${id_obligacion} cobrada por $${monto_abonado}`);
    }

    // Respondemos 200 OK rápidamente como pide Padi
    res.status(200).json({ received: true });

  } catch (error) {
    console.error("Error en Webhook:", error);
    res.status(500).json({ error: "Error procesando webhook" });
  }
};