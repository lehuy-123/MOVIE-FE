'use client';

import React from 'react';
import { Html } from '@react-three/drei';

/**
 * SafeHtml: re-exports @react-three/drei's Html with node_modules patched
 * to prevent React 19's removeChild and synchronous root unmount errors.
 */
export const SafeHtml = Html;
export type SafeHtmlProps = React.ComponentProps<typeof Html>;
