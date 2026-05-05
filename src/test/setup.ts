// Vitest test setup — runs once before each test file.
//
// 1. Loads jest-dom matchers (toBeInTheDocument, toHaveClass, etc.) into
//    Vitest's expect, so component tests can assert on DOM state ergonomically.
// 2. Stubs browser APIs that JSDom doesn't implement (matchMedia, ResizeObserver,
//    scrollIntoView) so components that touch them in render don't crash.

import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

// JSDom doesn't implement matchMedia. shadcn/ui + responsive components call
// it during mount; without this stub they throw "matchMedia is not a function".
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// Stub ResizeObserver — Radix popover/tooltip touch it during portal mount.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// Stub scrollIntoView — Radix Select calls it on the highlighted item.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function () {};
}
