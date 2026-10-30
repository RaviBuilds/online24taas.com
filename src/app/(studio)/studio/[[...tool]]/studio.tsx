'use client';

import { NextStudio } from 'next-sanity/studio';
import config from '../../../../../sanity.config';

// Client Component: `sanity.config` (and the `sanity` package it imports) call
// React `createContext` at module scope, which is unavailable in the RSC layer.
// Keeping the config import + NextStudio render inside this 'use client' file
// ensures they only execute in the browser bundle.
export default function Studio() {
  return <NextStudio config={config} />;
}