import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Limpiando base de datos...');
  // Hay que borrar en orden para no romper las relaciones
  await prisma.pago.deleteMany();
  await prisma.obligacionTributaria.deleteMany();
  await prisma.bienRegistrable.deleteMany();
  await prisma.contribuyente.deleteMany();

  console.log('Creando contribuyente de prueba con vehículo y deudas...');
  const juan = await prisma.contribuyente.create({
    data: {
      dni: "35123456",
      cuit: "20351234567",
      nombre: "Juan",
      apellido: "Perez",
      email: "juan@ejemplo.com",
      bienes: {
        create: [
          {
            identificador: "AB123CD",
            tipo: "AUTOMOTOR",
            obligaciones: {
              create: [
                {
                  concepto: "Impuesto Automotor",
                  periodo: "2026-10",
                  montoOriginal: 45000.00,
                  interesesMora: 2000.00,
                  fechaVencimiento: new Date("2026-10-10"),
                  estado: "VENCIDO"
                }
              ]
            }
          }
        ]
      }
    }
  });

  console.log('✅ ¡Datos de prueba cargados con éxito!');
  console.log(`DNI para ingresar en el Dashboard: ${juan.dni}`);
}

main()
  .catch((e) => {
    console.error("Error al inyectar datos:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });