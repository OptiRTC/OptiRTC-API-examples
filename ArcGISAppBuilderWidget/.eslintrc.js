module.exports = {
  root: true,
  overrides: [
    {
      files: [ 'buildUtils/*.js' ],
      parserOptions: {
          ecmaVersion: 2020
      },
      env: {
        es6: true,
        node: true
      },
      extends: [
        'eslint:recommended'
      ]
    },
    {
      files: [ 'OptiSites/*.js' ],
      parserOptions: {
        ecmaVersion: 5
      },
      env: {
        es6: true,
        amd: true,
        browser: true
      },
      extends: [
        'eslint:recommended'
      ]
    },
    {
      files: [ '*.ts' ],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: './tsconfig.json',
        sourceType: 'module'
      },
      plugins: [ '@typescript-eslint' ],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
      ],
      rules: {
        '@typescript-eslint/array-type': ['error', { 'default': 'array' }],
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/ban-types': 'off',
        '@typescript-eslint/dot-notation': 'error',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/indent': [ 'off', 4, {} ],
        '@typescript-eslint/member-ordering': 'error',
        '@typescript-eslint/no-empty-interface': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-floating-promises': 'off',
        '@typescript-eslint/no-inferrable-types': 'off',
        '@typescript-eslint/no-parameter-properties': 'off',
        '@typescript-eslint/no-shadow': [ 'error', { 'hoist': 'all' } ],
        '@typescript-eslint/no-unsafe-assignment': 'off', //
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/no-unused-expressions': 'error',
        '@typescript-eslint/no-unused-vars': ['error', { 'vars': 'all', 'args': 'after-used', 'ignoreRestSiblings': false }],
        '@typescript-eslint/no-use-before-define': 'off',
        '@typescript-eslint/prefer-for-of': 'off',
        '@typescript-eslint/prefer-function-type': 'off',
        '@typescript-eslint/quotes': [ 'error', 'single', { 'allowTemplateLiterals': true, 'avoidEscape': true } ],
        '@typescript-eslint/restrict-plus-operands': 'off',
        '@typescript-eslint/restrict-template-expressions': 'off',
        '@typescript-eslint/triple-slash-reference': [ 'error', { 'path': 'always', 'types': 'prefer-import', 'lib': 'always' } ],
        '@typescript-eslint/unified-signatures': 'error',
        'arrow-parens': [ 'off', 'always' ],
        'camelcase': 'off', //using @typescript-eslint/naming-convention instead
        'comma-dangle': 'error',
        'complexity': 'off',
        'constructor-super': 'error',
        'eqeqeq': [ 'error', 'smart' ],
        'guard-for-in': 'error',
        'id-blacklist': 'error',
        'id-match': 'error',
        'import/order': 'off',
        'max-classes-per-file': 'off',
        'max-len': [ 'error', { 'code': 120 } ],
        'new-parens': 'error',
        'no-bitwise': 'error',
        'no-caller': 'error',
        'no-cond-assign': 'error',
        'no-console': 'off',
        'no-constant-condition': 'error',
        'no-control-regex': 'error',
        'no-debugger': 'off',
        'no-empty': 'error',
        'no-eval': 'error',
        'no-fallthrough': 'off',
        'no-invalid-regexp': 'error',
        'no-invalid-this': 'off',
        'no-irregular-whitespace': 'error',
        'no-new-wrappers': 'error',
        'no-shadow': 'off', //using @typescript-eslint/no-shadow
        'no-sparse-arrays': 'error',
        'no-throw-literal': 'error',
        'no-trailing-spaces': 'error',
        'no-undef-init': 'error',
        'no-underscore-dangle': 'off',
        'no-unsafe-finally': 'error',
        'no-unused-labels': 'error',
        'no-var': 'off',
        'object-shorthand': 'off',
        'one-var': [ 'error', 'never' ],
        'prefer-arrow/prefer-arrow-functions': 'off',
        'prefer-const': 'off',
        'quote-props': 'off',
        'radix': 'error',
        'use-isnan': 'error',
        'valid-typeof': 'off'
      }
    }
  ]
};
