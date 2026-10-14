import * as tailwindcss from 'prettier-plugin-tailwindcss';

/** @type {import('prettier').Config} */
export default {
  endOfLine: 'lf',
  plugins: [tailwindcss],
  printWidth: 100,
  singleQuote: true,
};
