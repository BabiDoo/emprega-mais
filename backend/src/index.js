import app from './app.js';
import { env } from './config/env.js';

if (process.env.NODE_ENV !== 'production') {
  app.listen(env.port, () => {
    console.log(`API running on port ${env.port}`);
  });
}

export default app;
