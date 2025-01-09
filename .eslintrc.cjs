module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint'
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  rules: {
    'semi': [2, 'always'],
    'quotes': ['error', 'single', { 'allowTemplateLiterals': true } ],
    'import/no-anonymous-default-export': 'off',
    'no-constant-condition': 'off',
    'no-inner-declarations': 'off',
    '@typescript-eslint/no-unused-vars': 'on',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-expressions': 'off'
  },
}