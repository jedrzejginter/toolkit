declare const config: {
  readonly [Pattern: string]: string | (() => string);
};

export = config;
