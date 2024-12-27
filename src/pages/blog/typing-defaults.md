## Typing `defaults` function in TypeScript

{{toc}}

`defaults` function as found in [lodash/defaults](https://lodash.com/docs/#defaults) allows to copy properties from one object to another,
as long as another object doesn't already contain these properties:

```js
import { defaults } from 'lodash';

const defaultOptions = {
  verbose: false,
  output: './file.txt',
};

const givenOptions = {
  verbose: true,
};

const options = defaults(givenOptions, defaultOptions); // note: `givenOptions` is mutated!

console.log(options); // { verbose: true, output: './file.txt' }
```

It's used usually to implement default options for a function with complex API.

There is also a "deep" version: [lodash/defaultsDeep](https://lodash.com/docs/#defaultsDeep) that does the same, but recursively assigns nested properties:

```js
import { defaultsDeep } from 'lodash';

const defaultOptions = {
  verbose: false,
  output: {
    directory: './output',
    fileName: 'file.txt',
  }
};

const givenOptions = {
  output: {
    fileName: 'myfile.txt',
  }
};

const options = defaultsDeep(givenOptions, defaultOptions); // note: `givenOptions` is mutated!

console.log(options); // { verbose: false, output: { directory: './output', fileName: 'myfile.txt' } }

// using just `defaults` would overwrite (or actually ignore) entire `output` object instead of "merging" it
```

All good, but now what is typing of that function provided by `@types/lodash`?

```ts
// using previous example

const options = defaultsDeep(givenOptions, defaultOptions); // any
```

Any. But why? The type is computable: in short it is a sum of `defaultOptions` and `givenOptions`.

Checking actual type gives us an answer:

```ts
defaultsDeep(object: any, ...sources: any[]): any;
```

Authors of `types/lodash` didn't even try to type it. Now I don't know the exact reason, but I guess that it is because lodash API is very flexible:
it can merge arrays, objects, merge multiple of those and so on.

However in most cases we do not need all of that. We need to merge options like in an example given above. So let's try to type that function!
As an addition we'll create our custom implementation.

{{h3|typing-defaults|Typing `defaults`}}

We start by limiting the API to accept only two records:

```ts
export type DefaultsResult<T extends Record<string, unknown>, S extends Record<string, unknown>> = any;

export const defaults = <T extends Record<string, unknown>, S extends Record<string, unknown>>(target: T, source: S): DefaultsResult<T, S> => {
  return {
    ...source,
    ...omitBy(target, isUndefined),
  } as DefaultsResult<T, S>;
};
```

`T` and `S` have to be records (indexed with string, so arrays are not accepted - yes, they are technically records indexed with number),
so we can safely spread them, and have to figure out the output `DefaultsResult`.

First of all, result of `defaults` will certainly contain all properties from source `S` (`givenOptions`):

```ts
export type DefaultsResult<T extends Record<string, unknown>, S extends Record<string, unknown>> =
  { [SK in keyof S]: S[SK] }
```

Now we know that it will also contain properties from target `T` (`defaultOptions`) that are not defined in source `S`:

```ts
export type DefaultsResult<T extends Record<string, unknown>, S extends Record<string, unknown>> =
  { [SK in keyof S]: S[SK] }
  & { [TK in keyof T as TK extends keyof S ? never : TK]: T[TK] }; // all keys of T not existing in S
```

Here we utilised [key remapping](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html#key-remapping-via-as) feature,
that is very useful for many things, but the most useful out of them is removing keys from object under certain condition (by remapping the key to a `never` type).

At this point this type almost works, but has one key flaw: if property of source `S` by itself might be undefined, then the result type will copy over that `undefined` type:

```ts
type Target = { fileName: string };
type Source = { fileName?: string };

const result = defaults({ fileName: 'output.txt' } as Target, {} as Source);
// result type is: { fileName: string | undefined }
```

Which is not correct, because the `fileName` property will be taken from target (`defaultOptions`). To fix that we need to check how the same property is defined in target.
We can solve it by adding:

```ts
type PickDefined<T, S> = T extends undefined ? S : T;
type _ = { SK extends keyof T ? PickDefined<T[SK], S[SK]> : S[SK] }
```

Here we simply say: *if property SK in defined in target T, try to use type of target T unless it might be undefined as well. If target T doesn't contain source key SK then use type of source property*

So the final implementation and type looks as follows:

```ts
export type DefaultsResult<T extends Record<string, unknown>, S extends Record<string, unknown>> =
  { [SK in keyof S]: SK extends keyof T ? PickDefined<T[SK], S[SK]> : S[SK] }
  & { [TK in keyof T as TK extends keyof S ? never : TK]: T[TK] }; // all keys of T not existing in S

export const defaults = <T extends Record<string, unknown>, S extends Record<string, unknown>>(target: T, source: S): DefaultsResult<T, S> => {
  return {
    ...source,
    ...omitBy(target, isUndefined),
  } as DefaultsResult<T, S>;
};
```

{{h3|typing-defaults-deep|Typing `defaultsDeep`}}

`defaultsDeep` follows exactly the same logic, but recusively. Let's start with implementation:

```ts
export const defaultsDeep = <T extends Record<string, unknown>, S extends Record<string, unknown>>(target: T, source: S): DefaultsDeepResult<T, S> => {
  const copy = {} as Record<string, unknown>;

  for (const [targetKey, targetValue] of Object.entries(target)) {
    const sourceValue = source[targetKey];

    if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
      copy[targetKey] = defaultsDeep(targetValue, sourceValue);
      continue;
    }

    copy[targetKey] = targetValue;
  }

  return {
    ...source,
    ...omitBy(copy, isUndefined),
  } as DefaultsDeepResult<T, S>;
};
```

Nothing very fancy here except calling `defaultsDeep` recursively if both target and source value are *plain objects* (they match `Record<string, unknown>` type).

When it comes to the typing, we can actually start by reusing `defaults` typing:

```ts
export type DefaultsDeepResult<T extends Record<string, unknown>, S extends Record<string, unknown>> =
  { [SK in keyof S]: SK extends keyof T ? PickDefined<T[SK], S[SK]> : S[SK] }
  & { [TK in keyof T as TK extends keyof S ? never : TK]: T[TK] }; // all keys of T not existing in S
```

We have to figure out how we should pick properties from source `S`. When it comes to that type of a function it usually can follow implementation (and vice versa).
So let's create a new type, that we will call recursively and will perform the same checks that our implementation is using:

```ts
type DefaultsDeepResultRecursive<T, S> = T extends Record<string, unknown>
  ? S extends Record<string, unknown>
    ? ...
    : ...
  : ...;

export type DefaultsDeepResult<T extends Record<string, unknown>, S extends Record<string, unknown>> =
  { [SK in keyof S]: SK extends keyof T ? DefaultsDeepResultRecursive<T[SK], S[SK]> : S[SK] } // <-- here we reference type responsible for recursion
  & { [TK in keyof T as TK extends keyof S ? never : TK]: T[TK] }; // all keys of T not existing in S
```

We perform check on target `T` and source `S` just like we do inside the implementation (`isPlainObject(targetValue) && isPlainObject(sourceValue)`).
Doing the checks has additional benefit: TypeScript types cannot be recursive unless they do some sort of `extends` that at some point falls to non-recursive branch.

If both target `T` and source `S` are records we call primary `DefaultsDeepResult` type (just like the implementation repeats the function call):

```ts
type DefaultsDeepResultRecursive<T, S> = T extends Record<string, unknown>
  ? S extends Record<string, unknown>
    ? DefaultsDeepResult<T, S>
    : ...
  : ...;
```

The last thing is to decide what should happen if target `T` or source `S` is not a record (but is a string, boolean or whatever). In that case we can simply pick whatever is defined,
just like we did in `defaults` typing:

```ts
type DefaultsDeepResultRecursive<T, S> = T extends Record<string, unknown>
  ? S extends Record<string, unknown>
    ? DefaultsDeepResult<T, S>
    : PickDefined<T, S>
  : PickDefined<T, S>;
```

So the final implementation is:

```ts
type PickDefined<T, S> = T extends undefined ? S : T;

type DefaultsDeepResultRecursive<T, S> = T extends Record<string, unknown>
  ? S extends Record<string, unknown>
    ? DefaultsDeepResult<T, S>
    : PickDefined<T, S>
  : PickDefined<T, S>;

export type DefaultsDeepResult<T extends Record<string, unknown>, S extends Record<string, unknown>> =
  { [SK in keyof S]: SK extends keyof T ? DefaultsDeepResultRecursive<T[SK], S[SK]> : S[SK] }
  & { [TK in keyof T as TK extends keyof S ? never : TK]: T[TK] }; // all keys of T not existing in S

export const defaultsDeep = <T extends Record<string, unknown>, S extends Record<string, unknown>>(target: T, source: S): DefaultsDeepResult<T, S> => {
  const copy = {} as Record<string, unknown>;

  for (const [targetKey, targetValue] of Object.entries(target)) {
    const sourceValue = source[targetKey];

    if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
      copy[targetKey] = defaultsDeep(targetValue, sourceValue);
      continue;
    }

    copy[targetKey] = targetValue;
  }

  return {
    ...source,
    ...omitBy(copy, isUndefined),
  } as DefaultsDeepResult<T, S>;
```

{{h3|conclusion|Conclusion}}

Typing (and implementing) those functions was a nice excercise.
We have a chance to play with recurise types, key remapping, and recursion itself to end up with very useful function, and reduce our dependency on external libraries.