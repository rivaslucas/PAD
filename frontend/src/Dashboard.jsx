import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();

  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

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

        // Si el contribuyente fue validado por OpenRENAPER pero no tiene bienes/deudas en nuestra BD
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
          throw new Error('No se encontraron datos del contribuyente');
        }

        const resultado = await respuesta.json();
        setDatos(resultado);
      } catch (err) {
        setError(err.message);
      } finally {
        setCargando(false);
      }
    };

    obtenerDeudas();
  }, [dniUsuario, navigate]);

  const handleCerrarSesion = () => {
    localStorage.removeItem('dniUsuario');
    localStorage.removeItem('datosContribuyente');
    localStorage.removeItem('origenValidacion');
    navigate('/');
  };

  const handlePagar = async (id_obligacion) => {
    try {
      const response = await fetch(`${API_URL}/api/pagos/generar-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id_obligacion }),
      });

      if (!response.ok) {
        alert('Error al intentar generar el link de pago con Padi.');
        return;
      }

      const data = await response.json();

      if (data.link_pago) {
        window.location.href = data.link_pago;
      } else {
        alert('La pasarela de pagos no devolvió un enlace válido.');
      }
    } catch (error) {
      console.error('Error al procesar el pago:', error);
      alert('Error de conexión con el servidor.');
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center font-bold text-gray-500">
        Cargando estado de cuenta...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center gap-4">
        <div className="font-bold text-red-600 text-xl">{error}</div>
        <button
          onClick={handleCerrarSesion}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition cursor-pointer"
        >
          Volver al Login
        </button>
      </div>
    );
  }

  const totalAPagar = datos?.deudas.reduce((acc, boleta) => acc + boleta.montoTotal, 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Cabecera del Dashboard */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-800">Mi Estado de Cuenta</h1>
              {origenValidacion === 'OPENRENAPER' && (
                <span className="text-xs font-semibold bg-green-100 text-green-800 px-2.5 py-0.5 rounded-full border border-green-200">
                  ✓ Identidad verificada por OpenRENAPER
                </span>
              )}
            </div>
            <p className="text-gray-500 text-sm mt-1">
              Contribuyente: <span className="font-medium text-gray-700">{datos.contribuyente.nombre} {datos.contribuyente.apellido}</span> (DNI: {datos.contribuyente.dni}
              {datos.contribuyente.cuit ? ` • CUIT: ${datos.contribuyente.cuit}` : ''})
            </p>
          </div>
          <button
            onClick={handleCerrarSesion}
            className="text-blue-600 font-medium hover:underline text-sm cursor-pointer self-start md:self-auto"
          >
            Cerrar Sesión
          </button>
        </div>

        {/* Tabla de Obligaciones */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-700">Boletas Pendientes de Pago</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                  <th className="p-4 border-b">Concepto</th>
                  <th className="p-4 border-b">Periodo</th>
                  <th className="p-4 border-b">Vencimiento</th>
                  <th className="p-4 border-b">Monto</th>
                  <th className="p-4 border-b text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {datos.deudas.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-green-600 font-medium">
                      ¡Felicidades! No registras deudas pendientes.
                    </td>
                  </tr>
                ) : (
                  datos.deudas.map((boleta) => (
                    <tr key={boleta.id} className="hover:bg-gray-50 transition-colors border-b last:border-none">
                      <td className="p-4 font-medium">
                        {boleta.concepto} <br />
                        <span className="text-xs text-gray-400">Ref: {boleta.bienIdentificador}</span>
                      </td>
                      <td className="p-4">{boleta.periodo}</td>
                      <td className="p-4">
                        <span className={boleta.estado === 'VENCIDO' ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                          {boleta.fechaVencimiento}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-gray-900">${boleta.montoTotal.toLocaleString()}</td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handlePagar(boleta.id)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition cursor-pointer shadow-sm"
                        >
                          Pagar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Resumen total */}
          <div className="p-6 bg-gray-50 flex justify-end items-center gap-4 border-t border-gray-200">
            <span className="text-gray-600 font-medium">Total a pagar:</span>
            <span className="text-2xl font-bold text-gray-900">${totalAPagar.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}