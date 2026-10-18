import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { api, getToken, setToken, type Me, type Store } from './api';
import { Ctx } from './context';
import { Shell } from './shell/Shell';
import { Loading, ToastHost } from './ui';
import { SignIn } from './routes/SignIn';
import { Home } from './routes/Home';
import { Analytics } from './routes/Analytics';
import { Orders } from './routes/Orders';
import { OrderDetail } from './routes/OrderDetail';
import { PackingSlip } from './routes/PackingSlip';
import { Products } from './routes/Products';
import { ProductDetail } from './routes/ProductDetail';
import { Categories } from './routes/Categories';
import { Inventory } from './routes/Inventory';
import { Reviews } from './routes/Reviews';
import { Customers } from './routes/Customers';
import { CustomerDetail } from './routes/CustomerDetail';
import { Discounts } from './routes/Discounts';
import { Marketing } from './routes/Marketing';
import { Emails } from './routes/Emails';
import { EmailCopy } from './routes/EmailCopy';
import { Design } from './routes/Design';
import { Settings } from './routes/settings';
import { Account, Notifications, Payments, Shipping, StoreDetails, Stores, Team } from './routes/settings/pages';

const STORE_KEY = 'shop.admin.store';

function readStoreId(): string | null {
  try {
    return localStorage.getItem(STORE_KEY);
  } catch {
    return null;
  }
}

export function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [checked, setChecked] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState<string | null>(readStoreId);

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
  if (!me)
    return (
      <SignIn
        onSignedIn={(token) => {
          setToken(token);
          setChecked(false);
          void boot();
        }}
      />
    );

  const store = stores.find((s) => s._id === storeId) ?? stores[0] ?? null;
  const ctx = {
    me,
    stores,
    store,
    reloadStores,
    selectStore: (id: string) => {
      try {
        localStorage.setItem(STORE_KEY, id);
      } catch {
        void 0;
      }
      setStoreId(id);
    },
    signOut: () => {
      setToken(null);
      setMe(null);
    },
  };

  const s = (el: ReactNode) => (store ? el : <Navigate to="/settings/stores" replace />);

  return (
    <Ctx.Provider value={ctx}>
      <ToastHost>
        <BrowserRouter>
          <Routes>
            <Route path="/orders/:id/print" element={s(<PackingSlip />)} />
            <Route element={<Shell />}>
              <Route path="/home" element={s(<Home />)} />
              <Route path="/analytics" element={s(<Analytics />)} />
              <Route path="/orders" element={s(<Orders />)} />
              <Route path="/orders/:id" element={s(<OrderDetail />)} />
              <Route path="/products" element={s(<Products />)} />
              <Route path="/products/categories" element={s(<Categories />)} />
              <Route path="/products/inventory" element={s(<Inventory />)} />
              <Route path="/products/reviews" element={s(<Reviews />)} />
              <Route path="/products/:id" element={s(<ProductDetail />)} />
              <Route path="/customers" element={s(<Customers />)} />
              <Route path="/customers/:id" element={s(<CustomerDetail />)} />
              <Route path="/discounts" element={s(<Discounts />)} />
              <Route path="/marketing" element={s(<Marketing />)} />
              <Route path="/emails" element={<Emails />} />
              <Route path="/emails/templates" element={s(<EmailCopy />)} />
              <Route path="/online-store" element={s(<Design />)} />
              <Route path="/settings" element={s(<Settings />)} />
              <Route path="/settings/store" element={s(<StoreDetails />)} />
              <Route path="/settings/payments" element={s(<Payments />)} />
              <Route path="/settings/shipping" element={s(<Shipping />)} />
              <Route path="/settings/notifications" element={s(<Notifications />)} />
              <Route path="/settings/stores" element={<Stores />} />
              <Route path="/settings/team" element={<Team />} />
              <Route path="/settings/account" element={<Account />} />
              <Route path="/categories" element={<Navigate to="/products/categories" replace />} />
              <Route path="/reviews" element={<Navigate to="/products/reviews" replace />} />
              <Route path="/design" element={<Navigate to="/online-store" replace />} />
              <Route path="*" element={<Navigate to={store ? '/home' : '/settings/stores'} replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastHost>
    </Ctx.Provider>
  );
}
