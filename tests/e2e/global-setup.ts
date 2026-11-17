import { reseed } from './db';
export default async function globalSetup() { await reseed(); }
