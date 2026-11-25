/* Entry point of the domain. The collections start empty: the app fills them from MongoDB
 * (snapshot.ts, fromDocs) and the seed script builds them with buildWorld() (world.ts). */
export { buildWorld } from './world';
export * from './snapshot';
export * from './dates';
export * from './seed';
export * from './people';
export * from './catalogs';
export * from './outcomes';
export * from './rules';
export * from './campaigns';
export * from './data';
export * from './engine';
export * from './metrics';
export * from './periods';
