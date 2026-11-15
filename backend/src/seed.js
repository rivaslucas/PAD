import prisma from './config/db.js';

async function main() {
  console.log('Inyectando datos de prueba en MySQL...');

  // Limpiamos la base antes de insertar para que no tire error de DNI duplicado si lo corrés varias veces
  await prisma.pago.deleteMany();
  await prisma.obligacionTributaria.deleteMany();
  await prisma.bienRegistrable.deleteMany();
  await prisma.contribuyente.deleteMany();

  // Creamos un contribuyente con MÚLTIPLES bienes (Auto y Casa)
  const nuevoContribuyente = await prisma.contribuyente.create({
    data: {
      dni: "35123456",
      cuit: "20351234567", // Agregado para probar la constancia de inscripción
      nombre: "Juan",
      apellido: "Perez",
      email: "juan@ejemplo.com",
      bienes: {
        create: [
          {
            tipo: "AUTOMOTOR",
            identificador: "AB123CD",
            obligaciones: {
              create: {
                concepto: "Impuesto Automotor - Cuota 10",
                periodo: "2026-10",
                montoOriginal: 45500.00,
                interesesMora: 1500.00,
                fechaVencimiento: new Date("2026-10-10"),
                estado: "VENCIDO"
              }
            }
          },
          {
            tipo: "INMOBILIARIO",
            identificador: "PADRON-987654", // Identificador de una casa/terreno
            obligaciones: {
              create: {
                concepto: "Impuesto Inmobiliario - Cuota 11",
                periodo: "2026-11",
                montoOriginal: 85000.00,
                interesesMora: 0.00,
                fechaVencimiento: new Date("2026-11-20"),
                estado: "PENDIENTE"
              }
            }
          }
        ]
      }
    }
  });

  console.log('¡Datos creados con éxito!');
  console.dir(nuevoContribuyente, { depth: null });
}

main()
  .catch((e) => {
    console.error("Hubo un error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });