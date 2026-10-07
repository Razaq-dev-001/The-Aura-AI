import * as dotenv from 'dotenv';
import * as path from 'node:path';
import { createApp } from './app.js';
import { getDatabase } from '@aura/database';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || 'localhost';

// Initialize SQLite database
getDatabase();

const app = createApp();

app.listen(PORT, HOST, () => {
  console.log(`⚡ AURA Backend Server running at http://${HOST}:${PORT}`);
  console.log(`   Health status: http://${HOST}:${PORT}/api/health`);
});
