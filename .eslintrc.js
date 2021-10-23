module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: [
    'airbnb-base',
    'airbnb-typescript/base',
  ],
  parserOptions: {
    project: './tsconfig.json',
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'import/order': ['off'], // See https://youtrack.jetbrains.com/issue/WEB-21182
    'import/extensions': ['error', 'always', {
      js: 'never',
      mjs: 'never',
      jsx: 'never',
      ts: 'never',
      tsx: 'never',
      vue: 'never',
    }],
    'import/no-extraneous-dependencies': ['error', {
      devDependencies: true,
    }],
    'class-methods-use-this': ['off'],
    'object-curly-newline': ['off'],
    'no-plusplus': ['off'],
  },
};
