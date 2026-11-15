import prisma from '../config/db.js';


// ==========================================
// 1. FUNCIÓN PARA PEDIR EL LINK DE PAGO A PADI
// ==========================================
export const generarLinkDePago = async (req, res) => {
  try {
    const { id_obligacion } = req.body;

    // 1. Buscamos la boleta en nuestra BD
    const obligacion = await prisma.obligacionTributaria.findUnique({
      where: { id: id_obligacion },
      include: { bien: true }
    });

    if (!obligacion) {
      return res.status(404).json({ error: "Boleta no encontrada" });
    }

    // 2. Calculamos el total a pagar (Padi pide el número exacto, máximo 2 decimales)
    const montoTotal = Number(obligacion.montoOriginal) + Number(obligacion.interesesMora);

    // 3. Armamos la petición EXÁCTAMENTE como lo pide la documentación de Padi
    const padiUrl = 'https://padi.runasp.net/api/v1/integrations/payment-links';
    const apiKey = process.env.PADI_API_KEY;

    const padiResponse = await fetch(padiUrl, {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: montoTotal,
        title: `${obligacion.concepto} - ${obligacion.bien.identificador}`.substring(0, 128), // Padi pide máximo 128 caracteres
        currency: "ARS",
        type: "SingleUse"
      })
    });

    if (!padiResponse.ok) {
      const errorPadi = await padiResponse.text();
      console.error("Error de Padi:", errorPadi);
      return res.status(500).json({ error: "No se pudo conectar con la pasarela de pagos" });
    }

    // 4. Padi nos devuelve el JSON exitoso (código 201)
    const dataPadi = await padiResponse.json();
    
    // Le mandamos al Frontend el checkoutUrl que es donde el usuario va a poner su tarjeta
    res.json({ link_pago: dataPadi.checkoutUrl }); 

  } catch (error) {
    console.error("Error al generar link de pago:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ==========================================
// 2. WEBHOOK: PADI NOS AVISA QUE YA SE COBRÓ
// ==========================================
export const registrarPagoWebhook = async (req, res) => {
  try {
    // Datos que acordamos que el grupo Padi (Billetera Virtual) nos va a enviar
    const { id_obligacion, monto_abonado, id_transaccion_padi } = req.body;

    // 1. Verificamos que la boleta exista
    const obligacion = await prisma.obligacionTributaria.findUnique({
      where: { id: id_obligacion }
    });

    if (!obligacion) {
      return res.status(404).json({ error: "Boleta no encontrada" });
    }

    if (obligacion.estado === 'PAGADO') {
      return res.status(400).json({ error: "Esta boleta ya se encuentra pagada" });
    }

    // 2. Transacción de Prisma: Guardamos el comprobante y marcamos la boleta como PAGADA al mismo tiempo
    const resultado = await prisma.$transaction([
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

    return res.status(200).json({
      mensaje: "Pago registrado exitosamente",
      pago_id: resultado[0].id,
      transaccion_padi: resultado[0].idTransaccionExterna
    });

  } catch (error) {
    console.error("Error en el Webhook de pagos:", error);
    res.status(500).json({ error: "Error interno procesando el pago" });
  }
};