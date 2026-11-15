import prisma from '../config/db.js';

export const obtenerDeudasPorDni = async (req, res) => {
  try {
    const { dni } = req.params;

    // Buscamos al contribuyente, sus bienes y las obligaciones vencidas/pendientes
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

    // Aplanamos las deudas de todos sus bienes en una sola lista para el frontend
    const deudas = contribuyente.bienes.flatMap(bien =>
      bien.obligaciones.map(obs => ({
        id: obs.id,
        concepto: obs.concepto,
        periodo: obs.periodo,
        montoTotal: Number(obs.montoOriginal) + Number(obs.interesesMora),
        fechaVencimiento: obs.fechaVencimiento.toISOString().split('T')[0], // Formato YYYY-MM-DD
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
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};