## My confession on React

I must come clean on the topic of React...

It has been few years already that I've been passively hating React.
Maybe because I had to work with it professionally but all my private projects that required
some browser rendering I did in anything but React (Lit, Vue, Svelte, home-baked solutions etc).

However today I write a game (in JavaScript) that for rendering mixes WebGL (for the actual game) and HTML/CSS (for the UI). I want my
HTML/CSS rendering to be **for** game engine/JavaScript (as an addition), not vice-versa (which by the way is how all
browser applications should work in my opinion). And for that I need something that blends nice with the rest of the code.

I do not have build pipeline (besides TypeScript) so Svelte is out of the box.

I went with Vue (really admiring its support for no-build, althought documentation could be <em>slightly</em> better).
It worked nice for a while but no support for TypeScript in HTML templates (which in no-build are plain strings essentially),
its reactivity system which relies heavily on signals that started to leak into the rest of app (even with abstraction layer),
and some more problems that I won't dive into - it all eventually lead to my frustration which is something we all should avoid.

Then for the first time I tried [Lit](https://lit.dev) and was pretty excited about web components it uses - initially, because
after some time I remembered why I hate web components. Whoever worked with Shadow DOM knows how annoying encapsulation is.
Lit also had some rough edges, and was not straightforward to integrate in a flexible way.

Finally, after a lot of research on possible libraries and founding nothing useful for my use-case I thought about React.
It came to me that it checks all the boxes: is minimal, is easy to integrate with any existing system,
and due to fortunate TypeScript support for JSX React doesn't need build pipeline.

Maybe I was not hating React, but hating React devs who often overengineered things, created mess in codebase and so on.
The library itself (or Preact that I actually used) is not bad. It does what is supposed to do, and nothing more
(which is probably why people often have problem with harnessing it). And I like it.
      