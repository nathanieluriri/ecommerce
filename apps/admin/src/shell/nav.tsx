import type { ReactNode } from 'react';
import { BarChart3, House, Mail, Megaphone, Package, Settings, ShoppingBag, Store, TicketPercent, Users } from 'lucide-react';

export interface NavEntry {
  to: string;
  label: string;
  icon: ReactNode;
  children?: { to: string; label: string }[];
}

export const NAV: NavEntry[] = [
  { to: '/home', label: 'Home', icon: <House /> },
  { to: '/orders', label: 'Orders', icon: <ShoppingBag /> },
  {
    to: '/products',
    label: 'Products',
    icon: <Package />,
    children: [
      { to: '/products/categories', label: 'Categories' },
      { to: '/products/inventory', label: 'Inventory' },
      { to: '/products/reviews', label: 'Reviews' },
    ],
  },
  { to: '/customers', label: 'Customers', icon: <Users /> },
  { to: '/discounts', label: 'Discounts', icon: <TicketPercent /> },
  { to: '/marketing', label: 'Marketing', icon: <Megaphone /> },
  { to: '/emails', label: 'Emails', icon: <Mail />, children: [{ to: '/emails/templates', label: 'Templates' }] },
  { to: '/online-store', label: 'Online store', icon: <Store /> },
  { to: '/analytics', label: 'Analytics', icon: <BarChart3 /> },
];

export const NAV_FOOT: NavEntry[] = [
  {
    to: '/settings',
    label: 'Settings',
    icon: <Settings />,
    children: [
      { to: '/settings/store', label: 'Store details' },
      { to: '/settings/shipping', label: 'Shipping' },
      { to: '/settings/notifications', label: 'Notifications' },
      { to: '/settings/stores', label: 'Stores' },
      { to: '/settings/team', label: 'Team' },
      { to: '/settings/account', label: 'Your account' },
    ],
  },
];
