import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Generar link de pago y activar simulación de impacto a los 20 segundos
router.post('/generar-link', async (req, res) => {
  try {
    const { id_obligacion } = req.body;
    const obligacionId = Number(id_obligacion);

    const obligacion = await prisma.obligacionTributaria.findUnique({
      where: { id: obligacionId },
    });

    if (!obligacion) {
      return res.status(404).json({ error: 'Obligación no encontrada' });
    }

    // 1. Llamada real a Padi para obtener el link de checkout
    const responsePadi = await fetch(`${process.env.PADI_API_BASE || 'https://padi.runasp.net'}/api/v1/integrations/payment-links`, {
      method: 'POST',
      headers: {
        'X-Api-Key': process.env.PADI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: obligacion.montoTotal,
        title: `${obligacion.concepto} - ${obligacion.bienIdentificador}`,
        currency: 'ARS',
        type: 'SingleUse',
        ttlMinutes: 30,
      }),
    });

    const dataPadi = await responsePadi.json();
    const linkPago = dataPadi.checkoutUrl || 'https://padi.runasp.net';

    // 2. Temporizador de 20 segundos para simular que el pago impactó con éxito
    setTimeout(async () => {
      try {
        const estadoActual = await prisma.obligacionTributaria.findUnique({
          where: { id: obligacionId },
        });

        if (estadoActual && estadoActual.estado !== 'PAGADO') {
          await prisma.$transaction([
            prisma.obligacionTributaria.update({
              where: { id: obligacionId },
              data: { estado: 'PAGADO' },
            }),
            prisma.pago.create({
              data: {
                montoAbonado: obligacion.montoTotal,
                idTransaccionExterna: `PADI-SIM-${Date.now()}`,
                estado: 'COMPLETADO',
                obligacionId: obligacionId,
              },
            }),
          ]);
          console.log(`✅ [Auto-Webhook 20s] Boleta #${obligacionId} marcada como PAGADO.`);
        }
      } catch (err) {
        console.error('Error en el temporizador de pago:', err);
      }
    }, 20000); // 20 segundos

    return res.status(200).json({ link_pago: linkPago });
  } catch (error) {
    console.error('Error generando link:', error);
    return res.status(500).json({ error: 'Error al generar el link de pago' });
  }
});

// Endpoint por si Padi u otro cliente llama al webhook tradicionalmente
router.post('/webhook', async (req, res) => {
  return res.status(200).json({ received: true, message: 'Webhook recibido correctamente' });
});

export default router;