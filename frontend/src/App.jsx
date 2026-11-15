import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './Login';
import Dashboard from './Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Cuando la ruta es "/" muestra el Login */}
        <Route path="/" element={<Login />} />

        {/* Cuando la ruta es "/dashboard" muestra el Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;