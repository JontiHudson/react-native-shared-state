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
    'class-methods-use-this': 1,
    'guard-for-in': 0,
    'import/no-unresolved': 1,
    'no-continue': 0,
    'no-empty': 1,
    'no-labels': 0,
    'no-plusplus': 0,
    'no-restricted-globals': 1,
    'no-restricted-syntax': 0,
    'no-undef': 1,
    'no-underscore-dangle': 0,
    'no-unused-expressions': 0,
    'valid-typeof': 0,
  },
};
