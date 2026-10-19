import type { Store } from '@shop/core';
import type { Theme } from './types';
import { classic } from './classic';
import { minimal } from './minimal';
import { bold } from './bold';
import { maison } from './maison';

// To add a design: create a theme file, register it here and add its id to THEMES in @shop/core schemas.
export const themes: Record<Store['theme'], Theme> = { classic, minimal, bold, maison };

export function getTheme(id: string | undefined): Theme {
  return themes[id as Store['theme']] ?? classic;
}
