import swaggerJsDoc from 'swagger-jsdoc';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Sistema de Recaudación Tributaria (Rentas)',
      version: '1.0.0',
      description: 'Documentación interactiva de los servicios de Rentas.',
    },
    servers: [{ url: 'http://localhost:3000' }],
  },
  // Usamos process.cwd() para asegurar la ruta absoluta
  apis: [`${process.cwd()}/src/routes/*.js`], 
};

export const swaggerDocs = swaggerJsDoc(swaggerOptions);