import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import serviciosRoutes from './routes/servicios.routes.js';

// Importaciones para Swagger
import swaggerUi from 'swagger-ui-express';
import { swaggerDocs } from './config/swagger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ==========================================
// DOCUMENTACIÓN SWAGGER
// ==========================================
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.get('/', (req, res) => {
  res.send('Servidor del Sistema de Recaudación funcionando 🚀. Visita /api-docs para ver la documentación.');
});

// ==========================================
// RUTAS DE LA API
// ==========================================
app.use('/api/servicios', serviciosRoutes);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Documentación disponible en http://localhost:${PORT}/api-docs`);
});