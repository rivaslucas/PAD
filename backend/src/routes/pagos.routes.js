import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Portal Tributario - TFI Rentas Tucumán',
      version: '1.0.0',
      description: 'Documentación oficial de la API backend para el sistema de recaudación fiscal (OpenRENAPER y Pasarela Padi).',
    },
    servers: [
      {
        url: 'https://pad-3anq.onrender.com',
        description: 'Servidor de Producción (Render)',
      },
      {
        url: 'http://localhost:3000',
        description: 'Servidor de Desarrollo Local',
      },
    ],
    paths: {
      '/api/contribuyentes/{dni}/deudas': {
        get: {
          summary: 'Obtener deudas y obligaciones de un contribuyente',
          parameters: [
            {
              in: 'path',
              name: 'dni',
              required: true,
              schema: { type: 'string' },
              description: 'DNI del contribuyente a consultar',
            },
          ],
          responses: {
            200: {
              description: 'Datos del contribuyente y lista de deudas/tasas.',
            },
            404: {
              description: 'Contribuyente no encontrado.',
            },
          },
        },
      },
      '/api/pagos/generar-link': {
        post: {
          summary: 'Generar link de pago con la pasarela Padi',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id_obligacion: { type: 'integer', example: 1 },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'URL de pago generada con éxito.',
            },
          },
        },
      },
      '/api/pagos/webhook': {
        post: {
          summary: 'Webhook B2B para recepción de pagos aprobados (Padi)',
          description: 'Recibe la notificación oficial de Padi, valida la firma HMAC-SHA256 y actualiza la base de datos.',
          responses: {
            200: {
              description: 'Webhook procesado e impactado correctamente.',
            },
            401: {
              description: 'Firma HMAC inválida.',
            },
          },
        },
      },
    },
  },
  apis: [], // Si documentas con JSDoc en rutas puedes agregarlo aquí
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log('📄 Swagger UI disponible en /api-docs');
};