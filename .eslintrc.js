const on = 1;
const off = 0;
module.exports = {
  parser: "@typescript-eslint/parser", // Specifies the ESLint parser
  extends: [
    "eslint:recommended",
  ],
  plugins: ["@typescript-eslint", "sonarjs"],
  parserOptions: {
    ecmaVersion: "latest", // Allows for the parsing of modern ECMAScript features
    sourceType: "module", // Allows for the use of imports
    project: "./tsconfig.json",
  },
  ignorePatterns: [
    "node_modules/",
    ".eslintrc.js",
  ],
  env: {
    node: true,
    es6: true,
    jest: true,
    es2022: true,
  },
  extends: ["plugin:sonarjs/recommended"],
  rules: {
    // ts rules
    "@typescript-eslint/adjacent-overload-signatures": on,
    "@typescript-eslint/await-thenable": on,
    "@typescript-eslint/class-name-casing": off,
    "@typescript-eslint/member-delimiter-style": [on, {
      "multiline": {
        "delimiter": "semi",
        "requireLast": true,
      },
      "singleline": {
        "requireLast": false,
      },
    }],
    "@typescript-eslint/no-array-constructor": on,
    "@typescript-eslint/no-confusing-non-null-assertion": on,
    "@typescript-eslint/no-confusing-void-expression": [on, { ignoreArrowShorthand: true} ],
    "@typescript-eslint/no-duplicate-enum-values": on,
    "@typescript-eslint/no-extra-non-null-assertion": on,
    "@typescript-eslint/no-floating-promises": [on, {ignoreVoid: true}],
    "@typescript-eslint/no-for-in-array": on,
    "@typescript-eslint/no-meaningless-void-operator": on,
    "@typescript-eslint/no-misused-new": on,
    "@typescript-eslint/no-misused-promises": on,
    "@typescript-eslint/no-non-null-asserted-nullish-coalescing": on,
    "@typescript-eslint/no-non-null-asserted-optional-chain": on,
    "@typescript-eslint/no-unnecessary-condition": on,
    "@typescript-eslint/no-unsafe-argument": off,
    "@typescript-eslint/no-unsafe-assignment": off,
    "@typescript-eslint/no-unsafe-call": on,
    "@typescript-eslint/no-unsafe-member-access": off,
    "@typescript-eslint/no-unsafe-return": on,
    "@typescript-eslint/no-unused-expressions": off,
    "@typescript-eslint/non-nullable-type-assertion-style": on,
    "@typescript-eslint/prefer-for-of": off,
    "@typescript-eslint/prefer-includes": on,
    "@typescript-eslint/prefer-nullish-coalescing": on,
    "@typescript-eslint/prefer-optional-chain": on,
    "@typescript-eslint/prefer-readonly": on,
    "@typescript-eslint/prefer-string-starts-ends-with": off,
    "@typescript-eslint/require-array-sort-compare": on,
    "@typescript-eslint/restrict-plus-operands": off,
    // "@typescript-eslint/restrict-template-expressions": [on, {
    // 	"allowNumber": true,
    // 	"allowBoolean": true,
    // 	"allowNullable": true,
    // }],
    "@typescript-eslint/semi": [on, "always", {
      "omitLastInOneLineBlock": true,
    }],
    "@typescript-eslint/space-before-function-paren": [on, {
      "asyncArrow": "always",
      "anonymous": "never",
      "named": "never",
    }],
    "@typescript-eslint/type-annotation-spacing": on,
    "@typescript-eslint/unbound-method": off,
    "@typescript-eslint/unified-signatures": on,

    // eslint rules
    "array-callback-return": on,
    "arrow-spacing": on,
    "brace-style": off,
    "@typescript-eslint/brace-style": off,
    "class-methods-use-this": off,
    "comma-dangle": off,
    "@typescript-eslint/comma-dangle": [on, {
      "arrays": "always-multiline",
      "objects": "always-multiline",
      "imports": "always-multiline",
      "exports": "always-multiline",
      "functions": "always-multiline",
      "enums": "always-multiline",
      "generics": "always-multiline",
      "tuples": "always-multiline",
    }],
    "comma-spacing": off,
    "complexity": on,
    "constructor-super": on,
    "@typescript-eslint/comma-spacing": [on, {
      "before": false,
      "after": true,
    }],
    "complexity": on,
    "consistent-return": off,
    "default-param-last": off,
    "default-param-last": off,
    "@typescript-eslint/default-param-last": on,
    "eqeqeq": on,
    "getter-return": on,
    "indent": off,
    "@typescript-eslint/indent": [on, 2],
    "init-declarations": off,
    "@typescript-eslint/init-declarations": off,
    "lines-between-class-members": off,
    "@typescript-eslint/lines-between-class-members": off,
    "func-call-spacing": off,
    "@typescript-eslint/func-call-spacing": on,
    "keyword-spacing": off,
    "@typescript-eslint/keyword-spacing": on,
    "lines-between-class-members": off,
    "@typescript-eslint/lines-between-class-members": off,
    "linebreak-style": off,
    "max-len": [off, {
      "code": 200,
      "tabWidth": 2,
      "ignoreComments": true,
      "ignorePattern": "^import.*",
    }],
    "max-params": [off, {
      "max": 6,
    }],
    "newline-per-chained-call": off,
    "no-array-constructor": off,
    "@typescript-eslint/no-array-constructor": on,
    "no-async-promise-executor": on,
    "no-const-assign": on,
    "no-constant-binary-expression": on,
    "no-constant-condition": off,
    "no-constructor-return": on,
    "no-debugger": off,
    "no-dupe-args": on,
    "no-dupe-class-members": on,
    "@typescript-eslint/no-dupe-class-members": on,
    "no-dupe-else-if": on,
    "no-dupe-keys": on,
    "no-duplicate-case": on,
    "no-duplicate-imports": on,
    "no-ex-assign": on,
    "no-extra-parens": off,
    "@typescript-eslint/no-extra-parens": off,
    "no-func-assign": on,
    "no-import-assign": on,
    "no-inner-declarations": off,
    "no-invalid-this": off,
    "@typescript-eslint/no-invalid-this": on,
    "no-irregular-whitespace": on,
    "no-label-var": on,
    "no-loop-func": off,
    "@typescript-eslint/no-loop-func": on,
    "no-prototype-builtins": on,
    "no-nested-ternary": off,
    "no-new-object": on,
    "no-redeclare": off,
    "@typescript-eslint/no-redeclare": on,
    "no-return-await": on,
    "no-return-assign": off,
    "no-self-assign": on,
    "no-self-compare": on,
    "no-sequences": on,
    "no-setter-return": on,
    "no-sparse-arrays": on,
    "no-tabs": on,
    "no-template-curly-in-string": on,
    "no-this-before-super": on,
    "no-shadow": off,
    "@typescript-eslint/no-shadow": on,
    "no-throw-literal": off,
    "@typescript-eslint/no-throw-literal": on,
    "no-use-before-define": [off, {
      "functions": false,
      "classes": false,
    }],
    "no-use-before-define": off,
    "@typescript-eslint/no-use-before-define": [on, {
      "functions": false,
      "classes": false,
      enums: false,
      typedefs: false,
    }],
    "no-undefined": off,
    "no-unreachable": off,
    "no-unused-vars": off,
    "no-unneeded-ternary": [on, {
      "defaultAssignment": false,
    }],
    "no-unused-expressions": off,
    "@typescript-eslint/no-unused-expressions": off,
    "no-undef": on,
    "no-unmodified-loop-condition": on,
    "no-unsafe-optional-chaining": on,
    "no-var": on,
    "no-whitespace-before-property": on,
    "one-var": [on, 'never'],
    "padding-line-between-statements": off,
    "@typescript-eslint/padding-line-between-statements": off,
    "prefer-arrow-callback": on,
    "prefer-const": on,
    "prefer-numeric-literals": on,
    "prefer-regex-literals": on,
    "quotes": off,
    "@typescript-eslint/quotes": off,
    "radix": on,
    "require-atomic-updates": off,
    "semi": off, // overridden by typescript rule
    "space-before-function-paren": off, // overridden by typescript rule
    "space-before-blocks": [on, 'always'],
    "space-in-parens": [on, 'never'],
    "space-infix-ops": off,
    "@typescript-eslint/space-infix-ops": off,
    "space-unary-ops": [
      on, {
        "words": true,
        "nonwords": false,
      },
    ],
    "use-isnan": on,
    "valid-typeof": on,

    //sonarjs rules
    "sonarjs/no-small-switch": off,
    "outputState": off,
    "sonarjs/cognitive-complexity": off,
    "sonarjs/prefer-immediate-return": off,
    "sonarjs/no-collapsible-if": off,
  }
};