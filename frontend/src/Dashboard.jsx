import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

/* ───────────── Utilidades ───────────── */

const formatARS = (n) =>
  Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ESTADOS = {
  VENCIDO: { label: 'Vencida', bar: 'bg-[#B3261E]', chip: 'bg-[#FBE9E7] text-[#8C1D18]', dot: 'bg-[#B3261E]' },
  PENDIENTE: { label: 'Pendiente', bar: 'bg-[#C98A00]', chip: 'bg-[#FFF3D6] text-[#7A5200]', dot: 'bg-[#C98A00]' },
  PAGADO: { label: 'Pagada', bar: 'bg-[#1B6B3A]', chip: 'bg-[#E3F3E8] text-[#1B6B3A]', dot: 'bg-[#1B6B3A]' },
};

const fmtFecha = (f) => {
  if (!f) return '';
  const d = new Date(f);
  return isNaN(d) ? f : d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
};

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const periodoClave = (p = '') => {
  const mensual = /^(\d{4})-(\d{1,2})$/.exec(p);
  if (mensual) return Number(mensual[1]) * 100 + Number(mensual[2]);
  const bim = /^(\d{4})-Bimestre (\d)$/.exec(p);
  if (bim) return Number(bim[1]) * 100 + Number(bim[2]) * 2;
  return 0;
};

const periodoLabel = (p = '') => {
  const mensual = /^(\d{4})-(\d{1,2})$/.exec(p);
  if (mensual) return `${MESES[Number(mensual[2]) - 1]} ${mensual[1]}`;
  const bim = /^(\d{4})-Bimestre (\d)$/.exec(p);
  if (bim) return `Bimestre ${bim[2]} de ${bim[1]}`;
  return p;
};

const nombreBien = (d) =>
  d.tipoBien === 'INMOBILIARIO' ? 'Inmueble' : (d.concepto || '').split(' - ')[1] || 'Vehículo';

const estadoDe = (e) =>
  ESTADOS[e] || { label: e, bar: 'bg-slate-400', chip: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' };

const generarBarras = (seed) => {
  let s = (Number(seed) || 7) * 9301 + 49297;
  const barras = [];
  let x = 0;
  while (x < 280) {
    s = (s * 9301 + 49297) % 233280;
    const w = 1 + Math.floor((s / 233280) * 3);
    barras.push({ x, w });
    x += w + 1 + Math.floor((s / 233280) * 2);
  }
  return barras;
};

/* ───────────── Iconos ───────────── */

const Icon = ({ d, className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d={d} />
  </svg>
);

const ICONOS = {
  salir: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  tarjeta: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7zM3 10h18M7 15h3',
  doc: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5zM14 3v5h5M9 13h6M9 17h6',
  imprimir: 'M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2M7 14h10v7H7z',
  cerrar: 'M6 6l12 12M18 6L6 18',
  buscar: 'M21 21l-4.3-4.3M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  alerta: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
};

/* ───────────── Componente ───────────── */

export default function Dashboard() {
  const navigate = useNavigate();

  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [errorPago, setErrorPago] = useState(null);
  const [pagandoId, setPagandoId] = useState(null);
  const [boletaSeleccionada, setBoletaSeleccionada] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [filtroBien, setFiltroBien] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [periodoDesde, setPeriodoDesde] = useState('');
  const [periodoHasta, setPeriodoHasta] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'https://pad-3anq.onrender.com';

  const dniUsuario = localStorage.getItem('dniUsuario');
  const origenValidacion = localStorage.getItem('origenValidacion');
  const datosGuardados = JSON.parse(localStorage.getItem('datosContribuyente') || 'null');

  useEffect(() => {
    if (!dniUsuario) {
      navigate('/');
      return;
    }

    const obtenerDeudas = async () => {
      try {
        const respuesta = await fetch(`${API_URL}/api/contribuyentes/${dniUsuario}/deudas`);

        if (respuesta.status === 404 && datosGuardados) {
          setDatos({
            contribuyente: {
              nombre: datosGuardados.nombre,
              apellido: '',
              cuit: datosGuardados.cuit,
              dni: datosGuardados.dni,
            },
            deudas: [],
          });
          return;
        }

        if (!respuesta.ok) {
          throw new Error('No se pudieron recuperar los registros del contribuyente.');
        }

        setDatos(await respuesta.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setCargando(false);
      }
    };

    obtenerDeudas();
  }, [dniUsuario, navigate]);

  useEffect(() => {
    if (!boletaSeleccionada) return;
    const onKey = (e) => e.key === 'Escape' && setBoletaSeleccionada(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [boletaSeleccionada]);

  const todas = datos?.deudas || [];
  const deudas = todas.filter((d) => d.estado !== 'PAGADO');
  const pagadas = (datos?.pagos?.length ? datos.pagos : todas.filter((d) => d.estado === 'PAGADO'))
    .slice()
    .sort((a, b) => String(b.fechaPago || b.fechaVencimiento).localeCompare(String(a.fechaPago || a.fechaVencimiento)));
  const totalPagado = pagadas.reduce((a, d) => a + (d.montoTotal || 0), 0);
  const proximoVenc = deudas
    .filter((d) => d.estado !== 'VENCIDO')
    .map((d) => d.fechaVencimiento)
    .sort()[0];

  const bienes = [];
  const periodos = [];
  [...deudas, ...pagadas].forEach((d) => {
    if (d.bienIdentificador && !bienes.some((b) => b.id === d.bienIdentificador)) {
      bienes.push({ id: d.bienIdentificador, nombre: nombreBien(d) });
    }
    if (d.periodo && !periodos.includes(d.periodo)) periodos.push(d.periodo);
  });
  periodos.sort((a, b) => periodoClave(a) - periodoClave(b) || a.localeCompare(b));

  const filtrosActivos = filtroBien !== 'TODOS' || busqueda.trim() !== '' || periodoDesde !== '' || periodoHasta !== '';
  const rangoInvertido = periodoDesde && periodoHasta && periodoClave(periodoDesde) > periodoClave(periodoHasta);

  const pasaFiltros = (d) => {
    if (filtroBien !== 'TODOS' && d.bienIdentificador !== filtroBien) return false;
    const q = busqueda.trim().toLowerCase();
    if (q && !`${d.bienIdentificador || ''} ${d.concepto || ''}`.toLowerCase().includes(q)) return false;
    const k = periodoClave(d.periodo);
    if (periodoDesde && k < periodoClave(periodoDesde)) return false;
    if (periodoHasta && k > periodoClave(periodoHasta)) return false;
    return true;
  };
  const deudasBase = deudas.filter(pasaFiltros);
  const pagadasBase = pagadas.filter(pasaFiltros);

  const limpiarFiltros = () => {
    setFiltroBien('TODOS');
    setBusqueda('');
    setPeriodoDesde('');
    setPeriodoHasta('');
  };

  const resumen = useMemo(() => {
    const vencidas = deudas.filter((d) => d.estado === 'VENCIDO');
    const pendientes = deudas.filter((d) => d.estado !== 'VENCIDO');
    const suma = (l) => l.reduce((a, d) => a + (d.montoTotal || 0), 0);
    return {
      total: suma(deudas),
      montoVencido: suma(vencidas),
      montoPendiente: suma(pendientes),
      nVencidas: vencidas.length,
      nPendientes: pendientes.length,
    };
  }, [deudas]);

  const deudasFiltradas =
    filtroEstado === 'HISTORIAL'
      ? []
      : filtroEstado === 'TODOS'
        ? [...deudasBase, ...pagadasBase]
        : deudasBase.filter((b) => b.estado === filtroEstado);
  const totalFiltrado = deudasFiltradas.filter((b) => b.estado !== 'PAGADO').reduce((acc, b) => acc + (b.montoTotal || 0), 0);

  const handleCerrarSesion = () => {
    localStorage.clear();
    navigate('/');
  };

 const handlePagar = async (id_obligacion) => {
    setErrorPago(null);
    setPagandoId(id_obligacion);

    // 1. Abrimos una pestaña en blanco al instante (evita el bloqueo de pop-ups del navegador)
    const ventanaPadi = window.open('', '_blank');
    if (ventanaPadi) {
      ventanaPadi.document.write('<html><head><title>Cargando pasarela de pago...</title></head><body style="font-family:sans-serif; text-align:center; padding-top:50px;"><h3>Conectando con la pasarela Padi...</h3><p>Por favor espere.</p></body></html>');
    }

    try {
      const response = await fetch(`${API_URL}/api/pagos/generar-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_obligacion }),
      });

      if (!response.ok) {
        if (ventanaPadi) ventanaPadi.close();
        setErrorPago('No pudimos iniciar el pago con Padi. Intentá de nuevo en unos minutos.');
        setPagandoId(null);
        return;
      }

      const data = await response.json();
      if (data.link_pago) {
        // 2. Redirigimos la pestaña que ya abrimos hacia el link oficial de Padi
        if (ventanaPadi) {
          ventanaPadi.location.href = data.link_pago;
        } else {
          // Fallback por si el navegador bloqueó totalmente la ventana
          window.open(data.link_pago, '_blank');
        }

        // 3. A los 11 segundos refresca automáticamente las deudas e historial en tu portal
        setTimeout(async () => {
          try {
            const resActualizada = await fetch(`${API_URL}/api/contribuyentes/${dniUsuario}/deudas`);
            if (resActualizada.ok) {
              setDatos(await resActualizada.json());
            }
          } finally {
            setPagandoId(null);
          }
        }, 11000);
      } else {
        if (ventanaPadi) ventanaPadi.close();
        setErrorPago('La pasarela de pagos no devolvió un enlace válido. Intentá de nuevo.');
        setPagandoId(null);
      }
    } catch (err) {
      console.error('Error de red:', err);
      if (ventanaPadi) ventanaPadi.close();
      setErrorPago('No hay conexión con el servidor de pagos. Revisá tu internet e intentá de nuevo.');
      setPagandoId(null);
    }
  };

  /* ───────────── Estados de carga y error ───────────── */

  if (cargando) {
    return (
      <div className="min-h-screen bg-[#EDF1F4] flex flex-col justify-center items-center gap-4">
        <div className="w-9 h-9 border-[3px] border-[#0E4A6B] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-600">Consultando tus obligaciones…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#EDF1F4] flex justify-center items-center p-4">
        <div className="bg-white border border-[#D5DDE3] p-8 rounded-lg max-w-md w-full space-y-5">
          <div className="w-11 h-11 bg-[#FBE9E7] text-[#B3261E] rounded-full flex items-center justify-center">
            <Icon d={ICONOS.alerta} className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-bold text-[#12202B]">No pudimos cargar tu cuenta</h1>
            <p className="text-sm text-slate-600">{error}</p>
          </div>
          <button
            onClick={handleCerrarSesion}
            className="w-full bg-[#0E4A6B] text-white py-3 rounded-md text-sm font-semibold hover:bg-[#0B3B56] transition cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E4A6B]"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const pctVencido = resumen.total > 0 ? (resumen.montoVencido / resumen.total) * 100 : 0;
  const [enteros, decimales] = formatARS(resumen.total).split(',');

  const tabs = [
    { id: 'TODOS', label: 'Todas', n: deudasBase.length + pagadasBase.length },
    { id: 'VENCIDO', label: 'Vencidas', n: deudasBase.filter((d) => d.estado === 'VENCIDO').length },
    { id: 'PENDIENTE', label: 'Pendientes', n: deudasBase.filter((d) => d.estado !== 'VENCIDO').length },
    { id: 'HISTORIAL', label: 'Historial de pagos', n: pagadasBase.length },
  ];

  const nombreReal =
    origenValidacion === 'OPENRENAPER' && datosGuardados?.nombre
      ? `${datosGuardados.nombre} ${datosGuardados.apellido || ''}`.trim()
      : `${datos.contribuyente.nombre} ${datos.contribuyente.apellido || ''}`.trim();

  return (
    <div
      className="min-h-screen bg-[#EDF1F4] text-[#12202B] antialiased selection:bg-[#0E4A6B] selection:text-white"
      style={{ fontFamily: "'Atkinson Hyperlegible', system-ui, -apple-system, 'Segoe UI', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap');
        .num { font-variant-numeric: tabular-nums; }
        @keyframes sheetIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        .sheet-in { animation: sheetIn .22s ease-out; }
        @media (prefers-reduced-motion: reduce) { .sheet-in { animation: none; } }
        @media print {
          body * { visibility: hidden; }
          #boleta-imprimible, #boleta-imprimible * { visibility: visible; }
          #boleta-imprimible { position: fixed; left: 0; top: 0; width: 100%; box-shadow: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Encabezado */}
      <header className="bg-white border-b border-[#D5DDE3] sticky top-0 z-30">
        <div className="h-1 bg-[#74ACDF]" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0E4A6B] rounded-md flex items-center justify-center text-white font-bold text-sm tracking-tight">
              ART
            </div>
            <div className="leading-tight">
              <span className="text-xs text-slate-500 block">Agencia de Recaudación</span>
              <span className="text-base font-bold">Portal del Contribuyente</span>
            </div>
          </div>

          <button
            onClick={handleCerrarSesion}
            className="text-sm font-bold text-slate-700 hover:text-[#B3261E] px-3 py-2 rounded-md hover:bg-[#FBE9E7] transition cursor-pointer flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E4A6B]"
          >
            <Icon d={ICONOS.salir} />
            <span className="hidden sm:inline">Cerrar sesión</span>
            <span className="sm:hidden sr-only">Cerrar sesión</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-8">

        {/* Identidad + resumen */}
        <section className="grid lg:grid-cols-[1fr_380px] gap-8 lg:gap-10 items-start">
          <div className="space-y-4 pt-1">
            <p className="text-sm text-slate-500">Cuenta del contribuyente</p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#12202B] leading-tight">
              {nombreReal || 'Contribuyente'}
            </h1>
            <p className="text-sm text-slate-600 num">
              DNI <strong className="text-[#12202B]">{datos.contribuyente.dni}</strong>
              {datos.contribuyente.cuit && (
                <span className="ml-4">
                  CUIT <strong className="text-[#12202B]">{datos.contribuyente.cuit}</strong>
                </span>
              )}
            </p>
            {origenValidacion === 'OPENRENAPER' && (
              <p className="inline-flex items-center gap-2 text-sm font-bold text-[#1B6B3A] bg-[#E3F3E8] px-3 py-1.5 rounded-md">
                <Icon d={ICONOS.check} />
                Identidad verificada con OpenRENAPER
              </p>
            )}
          </div>

          {/* Panel principal: cuánto se debe */}
          <div className="bg-[#0E4A6B] text-white rounded-lg p-6 sm:p-7 space-y-5">
            {resumen.total > 0 ? (
              <>
                <div>
                  <p className="text-sm text-[#BFD9EA]">Total adeudado</p>
                  <p className="num font-bold leading-none mt-2 flex items-baseline">
                    <span className="text-2xl mr-1.5 text-[#BFD9EA]">$</span>
                    <span className="text-5xl tracking-tight">{enteros}</span>
                    <span className="text-xl text-[#BFD9EA]">,{decimales}</span>
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="flex h-2.5 rounded-full overflow-hidden bg-[#3B7898]" role="img"
                    aria-label={`${Math.round(pctVencido)}% del total está vencido`}>
                    <div className="bg-[#FF8A80]" style={{ width: `${pctVencido}%` }} />
                    <div className="bg-[#FFD166]" style={{ width: `${100 - pctVencido}%` }} />
                  </div>
                  <dl className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="flex items-center gap-2 text-[#BFD9EA]">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#FF8A80]" />
                        Vencidas ({resumen.nVencidas})
                      </dt>
                      <dd className="num font-bold mt-0.5">${formatARS(resumen.montoVencido)}</dd>
                    </div>
                    <div>
                      <dt className="flex items-center gap-2 text-[#BFD9EA]">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#FFD166]" />
                        Pendientes ({resumen.nPendientes})
                      </dt>
                      <dd className="num font-bold mt-0.5">${formatARS(resumen.montoPendiente)}</dd>
                    </div>
                  </dl>
                </div>

                <div className="border-t border-white/20 pt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[#BFD9EA]">Próximo vencimiento</p>
                    <p className="font-bold mt-0.5">{proximoVenc ? fmtFecha(proximoVenc) : 'Sin vencimientos'}</p>
                  </div>
                  <div>
                    <p className="text-[#BFD9EA]">Pagado en 2026</p>
                    <p className="num font-bold mt-0.5">${formatARS(totalPagado)}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-4 py-2">
                <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                  <Icon d={ICONOS.check} className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xl font-bold">Estás al día</p>
                  <p className="text-sm text-[#BFD9EA] mt-0.5">No tenés obligaciones registradas.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Error de pago */}
        {errorPago && (
          <div role="alert" className="flex items-start gap-3 bg-[#FBE9E7] border border-[#F2C4BF] text-[#8C1D18] rounded-md px-4 py-3 text-sm">
            <Icon d={ICONOS.alerta} className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="flex-1">{errorPago}</p>
            <button onClick={() => setErrorPago(null)} className="font-bold underline cursor-pointer">
              Cerrar
            </button>
          </div>
        )}

        {/* Obligaciones */}
        <section className="bg-white border border-[#D5DDE3] rounded-lg overflow-hidden">
          <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-[#D5DDE3] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Tus boletas</h2>
              <p className="text-sm text-slate-500 mt-0.5">Abrí una boleta para ver el detalle o pagala online.</p>
            </div>

            <div className="flex gap-1 -mb-4 overflow-x-auto" role="group" aria-label="Filtrar boletas por estado">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setFiltroEstado(t.id)}
                  aria-pressed={filtroEstado === t.id}
                  className={`px-3.5 py-2.5 text-sm font-bold border-b-[3px] transition cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0E4A6B] ${
                    filtroEstado === t.id
                      ? 'border-[#0E4A6B] text-[#0E4A6B]'
                      : 'border-transparent text-slate-500 hover:text-[#12202B]'
                  }`}
                >
                  {t.label}
                  <span className={`num ml-1.5 text-xs px-1.5 py-0.5 rounded ${filtroEstado === t.id ? 'bg-[#DCEAF3]' : 'bg-slate-100'}`}>
                    {t.n}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Filtros */}
          <div className="px-5 sm:px-6 py-4 border-b border-[#D5DDE3] bg-[#F6F9FB] space-y-3">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Icon d={ICONOS.buscar} />
                </span>
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por patente, partida o concepto"
                  aria-label="Buscar por patente, partida o concepto"
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-white border border-[#B9CFDC] rounded-md outline-none focus:border-[#0E4A6B] focus:ring-4 focus:ring-[#0E4A6B]/15"
                />
              </div>

              <div className="flex items-center gap-2 text-sm">
                <label htmlFor="periodo-desde" className="sr-only">Período desde</label>
                <select
                  id="periodo-desde"
                  value={periodoDesde}
                  onChange={(e) => setPeriodoDesde(e.target.value)}
                  className="flex-1 lg:flex-none py-2.5 pl-3 pr-8 bg-white border border-[#B9CFDC] rounded-md outline-none cursor-pointer focus:border-[#0E4A6B] focus:ring-4 focus:ring-[#0E4A6B]/15"
                >
                  <option value="">Desde el inicio</option>
                  {periodos.map((p) => <option key={p} value={p}>{periodoLabel(p)}</option>)}
                </select>
                <span className="text-slate-500">a</span>
                <label htmlFor="periodo-hasta" className="sr-only">Período hasta</label>
                <select
                  id="periodo-hasta"
                  value={periodoHasta}
                  onChange={(e) => setPeriodoHasta(e.target.value)}
                  className="flex-1 lg:flex-none py-2.5 pl-3 pr-8 bg-white border border-[#B9CFDC] rounded-md outline-none cursor-pointer focus:border-[#0E4A6B] focus:ring-4 focus:ring-[#0E4A6B]/15"
                >
                  <option value="">Hasta el último</option>
                  {periodos.map((p) => <option key={p} value={p}>{periodoLabel(p)}</option>)}
                </select>
              </div>
            </div>

            {bienes.length > 1 && (
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por bien">
                <span className="text-sm text-slate-500 mr-1">Bien</span>
                {[{ id: 'TODOS', nombre: 'Todos' }, ...bienes].map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setFiltroBien(b.id)}
                    aria-pressed={filtroBien === b.id}
                    className={`px-3 py-1.5 rounded-full text-sm border transition cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E4A6B] ${
                      filtroBien === b.id
                        ? 'bg-[#0E4A6B] border-[#0E4A6B] text-white'
                        : 'bg-white border-[#B9CFDC] text-slate-700 hover:bg-[#EAF2F7]'
                    }`}
                  >
                    {b.id === 'TODOS' ? 'Todos' : (
                      <>
                        <strong className="num">{b.id}</strong>
                        <span className={filtroBien === b.id ? 'text-[#BFD9EA]' : 'text-slate-500'}> {b.nombre}</span>
                      </>
                    )}
                  </button>
                ))}
              </div>
            )}

            {filtrosActivos && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <p className={rangoInvertido ? 'text-[#B3261E] font-bold' : 'text-slate-600'}>
                  {rangoInvertido
                    ? 'El período "desde" es posterior al período "hasta".'
                    : `Mostrando ${filtroEstado === 'HISTORIAL' ? pagadasBase.length : deudasFiltradas.length} resultados`}
                </p>
                <button onClick={limpiarFiltros} className="font-bold text-[#0E4A6B] underline cursor-pointer">
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>

          {filtroEstado === 'HISTORIAL' ? (
            pagadasBase.length === 0 ? (
              <div className="px-6 py-16 text-center text-sm text-slate-500">{filtrosActivos ? 'Ningún pago coincide con los filtros.' : 'Todavía no registrás pagos.'}</div>
            ) : (
              <ul>
                {pagadasBase.map((p) => (
                  <li key={p.id} className="relative border-b border-[#E4EAEE] last:border-b-0 hover:bg-[#F6F9FB] transition-colors">
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#1B6B3A]" aria-hidden="true" />
                    <div className="pl-6 pr-5 sm:pr-6 py-4 flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full bg-[#E3F3E8] text-[#1B6B3A] flex items-center justify-center shrink-0">
                        <Icon d={ICONOS.check} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold truncate">{p.concepto}</h3>
                        <p className="text-sm text-slate-600 num">
                          Período {p.periodo}. {p.fechaPago ? `Pagada el ${fmtFecha(p.fechaPago)}.` : 'Pagada.'}
                        </p>
                      </div>
                      <p className="num font-bold text-lg">${formatARS(p.montoTotal)}</p>
                      <button
                        onClick={() => setBoletaSeleccionada(p)}
                        className="px-3 py-2 rounded-md text-sm font-bold text-[#0E4A6B] border border-[#B9CFDC] hover:bg-[#EAF2F7] transition cursor-pointer flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E4A6B]"
                      >
                        <Icon d={ICONOS.doc} />
                        <span className="hidden sm:inline">Comprobante</span>
                        <span className="sm:hidden sr-only">Comprobante</span>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : deudasFiltradas.length === 0 ? (
            <div className="px-6 py-16 text-center space-y-2">
              <div className="w-12 h-12 bg-[#E3F3E8] text-[#1B6B3A] rounded-full flex items-center justify-center mx-auto">
                <Icon d={ICONOS.check} className="w-6 h-6" />
              </div>
              <p className="font-bold">{filtrosActivos ? 'Ninguna boleta coincide con los filtros' : 'No hay boletas en esta categoría'}</p>
              <p className="text-sm text-slate-500">
                {filtrosActivos ? 'Probá con otro bien, otra patente o un rango de períodos más amplio.' : 'No tenés obligaciones con el filtro seleccionado.'}
              </p>
            </div>
          ) : (
            <ul>
              {deudasFiltradas.map((boleta) => {
                const est = estadoDe(boleta.estado);
                const vencida = boleta.estado === 'VENCIDO';
                const pagada = boleta.estado === 'PAGADO';
                return (
                  <li key={boleta.id} className="relative border-b border-[#E4EAEE] last:border-b-0 hover:bg-[#F6F9FB] transition-colors">
                    <span className={`absolute left-0 top-0 bottom-0 w-1 ${est.bar}`} aria-hidden="true" />
                    <div className="pl-6 pr-5 sm:pr-6 py-5 grid lg:grid-cols-[1.5fr_1fr_auto] gap-x-6 gap-y-4 items-center">

                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <h3 className="font-bold text-base">{boleta.concepto}</h3>
                          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded ${est.chip}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${est.dot}`} />
                            {est.label}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 num">
                          {boleta.bienIdentificador && <>Ref. <strong className="text-[#12202B]">{boleta.bienIdentificador}</strong>. </>}
                          Período {boleta.periodo}.
                        </p>
                        <p className={`text-sm num ${vencida ? 'text-[#B3261E] font-bold' : pagada ? 'text-[#1B6B3A]' : 'text-slate-600'}`}>
                          {pagada
                            ? boleta.fechaPago ? `Pagada el ${fmtFecha(boleta.fechaPago)}` : 'Pagada'
                            : `${vencida ? 'Venció el' : 'Vence el'} ${fmtFecha(boleta.fechaVencimiento)}`}
                        </p>
                      </div>

                      <div className="lg:text-right">
                        <p className="text-xs text-slate-500">{pagada ? 'Importe pagado' : 'Importe'}</p>
                        <p className="num text-2xl font-bold">${formatARS(boleta.montoTotal)}</p>
                      </div>

                      <div className="flex items-center gap-2 lg:justify-end">
                        <button
                          onClick={() => setBoletaSeleccionada(boleta)}
                          className="px-4 py-2.5 rounded-md text-sm font-bold text-[#0E4A6B] border border-[#B9CFDC] hover:bg-[#EAF2F7] transition cursor-pointer flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E4A6B]"
                        >
                          <Icon d={ICONOS.doc} />
                          {pagada ? 'Comprobante' : 'Ver boleta'}
                        </button>
                        {!pagada && (
                          <button
                            onClick={() => handlePagar(boleta.id)}
                            disabled={pagandoId !== null}
                            className="px-5 py-2.5 rounded-md text-sm font-bold bg-[#0E4A6B] text-white hover:bg-[#0B3B56] disabled:opacity-60 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E4A6B]"
                          >
                            <Icon d={ICONOS.tarjeta} />
                            {pagandoId === boleta.id ? 'Procesando pago…' : 'Pagar'}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {deudasFiltradas.length > 0 && (
            <div className="px-5 sm:px-6 py-4 bg-[#F6F9FB] border-t border-[#D5DDE3] flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <p className="text-sm text-slate-500 max-w-md">
                Las boletas vencidas ya incluyen los recargos por mora actualizados.
              </p>
              <p className="text-sm text-slate-600">
                {filtroEstado === 'TODOS' ? 'Total adeudado en esta lista' : `Suma de las boletas ${filtroEstado === 'VENCIDO' ? 'vencidas' : 'pendientes'}`}
                <span className="num text-lg font-bold text-[#12202B] ml-3">${formatARS(totalFiltrado)}</span>
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Modal de Boleta */}
      {boletaSeleccionada && (
        <div
          className="fixed inset-0 bg-[#0B1A24]/60 flex justify-center items-end sm:items-center p-0 sm:p-4 z-50 no-print-bg"
          onClick={() => setBoletaSeleccionada(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-boleta"
            onClick={(e) => e.stopPropagation()}
            className="sheet-in w-full max-w-md max-h-[94vh] overflow-y-auto sm:rounded-lg rounded-t-2xl bg-[#EDF1F4] shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 py-4 no-print">
              <h2 id="titulo-boleta" className="font-bold text-lg">Boleta de pago</h2>
              <button
                onClick={() => setBoletaSeleccionada(null)}
                className="w-9 h-9 rounded-full hover:bg-slate-200 flex items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0E4A6B]"
                aria-label="Cerrar boleta"
              >
                <Icon d={ICONOS.cerrar} className="w-5 h-5" />
              </button>
            </div>

            {/* Comprobante con forma de ticket */}
            <div className="px-5 pb-2">
              <div id="boleta-imprimible" className="bg-white rounded-lg shadow-sm border border-[#D5DDE3] overflow-hidden">
                <div className="bg-[#0E4A6B] text-white px-5 py-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded bg-white/15 flex items-center justify-center font-bold text-xs">ART</div>
                  <div className="leading-tight">
                    <p className="text-xs text-[#BFD9EA]">Agencia de Recaudación</p>
                    <p className="font-bold">Comprobante de obligación tributaria</p>
                  </div>
                </div>

                <div className="p-5 space-y-5 text-sm">
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Contribuyente</p>
                      <p className="font-bold">{nombreReal || 'Contribuyente'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">{datos.contribuyente.cuit ? 'CUIT' : 'DNI'}</p>
                      <p className="font-bold num">{datos.contribuyente.cuit || datos.contribuyente.dni}</p>
                    </div>
                  </div>

                  <dl className="space-y-2.5">
                    {[
                      ['Concepto', boletaSeleccionada.concepto],
                      ['Identificador', boletaSeleccionada.bienIdentificador],
                      ['Período fiscal', boletaSeleccionada.periodo],
                      ['Vencimiento', boletaSeleccionada.fechaVencimiento],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4">
                        <dt className="text-slate-500">{k}</dt>
                        <dd className={`font-bold text-right num ${k === 'Vencimiento' && boletaSeleccionada.estado === 'VENCIDO' ? 'text-[#B3261E]' : ''}`}>{v}</dd>
                      </div>
                    ))}
                    <div className="flex justify-between gap-4 items-center">
                      <dt className="text-slate-500">Estado</dt>
                      <dd className={`text-xs font-bold px-2 py-0.5 rounded ${estadoDe(boletaSeleccionada.estado).chip}`}>
                        {estadoDe(boletaSeleccionada.estado).label}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Línea de corte con muescas */}
                <div className="relative h-0 border-t-2 border-dashed border-[#D5DDE3]">
                  <span className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-[#EDF1F4] border-r border-[#D5DDE3]" />
                  <span className="absolute -right-3 -top-3 w-6 h-6 rounded-full bg-[#EDF1F4] border-l border-[#D5DDE3]" />
                </div>

                <div className="p-5 space-y-4">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold">{boletaSeleccionada.estado === 'PAGADO' ? 'Total pagado' : 'Total a pagar'}</span>
                    <span className="num text-3xl font-bold text-[#0E4A6B]">${formatARS(boletaSeleccionada.montoTotal)}</span>
                  </div>

                  <div className="pt-1">
                    <svg viewBox="0 0 280 44" className="w-full h-11" preserveAspectRatio="none" role="img" aria-label="Código de barras de la boleta">
                      {generarBarras(boletaSeleccionada.id).map((b, i) => (
                        <rect key={i} x={b.x} y="0" width={b.w} height="44" fill="#12202B" />
                      ))}
                    </svg>
                    <p className="num text-xs text-slate-500 text-center mt-2">
                      REF-PAGO-TRIB-2026-{boletaSeleccionada.id}-SEC
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 no-print">
              <button
                onClick={() => window.print()}
                className="px-4 py-3 rounded-md text-sm font-bold text-[#0E4A6B] border border-[#B9CFDC] bg-white hover:bg-[#EAF2F7] transition cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E4A6B]"
              >
                <Icon d={ICONOS.imprimir} />
                Imprimir o guardar PDF
              </button>
              {boletaSeleccionada.estado !== 'PAGADO' && (
                <button
                  onClick={() => {
                    const id = boletaSeleccionada.id;
                    setBoletaSeleccionada(null);
                    handlePagar(id);
                  }}
                  className="px-6 py-3 rounded-md text-sm font-bold bg-[#0E4A6B] text-white hover:bg-[#0B3B56] transition cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E4A6B]"
                >
                  <Icon d={ICONOS.tarjeta} />
                  Pagar ahora
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}