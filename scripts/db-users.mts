/* npm run db:users
 * Creates the team's users that are missing (andrew: manager; maya, daniel, priya: reps), each with a
 * temporary password printed once here; they choose their own at the first sign-in. Also updates
 * users, sessions and the admin to the current shape. Reads MONGODB_URI and MONGODB_DB from .env.local. */
import { MongoClient } from 'mongodb';
import { ensureAuth, ensureTeamUsers } from '@/lib/db/auth-core';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'calloutreach';
if (!uri) { console.error('MONGODB_URI is not set (add it to .env.local)'); process.exit(1); }
const client = new MongoClient(uri, { appName: 'calloutreach-users' });
try {
  await client.connect();
  const db = client.db(dbName);
  await ensureAuth(db);
  const created = await ensureTeamUsers(db);
  if (!created.length) console.log(`"${dbName}": every team user already exists. Reset passwords from Outreach Manager > Users.`);
  else {
    console.log(`Users created in "${dbName}" (temporary passwords, shown only now):`);
    for (const u of created) console.log(`  ${u.username.padEnd(8)} ${u.role.padEnd(8)} ${u.password}   ${u.name}`);
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await client.close();
}
