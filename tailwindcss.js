const theme = require('tailwindcss/defaultTheme');

function createIncrement(initialValue = 1) {
  let value = initialValue;

  return function increment() {
    value += 1;
    return value;
  };
}

const zIndex = createIncrement(0);

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
