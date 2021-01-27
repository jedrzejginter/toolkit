# toolkit

## eslint

basic version

```console
yarn add --dev --exact eslint prettier \
  eslint-{config,plugin}-prettier \
  eslint-config-airbnb-base \
  eslint-plugin-import \
  eslint-import-resolver-alias
```

adding react

```console
yarn add --dev --exact eslint-plugin-{react,react-hooks,jsx-a11y} \
  eslint-config-airbnb

yarn remove eslint-config-airbnb-base
```

adding typescript

```console
yarn add --dev --exact eslint-config-airbnb-typescript \
  @typescript-eslint/{eslint-plugin,parser}

# we have it in eslint-config-airbnb-typescript
yarn remove eslint-config-airbnb
```

adding testing

```console
yarn add --dev --exact eslint-plugin-{jest,testing-library}
```
