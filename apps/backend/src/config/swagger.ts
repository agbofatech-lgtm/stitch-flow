import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'StitchFlow API',
      version: '1.0.0'
    },
    servers: [
      {
        url: process.env.RENDER_EXTERNAL_URL || `http://localhost:${env.PORT}`
      }
    ]
  },
  apis: ['./src/routes/*.ts']
});
