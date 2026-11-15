import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Limpiando base de datos...');
  // Borramos en orden para no romper restricciones de clave foránea
  await prisma.pago.deleteMany();
  await prisma.obligacionTributaria.deleteMany();
  await prisma.bienRegistrable.deleteMany();
  await prisma.contribuyente.deleteMany();

  console.log('Creando contribuyentes y bienes de prueba...');

  // 1. Tu usuario (DNI real para OpenRENAPER con tu moto y un inmueble)
  await prisma.contribuyente.create({
    data: {
      dni: "43650258",
      cuit: "20436502584",
      nombre: "Lucas Valentín",
      apellido: "RIVAS",
      email: "lucasvalentinrivas@gmail.com",
      telefono: "3865210198",
      bienes: {
        create: [
          {
            identificador: "A203XEA",
            tipo: "AUTOMOTOR",
            obligaciones: {
              create: [
                {
                  concepto: "Patente Motovehículo - Skua 150",
                  periodo: "2026-10",
                  montoOriginal: 18500.00,
                  interesesMora: 1200.00,
                  fechaVencimiento: new Date("2026-10-10"),
                  estado: "VENCIDO"
                },
                {
                  concepto: "Patente Motovehículo - Skua 150",
                  periodo: "2026-11",
                  montoOriginal: 18500.00,
                  interesesMora: 0.00,
                  fechaVencimiento: new Date("2026-11-10"),
                  estado: "PENDIENTE"
                }
              ]
            }
          },
          {
            identificador: "PADRON-436502",
            tipo: "INMOBILIARIO",
            obligaciones: {
              create: [
                {
                  concepto: "Impuesto Inmobiliario",
                  periodo: "2026-Bimestre 5",
                  montoOriginal: 24000.00,
                  interesesMora: 0.00,
                  fechaVencimiento: new Date("2026-11-15"),
                  estado: "PENDIENTE"
                }
              ]
            }
          }
        ]
      }
    }
  });

  // 2. Usuario de tu compañera (DNI 41818887)
  await prisma.contribuyente.create({
    data: {
      dni: "41818887",
      cuit: "27418188879",
      nombre: "Compañera",
      apellido: "TFI",
      email: "companera@utn.edu.ar",
      bienes: {
        create: [
          {
            identificador: "AD789KL",
            tipo: "AUTOMOTOR",
            obligaciones: {
              create: [
                {
                  concepto: "Impuesto Automotor",
                  periodo: "2026-10",
                  montoOriginal: 35000.00,
                  interesesMora: 1500.00,
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

  // 3. Juan Pérez (Caso clásico de prueba)
  await prisma.contribuyente.create({
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

  console.log('✅ ¡Base de datos poblada con éxito!');
  console.log('DNIs disponibles para ingresar:');
  console.log(' - 43650258 (Lucas - Tu moto A203XEA e Inmueble)');
  console.log(' - 41818887 (Compañera - Vehículo AD789KL)');
  console.log(' - 35123456 (Juan Pérez - Vehículo AB123CD)');
}

main()
  .catch((e) => {
    console.error("Error al inyectar datos:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });