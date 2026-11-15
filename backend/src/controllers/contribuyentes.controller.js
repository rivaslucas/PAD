import prisma from '../config/db.js';

export const obtenerDeudasPorDni = async (req, res) => {
  try {
    const { dni } = req.params;

    const contribuyente = await prisma.contribuyente.findUnique({
      where: { dni },
      include: {
        bienes: {
          include: {
            obligaciones: {
              where: { estado: { in: ['PENDIENTE', 'VENCIDO'] } }
            }
          }
        }
      }
    });

    if (!contribuyente) {
      return res.status(404).json({ mensaje: "Contribuyente no encontrado." });
    }

    const deudas = contribuyente.bienes.flatMap(bien =>
      bien.obligaciones.map(obs => ({
        id: obs.id,
        concepto: obs.concepto,
        periodo: obs.periodo,
        montoTotal: Number(obs.montoOriginal) + Number(obs.interesesMora),
        fechaVencimiento: obs.fechaVencimiento.toISOString().split('T')[0],
        estado: obs.estado,
        bienIdentificador: bien.identificador,
        tipoBien: bien.tipo
      }))
    );

    res.json({
      contribuyente: {
        nombre: contribuyente.nombre,
        apellido: contribuyente.apellido,
        cuit: contribuyente.cuit,
        dni: contribuyente.dni
      },
      deudas
    });

  } catch (error) {
    console.error("Error en obtenerDeudasPorDni:", error);
    res.status(500).json({ error: "Error interno del servidor al buscar deudas." });
  }
};

export const validarIdentidad = async (req, res) => {
  const { dni } = req.body;

  if (!dni) {
    return res.status(400).json({ error: "El DNI es obligatorio." });
  }

  const dniLimpio = String(dni).trim();

  // 1. Consulta en tiempo real a la API de OpenRENAPER
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const response = await fetch('https://api-openrenaper.matiasagustinibanez.com/api/v1/consultas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'dni', numero: dniLimpio }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const dataRenaper = await response.json();
      return res.json({
        autenticado: true,
        origen: 'OPENRENAPER',
        contribuyente: {
          dni: dataRenaper.dni,
          nombre: dataRenaper.nombre,
          cuit: dataRenaper.cuit,
          provincia: dataRenaper.provincia_ubicacion
        }
      });
    }
    console.warn(`OpenRENAPER devolvió status ${response.status}. Activando fallback local...`);
  } catch (error) {
    console.error("Error o timeout conectando con OpenRENAPER:", error.message);
  }

  // 2. Fallback de emergencia: Busca en Clever Cloud si OpenRENAPER falla o el DNI es ficticio
  try {
    const local = await prisma.contribuyente.findUnique({
      where: { dni: dniLimpio }
    });

    if (local) {
      return res.json({
        autenticado: true,
        origen: 'BASE_LOCAL_FALLBACK',
        contribuyente: {
          dni: local.dni,
          nombre: `${local.nombre} ${local.apellido || ''}`.trim(),
          cuit: local.cuit || null,
          provincia: 'TUCUMAN'
        }
      });
    }

    return res.status(404).json({ error: "No se encontró ninguna persona registrada con ese DNI." });
  } catch (dbError) {
    console.error("Error en fallback DB:", dbError);
    return res.status(500).json({ error: "Error interno al validar identidad." });
  }
};