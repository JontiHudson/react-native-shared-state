module.exports = {
  env: {
    browser: true,
    es6: true,
  },
  extends: ['airbnb'],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  plugins: ['react'],
  rules: {
    'arrow-parens': 'off',
    'class-methods-use-this': 'off',
    'function-paren-newline': 'off',
    'guard-for-in': 'off',
    'implicit-arrow-linebreak': 'off',
    'import/no-unresolved': 'off',
    'no-continue': 'off',
    'no-empty': 'warn',
    'no-labels': 'off',
    'no-plusplus': 'off',
    'no-restricted-globals': 'off',
    'no-restricted-syntax': 'off',
    'no-underscore-dangle': 'off',
    'no-unused-expressions': 'off',
    'object-curly-newline': 'off',
    'valid-typeof': 'off',
  },
};
