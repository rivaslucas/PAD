import prisma from '../config/db.js';

export const obtenerDeudasPorDni = async (req, res) => {
  try {
    const { dni } = req.params;

    // Buscamos al contribuyente usando los nombres exactos de tu schema.prisma
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

    // Aplanamos las deudas y convertimos los Decimal de Prisma a números estándar
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