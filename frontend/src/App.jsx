import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [dni, setDni] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Usa tu variable de entorno de Vite si existe, o apunta directo a tu backend en Render
  const API_URL = import.meta.env.VITE_API_URL || 'https://pad-3anq.onrender.com';

  const handleIngreso = async (e) => {
    e.preventDefault();
    setError('');

    const dniLimpio = dni.trim();
    if (!dniLimpio) {
      setError('Por favor, ingrese un DNI válido.');
      return;
    }

    setCargando(true);

    try {
      const response = await fetch(`${API_URL}/api/contribuyentes/validar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dni: dniLimpio }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'No se pudo validar la identidad con RENAPER.');
        setCargando(false);
        return;
      }

      // Guardamos el DNI y los datos validados por OpenRENAPER (o fallback)
      localStorage.setItem('dniUsuario', data.contribuyente.dni);
      localStorage.setItem('datosContribuyente', JSON.stringify(data.contribuyente));
      localStorage.setItem('origenValidacion', data.origen);

      navigate('/dashboard');
    } catch (err) {
      console.error('Error conectando con el servidor:', err);
      setError('Error de conexión con el servidor. Intente nuevamente.');
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center border border-gray-200">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-blue-700">Agencia de Recaudación</h1>
          <p className="text-gray-500 mt-2">Portal del Contribuyente</p>
        </div>

        <form onSubmit={handleIngreso} className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-medium text-gray-700">DNI o CUIT</label>
            <input
              type="text"
              value={dni}
              disabled={cargando}
              onChange={(e) => setDni(e.target.value)}
              placeholder="Ej: 35123456"
              className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100"
            />
          </div>

          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200 mt-4 cursor-pointer disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {cargando ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Validando identidad en RENAPER...
              </>
            ) : (
              'Ingresar al Portal'
            )}
          </button>
        </form>

        <div className="mt-6 text-sm text-gray-400">
          Sistema de Recaudación Tributaria © 2026
        </div>
      </div>
    </div>
  );
}