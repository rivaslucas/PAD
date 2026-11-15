// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { dni } = req.body;

  if (!dni) {
    return res.status(400).json({ error: 'El DNI es obligatorio' });
  }

  try {
    // 1. Llamamos a OpenRENAPER desde el servidor (evitamos bloqueo CORS)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s max para no colgar la demo

    const renaperResponse = await fetch('https://api-openrenaper.matiasagustinibanez.com/api/v1/consultas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'dni', numero: String(dni).trim() }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (renaperResponse.ok) {
      const persona = await renaperResponse.json();
      // Devolvemos los datos reales validados por OpenRENAPER
      return res.json({
        autenticado: true,
        origen: 'OPENRENAPER',
        usuario: {
          dni: persona.dni,
          nombre: persona.nombre,
          cuit: persona.cuit,
          provincia: persona.provincia_ubicacion
        }
      });
    }

    // Si OpenRENAPER responde 404 (no encontrado en padrón real), revisamos si es nuestro usuario de prueba en BD
    console.warn(`OpenRENAPER devolvió status ${renaperResponse.status}. Activando fallback local...`);
  } catch (error) {
    console.error('Error o timeout conectando con OpenRENAPER:', error.message);
  }

  // 2. FALLBACK DE EMERGENCIA: Buscar en tu propia base de datos Clever Cloud
  try {
    // Ajusta esto según uses Prisma o mysql2 en tu proyecto
    const contribuyenteLocal = await prisma.contribuyente.findUnique({
      where: { dni: String(dni).trim() }
    });

    if (contribuyenteLocal) {
      return res.json({
        autenticado: true,
        origen: 'BASE_LOCAL_FALLBACK',
        usuario: {
          dni: contribuyenteLocal.dni,
          nombre: `${contribuyenteLocal.nombre} ${contribuyenteLocal.apellido || ''}`.trim(),
          cuit: contribuyenteLocal.cuit || null,
          provincia: 'TUCUMAN'
        }
      });
    }

    return res.status(404).json({ error: 'Contribuyente no encontrado en RENAPER ni en el padrón local.' });
  } catch (dbError) {
    return res.status(500).json({ error: 'Error interno al validar identidad.' });
  }
});