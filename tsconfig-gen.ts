import type { TsConfigJson } from 'type-fest';

interface TsConfig extends TsConfigJson {
  compilerOptions: TsConfigJson['compilerOptions'] & {
    noUncheckedIndexedAccess?: boolean;
  };
}

const defaultConfig: TsConfig = {
  compilerOptions: {
    allowJs: true,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    forceConsistentCasingInFileNames: true,
    isolatedModules: true, // required by next, but also good practice
    lib: ['esnext'],
    module: 'esnext',
    moduleResolution: 'node',
    noImplicitAny: true,
    noImplicitThis: true,
    noUncheckedIndexedAccess: true,
    noUnusedLocals: false, // reported by eslint
    noUnusedParameters: false, // reported by eslint
    resolveJsonModule: true,
    skipLibCheck: true,
    strict: true,
    target: 'es5',
    typeRoots: ['node_modules/@types'],
    types: ['types.d.ts'],
  },
  include: ['src'],
  exclude: ['node_modules'],
};

export function createTSConfig(options: {
  hasReact: boolean;
  hasNext: boolean;
}): TsConfig {
  // deep clone, destroy all references
  const config = JSON.parse(JSON.stringify(defaultConfig));

  if (options.hasReact || options.hasNext) {
    // emitting will probably be handled by some bundler
    config.compilerOptions.noEmit = true;

    config.compilerOptions.lib.unshift('dom');
    config.compilerOptions.jsx = options.hasNext ? 'preserve' : 'react';

    // set aliasing, because we will also include babel plugin
    // that will allow '@/' imports
    config.compilerOptions.baseUrl = '.';
    config.compilerOptions.paths = {
      '@/*': ['./src/*'],
    };

    if (options.hasNext) {
      config.include.push('pages');
    }
  }

  return config;
}
