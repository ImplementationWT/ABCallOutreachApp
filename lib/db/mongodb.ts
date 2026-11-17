import 'server-only';
/* MongoDB connection (Atlas cluster "calloutreach"), only on the server.
 * MONGODB_URI and MONGODB_DB come from .env.local (see .env.example). One client per process:
 * in development it is kept on globalThis so hot reloads do not open a new pool each time. */
import { MongoClient, type Db } from 'mongodb';

const g = globalThis as typeof globalThis & { _mongoClient?: Promise<MongoClient> };

function client(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set (add it to .env.local)');
  if (!g._mongoClient) g._mongoClient = new MongoClient(uri, { appName: 'calloutreach-app' }).connect();
  return g._mongoClient;
}

export async function getDb(): Promise<Db> {
  return (await client()).db(process.env.MONGODB_DB || 'calloutreach');
}

/** Round trip to the cluster; used by /api/health/db. */
export async function pingDb() {
  const db = await getDb();
  const started = Date.now();
  await db.command({ ping: 1 });
  return { db: db.databaseName, ms: Date.now() - started };
}
