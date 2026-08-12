declare const antiSlopPlugin: {
  readonly meta: { readonly name: "anti-slop" };
  readonly rules: {
    readonly "no-chained-type-assertions": object;
    readonly "no-conditional-empty-object-spread": object;
    readonly "no-known-value-widening": object;
    readonly "no-module-mocking": object;
    readonly "no-object-parameters": object;
    readonly "no-reflect-apply": object;
    readonly "no-reflect-get": object;
    readonly "no-runtime-typeof": object;
    readonly "no-shape-in-symbol-names": object;
    readonly "no-unknown-parameters": object;
    readonly "no-unknown-returns": object;
    readonly "no-unknown-type-aliases": object;
    readonly "no-unsafe-dictionary-type": object;
    readonly "no-widen-then-assert": object;
    readonly "require-safety-comment-for-type-assertion": object;
  };
};

export default antiSlopPlugin;
