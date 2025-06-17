const { FlatCompat } = require('@eslint/eslintrc');
const compat = new FlatCompat();

module.exports = [
  ...compat.extends('expo', 'prettier'),
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: {
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': 'warn'
    }
  },
  {
    ignores: [
      'node_modules/',
      'dist/',
      '.expo/',
      '**/*.d.ts',
      'supabase/functions/**/*',
      'test-connection.js'
    ]
  }
];
