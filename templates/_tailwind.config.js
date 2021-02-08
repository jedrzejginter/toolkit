const theme = require('tailwindcss/defaultTheme');

const { zIndex } = require('../utils');

module.exports = {
  future: {
    purgeLayersByDefault: true,
    removeDeprecatedGapUtilities: true,
  },
  purge: ['src/**/*.ts', 'src/**/*.tsx', 'pages/**/*.ts', 'pages/**/*.tsx'],
  theme: {
    colors: {
      black: '#000',
      transparent: 'transparent',
      white: '#fff',
    },
    fontFamily: {
      sans: [...theme.fontFamily.sans],
    },
    zIndex: {
      zero: zIndex(),
      base: zIndex(),
    },
    extend: {
      inset: {
        full: '100%',
        '-full': '-9999px',
      },
    },
  },
  variants: {},
  plugins: [],
};
