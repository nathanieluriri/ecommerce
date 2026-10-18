import { createContext, useContext } from 'react';
import type { Me, Store } from './api';

export interface AppCtx {
  me: Me;
  stores: Store[];
  store: Store | null;
  selectStore: (id: string) => void;
  reloadStores: () => Promise<void>;
  signOut: () => void;
}

export const Ctx = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside provider');
  return v;
}

export function useStore(): Store {
  const { store } = useApp();
  if (!store) throw new Error('No store selected');
  return store;
}
