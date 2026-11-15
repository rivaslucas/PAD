import prisma from '../config/db.js';

export const consultarLibreDeudaAutomotor = async (req, res) => {
  try {
    const { patente } = req.params;

    const vehiculo = await prisma.bienRegistrable.findUnique({
      where: { identificador: patente },
      include: {
        obligaciones: {
          where: { estado: { in: ['PENDIENTE', 'VENCIDO'] } }
        }
      }
    });

    if (!vehiculo) {
      return res.status(404).json({ mensaje: "El vehículo no está registrado." });
    }

    const deudas = vehiculo.obligaciones;
    const libreDeuda = deudas.length === 0;

    if (libreDeuda) {
      return res.json({
        dominio: patente,
        libre_deuda: true,
        mensaje: "El vehículo no registra deudas exigibles.",
        fecha_consulta: new Date().toISOString()
      });
    } else {
      const deudaTotal = deudas.reduce((acc, boleta) => acc + Number(boleta.montoOriginal) + Number(boleta.interesesMora), 0);
      return res.json({
        dominio: patente,
        libre_deuda: false,
        deuda_total: deudaTotal,
        periodos_adeudados: deudas.length
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor" });
  }

};
export const consultarLibreDeudaPorDNI = async (req, res) => {
  try {
    const { dni } = req.params;

    // Buscamos al contribuyente, incluyendo TODOS sus bienes y las obligaciones pendientes de CADA bien
    const contribuyente = await prisma.contribuyente.findUnique({
      where: { dni: dni },
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
      return res.status(404).json({ mensaje: "Contribuyente no registrado." });
    }

    // Juntamos todas las deudas de todos los bienes en un solo array
    let todasLasDeudas = [];
    contribuyente.bienes.forEach(bien => {
      todasLasDeudas = [...todasLasDeudas, ...bien.obligaciones];
    });

    const libreDeuda = todasLasDeudas.length === 0;

    if (libreDeuda) {
      return res.json({
        dni: dni,
        nombre: `${contribuyente.nombre} ${contribuyente.apellido}`,
        libre_deuda: true,
        mensaje: "El contribuyente no registra deudas en ninguno de sus bienes.",
        fecha_consulta: new Date().toISOString()
      });
    } else {
      const deudaTotal = todasLasDeudas.reduce((acc, boleta) => acc + Number(boleta.montoOriginal) + Number(boleta.interesesMora), 0);
      
      // Extraemos solo los identificadores (patentes/partidas) que tienen deuda para informarlo
      const bienesConDeuda = contribuyente.bienes
        .filter(bien => bien.obligaciones.length > 0)
        .map(bien => bien.identificador);

      return res.json({
        dni: dni,
        nombre: `${contribuyente.nombre} ${contribuyente.apellido}`,
        libre_deuda: false,
        deuda_total: deudaTotal,
        bienes_con_deuda: bienesConDeuda,
        boletas_vencidas: todasLasDeudas.length
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};
export const consultarLibreDeudaInmobiliario = async (req, res) => {
  try {
    const { partida } = req.params;

    const inmueble = await prisma.bienRegistrable.findUnique({
      where: { identificador: partida },
      include: {
        obligaciones: {
          where: { estado: { in: ['PENDIENTE', 'VENCIDO'] } }
        }
      }
    });

    if (!inmueble || inmueble.tipo !== 'INMOBILIARIO') {
      return res.status(404).json({ mensaje: "La partida inmobiliaria no está registrada." });
    }

    const deudas = inmueble.obligaciones;
    const libreDeuda = deudas.length === 0;

    if (libreDeuda) {
      return res.json({
        partida: partida,
        libre_deuda: true,
        mensaje: "El inmueble no registra deudas exigibles.",
        fecha_consulta: new Date().toISOString()
      });
    } else {
      const deudaTotal = deudas.reduce((acc, boleta) => acc + Number(boleta.montoOriginal) + Number(boleta.interesesMora), 0);
      return res.json({
        partida: partida,
        libre_deuda: false,
        deuda_total: deudaTotal,
        periodos_adeudados: deudas.length
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};
export const consultarConstanciaInscripcion = async (req, res) => {
  try {
    const { cuit } = req.params;

    const contribuyente = await prisma.contribuyente.findUnique({
      where: { cuit: cuit }
    });

    if (!contribuyente) {
      return res.status(404).json({ 
        estado: "INEXISTENTE",
        mensaje: "No se registra contribuyente activo con ese CUIT." 
      });
    }

    return res.json({
      cuit: contribuyente.cuit,
      estado: "ACTIVO",
      nombre_razon_social: `${contribuyente.nombre} ${contribuyente.apellido}`,
      fecha_alta: contribuyente.createdAt,
      // Como Rentas, podés devolver qué impuestos tiene activos por defecto
      impuestos_activos: ["Ingresos Brutos", "Salud Pública"] 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};