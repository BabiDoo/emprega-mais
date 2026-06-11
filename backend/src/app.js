import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';

const app = express();

const corsOrigin = env.frontendUrl === '*'
  ? true
  : env.frontendUrl.split(',').map((origin) => origin.trim()).filter(Boolean);

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '1mb' }));

app.get('/', (req, res) => {
  res.json({
    name: 'hackathon-backend',
    status: 'ok',
    docs: '/api/health',
  });
});

app.use('/api', routes);
app.use('/', routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
