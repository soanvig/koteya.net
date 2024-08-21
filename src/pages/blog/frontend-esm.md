## Frontend development with TypeScript and libraries, but no bundler

[Vite](https://vitejs.dev/), [Webpack](https://webpack.js.org/), [Parcel](https://parceljs.org/), [esbuild](https://esbuild.github.io/), [Rollup](https://rollupjs.org/), and many more.
How many tools one has to know to build a frontend application? What if those tools are not necessary? What if a simple frontend application could be created without those tools? Let's see how.

<h3 id="esm"><a href="#esm">#</a>ESM (ECMAScript modules)</h3>

The first step to do is to use ES modules. 
In our `index.html` file we create following content:

```html
<script type="module" src="./main.mjs"></script>
```

As you can see we are referencing `main.mjs` file. The `mjs` extension is a standard to identify ESM file. Also, the script tag has to have `type="module"`.

Then, we create `main.mjs` file, and `hello-world.mjs` file (that we will import using ESM syntax in `main.mjs` file).

```js
// main.mjs
import { helloWorld } from './hello-world.mjs'; // the extension here is required

helloWorld();
```

```js
// hello-world.mjs
export const helloWorld = () => alert('Hello world!');
```

At this point, the last thing to do is to *serve* our `index.html` file. Serving is necessary, because simply opening `index.html` in the browser directly from the filesystem won't allow us to dynamically import our JavaScript. There are multiple ways to serve static site, however my chosen one for this article is [serve](https://www.npmjs.com/package/serve) library:

```
pnpm add serve
pnpm serve . // the directory where index.html can be found
```

Upon entering `http://localhost:3000` (default `serve` port) the alert is executed as expected:

{{h3|typescript|TypeScript}}

Now, the TypeScript. To have TypeScript working in the browser, we first have to have it working with ESM at all.

For that, we are going to modify `tsconfig.json`:

```js
// tsconfig.json
{
  "compilerOptions": {
    ...,
    "module": "ESNext", // Set support for ESM
    "outDir": "./public", // Set output directory, from which we are going to serve our JS files 
    ...
  }
}
```

Then, the `package.json`:

```js
// package.json
{
  ...,
  "type": "module",
  ...
}
```

And finally we have to convert our files' extension from `mjs` to `mts`.

At this point, after running `tsc` compiler, we should get our `public` directory populated with `mjs` files ready to be imported in the browser as described in the previous section.

{{h3|libraries|Libraries}}

If one is using a bundler, all the libraries installed via package manager, and imported into source code, will be automatically *bundled* into JavaScript code. Without a bundler it has to be done *manually*.

Upon installing a library we have to navigate to `node_modules/_library_name_` directory. We should look for a compiled/bundled version of the library. Most of the libraries provide such a version, but not all of them - **this is the major first issue we are going to encounter**. We have to copy that already bundled source code into our directory that will be serving JS files for a browser.

I personally wrote a simple build script that runs TypeScript compilation, copies all the libraries etc.

In our code we are probably using libraries in following format:

```js
import { groupBy } from 'lodash';
```

This code will be used by a browser, but the browser doesn't know what `lodash` means. It will fail on importing it. It cannot resolve `node_modules` like NodeJS do.

For that we use [importmap](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap) in our HTML:

```html
// index.html
<script type="importmap">
  {
    "imports": {
      "lodash": "./lodash.min.js",
    }
  }
</script>
```

This will tell the browser, than whenever it is instructed to import `lodash`, it should in fact load local path: `./lodash.min.js`.

{{h4|libraries-ts|Libraries with TypeScript}}

Now, TypeScript might not work with libraries. For `ESNext` modules (TypeScript configuration) it doesn't know where to look for them - they have to work in the browser which has different import resolution that TypeScript cannot automatically reason about.

But wait, we are already handling module resolution via `importmap`! That means we need TypeScript to be able to resolve only typing. And we can do it using `paths` in the `tsconfig.json` file:

```js
// tsconfig.json
{
  "paths": {
    "lodash": ["./node_modules/lodash/index.d.ts"], // or something similar
  }
}
```

Now, whenever we import `lodash`, TypeScript will know where its declaration file is.

Because paths corelate with `importmap`, they will be extremely useful when our app grows.

{{h3|esm-sh|esm.sh}}

I almost forgot to mention that there is a CDN for ESM libraries called [esm.sh](https://esm.sh/#docs) that allows you to write imports using HTTP protocol.

```js
import { common, createStarryNight } from 'https://esm.sh/@wooorm/starry-night@3?bundle';
import { toDom } from 'https://esm.sh/hast-util-to-dom@4?bundle';

const starryNight = await createStarryNight(common)
const prefix = 'language-'

const nodes = Array.from(document.body.querySelectorAll('code.code-block'))

for (const node of nodes) {
  const className = Array.from(node.classList).find(function (d) {
    return d.startsWith(prefix)
  })
  if (!className) continue
  const scope = starryNight.flagToScope(className.slice(prefix.length))
  if (!scope) continue
  const tree = starryNight.highlight(node.textContent, scope)
  node.replaceChildren(toDom(tree, {fragment: true}))
}
```

It might **very** useful for `importmap`, but I haven't tested it yet.

{{h3|summary|Summary}}

I'm not saying that bundlers are not useful, they certainly are. They manage assets, are usually bullet-proof, offer hot reloading, optimizations etc. But sometimes they are introduced when there is no actual need for them. Sometimes it's just enough to use things introduced by web standards only. The solution presented above *works*, but in certain cases it might be annoying (like in RxJS library case, which offers ESM build that you can copy, but it is invalid - it is not single-file build, and relative imports don't have extensions in paths, which makes that build unusuable for web). One might have to think hard around problems. There is beauty in that minimalistic approach, but it might not be for everyone. Hopefully JavaScript ecosystem and web standards will evolve to a point, when there will be no drawbacks, and all of that complex tooling will become obsolete.