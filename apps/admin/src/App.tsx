import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { api, getToken, setToken, type Me, type Store } from './api';
import { Ctx } from './context';
import { Shell } from './Shell';
import { Loading } from './ui';
import { SignIn } from './routes/SignIn';
import { Home } from './routes/Home';
import { Orders } from './routes/Orders';
import { OrderDetail } from './routes/OrderDetail';
import { Products } from './routes/Products';
import { ProductDetail } from './routes/ProductDetail';
import { Customers } from './routes/Customers';
import { Emails } from './routes/Emails';
import { Design } from './routes/Design';
import { Stores } from './routes/Stores';
import { Settings } from './routes/Settings';

const STORE_KEY = 'shop.admin.store';

export function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [checked, setChecked] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState<string | null>(() => localStorage.getItem(STORE_KEY));

  const reloadStores = useCallback(async () => setStores(await api<Store[]>('/stores')), []);

  const boot = useCallback(async () => {
    if (!getToken()) return setChecked(true);
    try {
      const [m, s] = await Promise.all([api<Me>('/auth/me'), api<Store[]>('/stores')]);
      setMe(m);
      setStores(s);
    } finally {
      setChecked(true);
    }
  }, []);

  useEffect(() => {
    void boot();
  }, [boot]);

  if (!checked) return <Loading what="admin" />;
  if (!me) return <SignIn onSignedIn={(token) => { setToken(token); setChecked(false); void boot(); }} />;

  const store = stores.find((s) => s._id === storeId) ?? stores[0] ?? null;
  const ctx = {
    me,
    stores,
    store,
    reloadStores,
    selectStore: (id: string) => {
      localStorage.setItem(STORE_KEY, id);
      setStoreId(id);
    },
    signOut: () => {
      setToken(null);
      setMe(null);
    },
  };

  const needStore = (el: React.ReactNode) => (store ? el : <Navigate to="/stores" replace />);

  return (
    <Ctx.Provider value={ctx}>
      <BrowserRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route path="/home" element={needStore(<Home />)} />
            <Route path="/orders" element={needStore(<Orders />)} />
            <Route path="/orders/:id" element={needStore(<OrderDetail />)} />
            <Route path="/products" element={needStore(<Products />)} />
            <Route path="/products/:id" element={needStore(<ProductDetail />)} />
            <Route path="/customers" element={needStore(<Customers />)} />
            <Route path="/emails" element={<Emails />} />
            <Route path="/design" element={needStore(<Design />)} />
            <Route path="/stores" element={<Stores />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to={store ? '/home' : '/stores'} replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </Ctx.Provider>
  );
}
