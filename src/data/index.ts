import type { IDataRepository } from './repository';
import { DexieRepository } from './dexie-repository';

export const dataRepository: IDataRepository = new DexieRepository();
