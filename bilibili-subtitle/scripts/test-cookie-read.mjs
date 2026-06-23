import initSqlJs from 'sql.js';
import { readFileSync } from 'fs';
import { join } from 'path';

const dbPath = join(process.env.LOCALAPPDATA, 'Microsoft/Edge/User Data/Default/Network/Cookies');

try {
  // Try to read the file directly
  console.log('Reading database file...');
  const fileBuffer = readFileSync(dbPath);
  console.log('File size:', fileBuffer.length, 'bytes');
  
  // Initialize sql.js
  const SQL = await initSqlJs();
  
  // Create database from buffer
  const db = new SQL.Database(fileBuffer);
  
  // Query for SESSDATA cookies
  const rows = db.exec(
    "SELECT name, value, encrypted_value, host_key FROM cookies WHERE host_key LIKE '%bilibili%' AND name = 'SESSDATA'"
  );
  
  console.log('Query result:', JSON.stringify(rows, null, 2));
  
  db.close();
} catch (e) {
  console.error('Error:', e.message);
}
