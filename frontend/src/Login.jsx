import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [dni, setDni] = useState(''); // Estado para guardar lo que el usuario tipea
  const navigate = useNavigate();

  const handleIngreso = (e) => {
    e.preventDefault(); 
    
    // Evitamos que envíen el formulario vacío
    if (dni.trim() === '') {
      alert("Por favor, ingrese un DNI válido");
      return;
    }

    // Guardamos el DNI en la "memoria" del navegador (simulando una sesión)
    localStorage.setItem('dniUsuario', dni);
    
    // Viajamos al dashboard
    navigate('/dashboard'); 
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
              onChange={(e) => setDni(e.target.value)} // Atrapamos cada tecla que presiona
              placeholder="Ej: 35123456" 
              className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200 mt-4 cursor-pointer"
          >
            Ingresar al Portal
          </button>
        </form>

        <div className="mt-6 text-sm text-gray-400">
          Sistema de Recaudación Tributaria © 2026
        </div>
      </div>
    </div>
  );
}