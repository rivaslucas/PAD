import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/* ───────────── Utilidades ───────────── */

const soloDigitos = (v) => v.replace(/\D/g, '').slice(0, 11);

// 43650258 -> 43.650.258 | 20436502584 -> 20-43650258-4
const formatear = (d) => {
  if (d.length <= 8) return d.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${d.slice(0, 2)}-${d.slice(2, 10)}${d.length > 10 ? '-' + d.slice(10) : ''}`;
};

const Icon = ({ d, className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d={d} />
  </svg>
);
const ICONOS = {
  doc: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5zM14 3v5h5M9 13h6M9 17h6',
  tarjeta: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7zM3 10h18M7 15h3',
  reloj: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  escudo: 'M12 3l8 3v6c0 4.5-3.2 8.3-8 9-4.8-.7-8-4.5-8-9V6l8-3zM9 12l2 2 4-4',
  alerta: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  flecha: 'M5 12h14M13 6l6 6-6 6',
};

const BENEFICIOS = [
  { icono: ICONOS.doc, titulo: 'Consultá tus boletas', texto: 'Patentes e impuesto inmobiliario, con su detalle y vencimientos.' },
  { icono: ICONOS.tarjeta, titulo: 'Pagá online', texto: 'Abonás en el momento, sin filas ni trámites en ventanilla.' },
  { icono: ICONOS.reloj, titulo: 'Revisá tu historial', texto: 'Tus pagos anteriores y sus comprobantes, siempre a mano.' },
];

/* ───────────── Componente ───────────── */

export default function Login() {
  const [dni, setDni] = useState('');
  const [cargando, setCargando] = useState(false);
  const [lento, setLento] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || 'https://pad-3anq.onrender.com';

  // Si el servidor tarda (arranque en frío), avisamos para que la persona no crea que se trabó
  useEffect(() => {
    if (!cargando) {
      setLento(false);
      return;
    }
    const t = setTimeout(() => setLento(true), 4000);
    return () => clearTimeout(t);
  }, [cargando]);

  const handleIngreso = async (e) => {
    e.preventDefault();
    setError('');

    const dniLimpio = soloDigitos(dni);
    if (!dniLimpio) {
      setError('Ingresá tu DNI o CUIT para continuar.');
      return;
    }
    if (![7, 8, 11].includes(dniLimpio.length)) {
      setError('El DNI debe tener 7 u 8 números, y el CUIT 11. Revisalo e intentá de nuevo.');
      return;
    }

    setCargando(true);

    try {
      const response = await fetch(`${API_URL}/api/contribuyentes/validar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni: dniLimpio }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'No pudimos validar tu identidad con RENAPER. Revisá el número e intentá de nuevo.');
        setCargando(false);
        return;
      }

      localStorage.setItem('dniUsuario', data.contribuyente.dni);
      localStorage.setItem('datosContribuyente', JSON.stringify(data.contribuyente));
      localStorage.setItem('origenValidacion', data.origen);

      navigate('/dashboard');
    } catch (err) {
      console.error('Error conectando con el servidor:', err);
      setError('No hay conexión con el servidor. Revisá tu internet e intentá de nuevo.');
      setCargando(false);
    }
  };

  return (
    <div
      className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-[#EDF1F4] text-[#12202B] antialiased selection:bg-[#0E4A6B] selection:text-white"
      style={{ fontFamily: "'Atkinson Hyperlegible', system-ui, -apple-system, 'Segoe UI', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap');
        @keyframes entrada { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        .entrada { animation: entrada .45s ease-out both; }
        @media (prefers-reduced-motion: reduce) { .entrada { animation: none; } }
      `}</style>

      {/* Panel institucional */}
      <aside className="relative bg-[#0E4A6B] text-white flex flex-col">
        {/* Franja celeste y blanca */}
        <div className="flex flex-col" aria-hidden="true">
          <div className="h-1.5 bg-[#74ACDF]" />
          <div className="h-1.5 bg-white" />
          <div className="h-1.5 bg-[#74ACDF]" />
        </div>

        <div className="flex-1 flex flex-col justify-between px-6 sm:px-10 lg:px-14 py-8 lg:py-12 gap-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white text-[#0E4A6B] rounded-md flex items-center justify-center font-bold text-sm tracking-tight">
              ART
            </div>
            <div className="leading-tight">
              <p className="text-sm text-[#BFD9EA]">Provincia de Tucumán</p>
              <p className="font-bold text-lg">Agencia de Recaudación</p>
            </div>
          </div>

          <div className="entrada space-y-8 max-w-lg">
            <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold leading-[1.1] tracking-tight">
              Tus impuestos, claros y al día desde cualquier lugar.
            </h1>

            <ul className="hidden sm:block space-y-5">
              {BENEFICIOS.map((b) => (
                <li key={b.titulo} className="flex gap-4">
                  <span className="w-10 h-10 rounded-md bg-white/10 flex items-center justify-center shrink-0">
                    <Icon d={b.icono} />
                  </span>
                  <div>
                    <p className="font-bold">{b.titulo}</p>
                    <p className="text-sm text-[#BFD9EA] mt-0.5 max-w-sm">{b.texto}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="hidden lg:flex items-center gap-2 text-sm text-[#BFD9EA]">
            <Icon d={ICONOS.escudo} className="w-4 h-4" />
            Verificamos tu identidad con el Registro Nacional de las Personas.
          </p>
        </div>
      </aside>

      {/* Formulario */}
      <main className="flex items-center justify-center px-5 sm:px-10 py-10 lg:py-16">
        <div className="entrada w-full max-w-sm" style={{ animationDelay: '.1s' }}>
          <h2 className="text-2xl font-bold">Ingresá al portal</h2>
          <p className="text-slate-600 mt-1.5">Con tu DNI o CUIT vemos tus boletas y pagos.</p>

          <form onSubmit={handleIngreso} className="mt-8 space-y-5" noValidate>
            <div>
              <label htmlFor="dni" className="block text-sm font-bold">
                DNI o CUIT
              </label>
              <input
                id="dni"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                value={formatear(dni)}
                disabled={cargando}
                onChange={(e) => {
                  setDni(soloDigitos(e.target.value));
                  if (error) setError('');
                }}
                placeholder="Ej: 35.123.456"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'error-login' : 'ayuda-login'}
                className={`mt-2 w-full px-4 py-3.5 text-lg num bg-white border rounded-md outline-none transition
                  placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-500
                  focus:border-[#0E4A6B] focus:ring-4 focus:ring-[#0E4A6B]/15
                  ${error ? 'border-[#B3261E]' : 'border-[#B9CFDC]'}`}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              />
              {!error && (
                <p id="ayuda-login" className="text-sm text-slate-500 mt-2">
                  Escribí solo los números, sin puntos ni guiones.
                </p>
              )}
            </div>

            {error && (
              <div
                id="error-login"
                role="alert"
                className="flex items-start gap-3 text-sm text-[#8C1D18] bg-[#FBE9E7] border border-[#F2C4BF] rounded-md px-4 py-3"
              >
                <Icon d={ICONOS.alerta} className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-[#0E4A6B] text-white font-bold text-base py-3.5 px-5 rounded-md hover:bg-[#0B3B56] transition cursor-pointer
                disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2.5
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E4A6B]"
            >
              {cargando ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Validando tu identidad…
                </>
              ) : (
                <>
                  Ingresar
                  <Icon d={ICONOS.flecha} className="w-4 h-4" />
                </>
              )}
            </button>

            {lento && (
              <p role="status" className="text-sm text-slate-600 bg-white border border-[#D5DDE3] rounded-md px-4 py-3">
                El servidor está iniciando y puede tardar hasta un minuto. No cierres esta página.
              </p>
            )}
          </form>

          <p className="mt-10 text-sm text-slate-500">
            Sistema de Recaudación Tributaria © 2026
          </p>
        </div>
      </main>
    </div>
  );
}