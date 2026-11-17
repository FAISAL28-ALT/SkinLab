import app from './app.js';
import { env } from './config/env.js';

app.listen(env.PORT, () => {
  console.log(`\n🚀 SkinLab API running on http://localhost:${env.PORT}`);
  console.log(`   Environment: ${env.NODE_ENV}`);
  console.log(`   Health check: http://localhost:${env.PORT}/health\n`);
});
