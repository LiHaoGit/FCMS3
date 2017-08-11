module.exports = {
    "env": {
        "es6": true,
        "node": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "sourceType": "module",
        "ecmaVersion": 8
    },
    "rules": {
        //
        // 取消
        //
        "no-console": 0, // 允许控制台
        "guard-for-in": 0,
        "no-implicit-coercion": 0,
        "no-useless-concat": 0,
        //
        // 待定
        //
        // no-inner-declarations: "error", // 不允许嵌套声明函数
        // "array-element-newline": ["error", { "multiline": true }]
        //
        // 语法
        //
        "no-shadow": ["error", {
            "builtinGlobals": true,
            "hoist": "functions", "allow": []
        }],
        "no-template-curly-in-string": "error",
        "array-callback-return": "warn", // 需要返回值的数组回调方法没有 return 语句
        "class-methods-use-this": "error",
        "eqeqeq": "error",
        "no-eq-null": "error",
        "no-extend-native": "error",
        "no-global-assign": "error",
        "no-implicit-globals": "error",
        "no-invalid-this": "error",
        "no-loop-func": "error",
        "no-multi-str": "error",
        "no-new-wrappers": "error",
        "no-return-await": "error",
        "no-throw-literal": "error",
        "no-unused-expressions": "error",
        "no-useless-return": "error",
        //
        // node.js
        //
        "handle-callback-err": "error",
        "no-buffer-constructor": "error",
        "no-mixed-requires": "error",
        //
        // 样式
        //
        "indent": ["error", 4, { SwitchCase: 0 }],
        "max-len": ["error", { "code": 80, "comments": 200,
            "ignoreUrls": true, "ignoreRegExpLiterals": true,
            "ignoreStrings": true, "ignoreUrls": true }],
        "no-multi-spaces": "error",
        "dot-location": ["error", "property"],
        "dot-notation": ["warn", { "allowKeywords": true }],
        "array-bracket-newline": ["error", "never"],
        "array-bracket-spacing": ["error", "never"],
        "block-spacing": "error",
        "brace-style": ["error", "1tbs", { "allowSingleLine": true }],
        // "camelcase": "error",
        "comma-spacing": ["error", { "before": false, "after": true }],
        "comma-style": ["error", "last"],
        "computed-property-spacing": ["error", "never"],
        "eol-last": ["error", "always"],
        "func-call-spacing": ["error", "never"],
        // "func-names": ["error", "as-needed"],
        "key-spacing": ["error", { "beforeColon": false }],
        "keyword-spacing": ["error", {}],
        "lines-around-comment": ["error", {}],
        // 临时取消 "max-depth": ["error", 5],
        "max-nested-callbacks": ["error", 5],
        // 临时取消 "max-statements": ["error", 20],
        // 临时取消 "multiline-ternary": ["error", "always-multiline"],
        "no-mixed-spaces-and-tabs": "error",
        "no-multiple-empty-lines": ["error", { "max": 2, "maxEOF": 1 }],
        "no-nested-ternary": 0,
        "no-trailing-spaces": "error",
        "no-whitespace-before-property": "error",
        "object-curly-newline": ["error", { "multiline": true }],
        "object-curly-spacing": ["error", "never"],
        "operator-linebreak": ["error", "after"],
        "padded-blocks": ["error", "never"],
        "quotes": ["error", "double", { "avoidEscape": true }],
        "semi": ["error", "never"],
        "space-before-blocks": "error",
        "space-before-function-paren": ["error", "never"],
        "space-in-parens": ["error", "never"],
        "space-infix-ops": "error",
        "space-unary-ops": "error",
        "spaced-comment": ["error", "always"],
        "switch-colon-spacing": "error",
        "arrow-body-style": ["error", "as-needed"],
        "arrow-parens": ["error", "as-needed"],
        "arrow-spacing": "error",
        "generator-star-spacing": ["error", { "before": true, "after": false }],
        "no-duplicate-imports": ["error", { "includeExports": false }],
        "no-var": "error",
        "rest-spread-spacing": ["error", "never"],
        "template-curly-spacing": "error",
        "yield-star-spacing": ["error", "before"],
    }
}
