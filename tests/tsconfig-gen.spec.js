import { createTSConfig } from '../tsconfig-gen';

let defaultConfig;
let reactConfig;
let nextConfig;

beforeAll(() => {
  defaultConfig = createTSConfig({ hasReact: false, hasNext: false });
  reactConfig = createTSConfig({ hasReact: true, hasNext: false });
  nextConfig = createTSConfig({ hasReact: true, hasNext: true });
});

describe('all configs', () => {
  it(`allows importing js files`, () => {
    expect(defaultConfig.compilerOptions.allowJs).toBe(true);
    expect(reactConfig.compilerOptions.allowJs).toBe(true);
    expect(nextConfig.compilerOptions.allowJs).toBe(true);
  });

  it(`allows synthetic default imports`, () => {
    expect(defaultConfig.compilerOptions.allowSyntheticDefaultImports).toBe(
      true,
    );
    expect(defaultConfig.compilerOptions.esModuleInterop).toBe(true);

    expect(reactConfig.compilerOptions.allowSyntheticDefaultImports).toBe(true);
    expect(reactConfig.compilerOptions.esModuleInterop).toBe(true);

    expect(nextConfig.compilerOptions.allowSyntheticDefaultImports).toBe(true);
    expect(nextConfig.compilerOptions.esModuleInterop).toBe(true);
  });

  it(`forces consisten file names casing`, () => {
    expect(defaultConfig.compilerOptions.forceConsistentCasingInFileNames).toBe(
      true,
    );
    expect(reactConfig.compilerOptions.forceConsistentCasingInFileNames).toBe(
      true,
    );
    expect(nextConfig.compilerOptions.forceConsistentCasingInFileNames).toBe(
      true,
    );
  });

  it(`uses 'node' module resolutions`, () => {
    expect(defaultConfig.compilerOptions.moduleResolution).toBe('node');
    expect(reactConfig.compilerOptions.moduleResolution).toBe('node');
    expect(nextConfig.compilerOptions.moduleResolution).toBe('node');
  });

  it(`allows importing JSON modules`, () => {
    expect(defaultConfig.compilerOptions.resolveJsonModule).toBe(true);
    expect(reactConfig.compilerOptions.resolveJsonModule).toBe(true);
    expect(nextConfig.compilerOptions.resolveJsonModule).toBe(true);
  });

  it(`enables full strict mode`, () => {
    expect(defaultConfig.compilerOptions.strict).toBe(true);
    expect(reactConfig.compilerOptions.strict).toBe(true);
    expect(nextConfig.compilerOptions.strict).toBe(true);
  });

  it(`targets es5 (to support IE11)`, () => {
    expect(defaultConfig.compilerOptions.target).toBe('es5');
    expect(reactConfig.compilerOptions.target).toBe('es5');
    expect(nextConfig.compilerOptions.target).toBe('es5');
  });

  // We don't want that, because eslint can report those.
  // Enablish those flags could result in broken builds in dev
  // environment, although unused things are not necessarily a bug.
  it(`does *not* check for unused variables`, () => {
    expect(defaultConfig.compilerOptions.noUnusedLocals).toBe(false);
    expect(defaultConfig.compilerOptions.noUnusedParameters).toBe(false);

    expect(reactConfig.compilerOptions.noUnusedLocals).toBe(false);
    expect(reactConfig.compilerOptions.noUnusedParameters).toBe(false);

    expect(nextConfig.compilerOptions.noUnusedLocals).toBe(false);
    expect(nextConfig.compilerOptions.noUnusedParameters).toBe(false);
  });
});

describe('react config', () => {
  it(`has 'jsx' set to 'react'`, () => {
    expect(reactConfig.compilerOptions.jsx).toBe('react');
  });

  it(`includes 'dom' lib`, () => {
    expect(reactConfig.compilerOptions.lib).toContainEqual('dom');
  });

  it(`supports imports aliases`, () => {
    expect(reactConfig.compilerOptions.baseUrl).toBe('.');
    expect(reactConfig.compilerOptions.paths).toMatchInlineSnapshot(`
      Object {
        "@/*": Array [
          "./src/*",
        ],
      }
    `);
  });
});

describe('next.js config', () => {
  it(`has 'jsx' set to 'preserve'`, () => {
    expect(nextConfig.compilerOptions.jsx).toBe('preserve');
  });

  it(`includes 'dom' lib`, () => {
    expect(nextConfig.compilerOptions.lib).toContainEqual('dom');
  });

  // Required by next.js
  it(`is using isolated modules`, () => {
    expect(nextConfig.compilerOptions.isolatedModules).toBe(true);
  });

  it(`supports imports aliases`, () => {
    expect(nextConfig.compilerOptions.baseUrl).toBe('.');
    expect(nextConfig.compilerOptions.paths).toMatchInlineSnapshot(`
      Object {
        "@/*": Array [
          "./src/*",
        ],
      }
    `);
  });
});
