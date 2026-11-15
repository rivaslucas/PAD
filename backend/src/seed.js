import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/* ───────────── Utilidades ───────────── */

const HOY = new Date('2026-11-15T12:00:00Z'); // fecha de referencia del seed
const DIA = 86400000;

// PRNG determinista: siempre genera los mismos datos
let _s = 20261115;
const rnd = () => (_s = (_s * 1664525 + 1013904223) % 4294967296) / 4294967296;
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const r50 = (n) => Math.round(n / 50) * 50;
const fecha = (m, d) => new Date(Date.UTC(2026, m - 1, d));
const dias = (a, b) => Math.round((a - b) / DIA);

// CUIT válido a partir del DNI (prefijo 20 = masculino, 27 = femenino)
function cuitDe(dni, pre = '20') {
  const base = pre + String(dni).padStart(8, '0');
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = base.split('').reduce((a, d, i) => a + Number(d) * pesos[i], 0);
  let dv = 11 - (suma % 11);
  if (dv === 11) dv = 0;
  if (dv === 10) return '23' + String(dni).padStart(8, '0') + (pre === '20' ? '9' : '4');
  return base + dv;
}

const P = 'PAGADO', V = 'VENCIDO', N = 'PENDIENTE';
const MEDIOS = ['TARJETA_DEBITO', 'TARJETA_CREDITO', 'TRANSFERENCIA', 'DINERO_EN_CUENTA'];

const plan = new Map(); // "identificador|periodo" -> datos del pago
const pagos = [];
const usadas = new Set();

/* ───────────── Generadores de obligaciones ───────────── */

function mkOb(ident, concepto, periodo, monto, vence, estado) {
  let mora = 0;
  if (estado === V) {
    mora = r50(monto * 0.035 * Math.min(8, Math.max(1, Math.ceil(dias(HOY, vence) / 30))));
  } else if (estado === P) {
    const tarde = rnd() < 0.2;
    let fp = new Date(vence.getTime() + (tarde ? ri(1, 12) : -ri(0, 9)) * DIA);
    if (fp > HOY) fp = new Date(HOY.getTime() - ri(1, 6) * DIA);
    if (tarde) mora = r50(monto * 0.035);
    plan.set(`${ident}|${periodo}`, { fechaPago: fp, monto: monto + mora, medio: pick(MEDIOS) });
  }
  return { concepto, periodo, montoOriginal: monto, interesesMora: mora, fechaVencimiento: vence, estado };
}

// Estados al azar: meses 6 a 12 (automotor) y bimestres 1 a 6 (inmobiliario)
const estM = () => [
  ...[0, 0, 0, 0].map(() => (rnd() < 0.85 ? P : V)),
  rnd() < 0.5 ? P : V,
  rnd() < 0.4 ? P : N,
  N,
];
const estB = () => [
  ...[0, 0, 0].map(() => (rnd() < 0.9 ? P : V)),
  rnd() < 0.75 ? P : V,
  rnd() < 0.3 ? P : N,
  N,
];

// Patentes mensuales de junio a diciembre (nov y dic vencen el 25)
const mensuales = (ident, concepto, monto, est = estM()) =>
  [6, 7, 8, 9, 10, 11, 12].map((m, i) =>
    mkOb(ident, concepto, `2026-${String(m).padStart(2, '0')}`, monto, fecha(m, m >= 11 ? 25 : 10), est[i]),
  );

// Inmobiliario bimestral
const VENC_BIM = [[2, 15], [4, 15], [6, 15], [8, 15], [11, 15], [12, 30]];
const bimestrales = (ident, monto, est = estB()) =>
  VENC_BIM.map(([m, d], i) =>
    mkOb(ident, 'Impuesto Inmobiliario', `2026-Bimestre ${i + 1}`, monto, fecha(m, d), est[i]),
  );

const auto = (ident, desc, monto, est) => ({ ident, tipo: 'AUTOMOTOR', obs: mensuales(ident, `Impuesto Automotor - ${desc}`, monto, est) });
const moto = (ident, desc, monto, est) => ({ ident, tipo: 'AUTOMOTOR', obs: mensuales(ident, `Patente Motovehículo - ${desc}`, monto, est) });
const inmueble = (ident, monto, est) => ({ ident, tipo: 'INMOBILIARIO', obs: bimestrales(ident, monto, est) });

/* ───────────── Alta de contribuyentes ───────────── */

async function crear({ dni, pre = '20', nombre, apellido, email, telefono, bienes }) {
  const c = await prisma.contribuyente.create({
    data: {
      dni,
      cuit: cuitDe(dni, pre),
      nombre,
      apellido,
      email,
      telefono,
      bienes: {
        create: bienes.map((b) => ({
          identificador: b.ident,
          tipo: b.tipo,
          obligaciones: { create: b.obs },
        })),
      },
    },
    include: { bienes: { include: { obligaciones: true } } },
  });

  for (const b of c.bienes) {
    for (const o of b.obligaciones) {
      if (o.estado !== P) continue;
      const p = plan.get(`${b.identificador}|${o.periodo}`);
      // ⚠️ AJUSTAR los nombres de campo al modelo Pago de tu schema.prisma
      pagos.push({
        obligacionId: o.id,
        monto: p.monto,
        fechaPago: p.fechaPago,
        medioPago: p.medio,
        referencia: `PADI-${dni}-${String(o.id).slice(-6).toUpperCase()}`,
        estado: 'APROBADO',
      });
    }
  }
  return c;
}

const patente = () => {
  let p;
  do {
    const L = () => String.fromCharCode(65 + ri(0, 25));
    p = `${L()}${L()}${ri(100, 999)}${L()}${L()}`;
  } while (usadas.has(p));
  usadas.add(p);
  return p;
};
const padron = () => {
  let p;
  do p = `PADRON-${ri(100000, 999999)}`;
  while (usadas.has(p));
  usadas.add(p);
  return p;
};

/* ───────────── Main ───────────── */

async function main() {
  console.log('Limpiando base de datos...');
  await prisma.pago.deleteMany();
  await prisma.obligacionTributaria.deleteMany();
  await prisma.bienRegistrable.deleteMany();
  await prisma.contribuyente.deleteMany();

  console.log('Creando contribuyentes clave...');

  // 1. Lucas: historial al día con un vencido y pendientes por venir
  await crear({
    dni: '43650258', pre: '20', nombre: 'Lucas Valentín', apellido: 'RIVAS',
    email: 'lucasvalentinrivas@gmail.com', telefono: '3865210198',
    bienes: [
      moto('A203XEA', 'Skua 150', 18500, [P, P, P, P, V, N, N]),
      inmueble('PADRON-436502', 24000, [P, P, P, P, N, N]),
    ],
  });

  // 2. Compañera TFI: algunas vencidas
  await crear({
    dni: '41818887', pre: '27', nombre: 'Compañera', apellido: 'TFI',
    email: 'companera@utn.edu.ar', telefono: '3865123456',
    bienes: [
      auto('AD789KL', 'Volkswagen Gol Trend', 35000, [P, P, P, V, V, N, N]),
      inmueble('PADRON-418188', 31500, [P, P, V, V, N, N]),
    ],
  });

  // 3. ⚠️ Cambiá nombre y apellido por los reales
  await crear({
    dni: '21330031', pre: '20', nombre: 'Roberto Daniel', apellido: 'SOSA',
    email: 'roberto.sosa@ejemplo.com', telefono: '3865334455',
    bienes: [
      auto('AC412TR', 'Toyota Hilux SRV', 52000, [P, P, P, P, P, N, N]),
      moto('A118KMB', 'Motomel B110', 9800, [P, P, P, P, P, P, N]),
      inmueble('PADRON-213300', 38000, [P, P, P, P, N, N]),
    ],
  });

  // 4. ⚠️ Cambiá nombre y apellido por los reales (deudor crónico para probar vencidas)
  await crear({
    dni: '39976337', pre: '27', nombre: 'María Belén', apellido: 'ACOSTA',
    email: 'belen.acosta@ejemplo.com', telefono: '3865778899',
    bienes: [
      moto('A087PQW', 'Honda CB 190', 21000, [P, P, V, V, V, N, N]),
      auto('AE255JD', 'Chevrolet Onix', 41000, [P, P, P, P, P, N, N]),
      inmueble('PADRON-399763', 27500, [V, V, V, V, N, N]),
    ],
  });

  console.log('Generando contribuyentes adicionales...');

  const nombres = ['Martín', 'Sofía', 'Joaquín', 'Valentina', 'Facundo', 'Camila', 'Nicolás', 'Lucía', 'Matías', 'Agustina',
    'Gonzalo', 'Florencia', 'Sebastián', 'Julieta', 'Emiliano', 'Carolina', 'Federico', 'Natalia', 'Ramiro', 'Paula'];
  const apellidos = ['GÓMEZ', 'FERNÁNDEZ', 'LÓPEZ', 'DÍAZ', 'MARTÍNEZ', 'PÉREZ', 'ROMERO', 'SUÁREZ', 'ÁLVAREZ', 'TORRES',
    'RUIZ', 'RAMÍREZ', 'FLORES', 'BENÍTEZ', 'MEDINA', 'HERRERA', 'AGUIRRE', 'GIMÉNEZ', 'CASTRO', 'ROJAS'];
  const vehiculos = [
    ['Ford Ranger', 49000], ['Renault Kangoo', 33500], ['Fiat Cronos', 30500], ['Peugeot 208', 36000],
    ['Volkswagen Amarok', 55000], ['Toyota Corolla', 44000], ['Citroën C3', 28500], ['Chevrolet Cruze', 40000],
  ];
  const motos = [['Honda Wave 110', 8500], ['Yamaha FZ 150', 16500], ['Zanella ZB 110', 8200], ['Corven Energy 110', 8800], ['Gilera Smash 110', 8300]];

  const dnis = new Set(['43650258', '41818887', '21330031', '39976337']);
  for (let i = 0; i < 20; i++) {
    let dni;
    do dni = String(ri(18000000, 46000000));
    while (dnis.has(dni));
    dnis.add(dni);

    const mujer = i % 2 === 1;
    const bienes = [];
    const cant = ri(1, 3);
    for (let k = 0; k < cant; k++) {
      const t = rnd();
      if (t < 0.4) { const [d, m] = pick(vehiculos); bienes.push(auto(patente(), d, r50(m * (0.9 + rnd() * 0.3)))); }
      else if (t < 0.7) { const [d, m] = pick(motos); bienes.push(moto(patente(), d, r50(m * (0.9 + rnd() * 0.3)))); }
      else bienes.push(inmueble(padron(), r50(14000 + rnd() * 46000)));
    }

    const nombre = nombres[i];
    const apellido = apellidos[(i * 7) % apellidos.length];
    await crear({
      dni, pre: mujer ? '27' : '20', nombre, apellido,
      email: `${nombre}.${apellido}${i}@ejemplo.com`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
      telefono: `3865${ri(100000, 999999)}`,
      bienes,
    });
  }

  console.log('Registrando historial de pagos...');
  await prisma.pago.createMany({ data: pagos });

  const totalOb = await prisma.obligacionTributaria.count();
  const porEstado = await prisma.obligacionTributaria.groupBy({ by: ['estado'], _count: true });

  console.log('✅ ¡Base de datos poblada con éxito!');
  console.log(`   Contribuyentes: ${await prisma.contribuyente.count()}`);
  console.log(`   Obligaciones:   ${totalOb}`);
  porEstado.forEach((e) => console.log(`     - ${e.estado}: ${e._count}`));
  console.log(`   Pagos:          ${pagos.length}`);
  console.log('DNIs clave para ingresar:');
  console.log(' - 43650258 (Lucas: moto A203XEA e inmueble)');
  console.log(' - 41818887 (Compañera: Gol Trend e inmueble)');
  console.log(' - 21330031 (Hilux, moto e inmueble, casi todo pagado)');
  console.log(' - 39976337 (Moto, Onix e inmueble, con varias vencidas)');
}

main()
  .catch((e) => {
    console.error('Error al inyectar datos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });