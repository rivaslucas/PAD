import crypto from 'node:crypto';
import prisma from '../config/db.js';

// ⚠️ Mapa en memoria: se pierde si el servidor se reinicia o se duerme (pasa en Render gratis).
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

    // No se puede volver a pagar una boleta ya cobrada
    if (obligacion.estado === 'PAGADO') {
      return res.status(409).json({ error: "Esta boleta ya fue pagada." });
    }

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

    mapeoLinks.set(dataPadi.id, id_obligacion);

    // ==========================================
    // SIMULACIÓN AUTOMÁTICA DE PAGO (10 SEGUNDOS)
    // ==========================================
    setTimeout(async () => {
      try {
        const estadoActual = await prisma.obligacionTributaria.findUnique({
          where: { id: id_obligacion },
        });

        if (estadoActual && estadoActual.estado !== 'PAGADO') {
          await prisma.$transaction([
            prisma.obligacionTributaria.update({
              where: { id: id_obligacion },
              data: { estado: 'PAGADO' },
            }),
            prisma.pago.create({
              data: {
                montoAbonado: montoTotal,
                idTransaccionExterna: `PADI-SIM-${Date.now()}`,
                estado: 'COMPLETADO',
                obligacionId: id_obligacion,
                fechaTransaccion: new Date(),
              },
            }),
          ]);
          console.log(`✅ [Auto-Webhook 10s] Boleta #${id_obligacion} marcada como PAGADO en Clever Cloud.`);
        }
      } catch (err) {
        console.error('Error en el temporizador automático de pago:', err);
      }
    }, 10000); // 10.000 ms = 10 segundos

    res.json({ link_pago: dataPadi.checkoutUrl });
  } catch (error) {
    console.error("Error generando link de pago:", error);
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

    // 1. Validación HMAC-SHA256 sobre el cuerpo crudo
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(req.body)
      .digest('hex');

    const recibida = Buffer.from(signature);
    const esperada = Buffer.from(expectedSignature);

    if (recibida.length !== esperada.length || !crypto.timingSafeEqual(recibida, esperada)) {
      return res.status(401).send('Firma inválida');
    }

    // 2. Parseamos el JSON ya verificado
    const payload = JSON.parse(req.body.toString('utf-8'));

    // 3. Procesamos el pago si fue exitoso
    if (payload.event === 'payment.succeeded') {
      const paymentLinkId = payload.data.paymentLinkId;
      const monto_abonado = payload.data.amount;
      const id_transaccion_padi = payload.data.paymentId;

      // Idempotencia: Si Padi reintenta el aviso, no duplicamos
      const yaRegistrado = await prisma.pago.findFirst({
        where: { idTransaccionExterna: id_transaccion_padi }
      });
      if (yaRegistrado) {
        return res.status(200).json({ received: true });
      }

      const id_obligacion = mapeoLinks.get(paymentLinkId);

      if (!id_obligacion) {
        console.warn(`No se encontró la boleta local para el link Padi: ${paymentLinkId}`);
        return res.status(200).json({ received: true });
      }

      await prisma.$transaction([
        prisma.pago.create({
          data: {
            montoAbonado: monto_abonado,
            idTransaccionExterna: id_transaccion_padi,
            estado: 'COMPLETADO',
            obligacionId: id_obligacion,
            fechaTransaccion: new Date()
          }
        }),
        prisma.obligacionTributaria.update({
          where: { id: id_obligacion },
          data: { estado: 'PAGADO' }
        })
      ]);

      mapeoLinks.delete(paymentLinkId);
      console.log(`✅ ¡Pago Exitoso por Webhook! Boleta ${id_obligacion} cobrada por $${monto_abonado}`);
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error("Error en Webhook:", error);
    res.status(500).json({ error: "Error procesando webhook" });
  }
};