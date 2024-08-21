## Thoughts on Nushell (Nu)

[Nushell](https://nushell.sh) (or *Nu*) is an alternative shell for an operating system.

<small class="disclaimer">
  Shell is an application used for interacting with an operating system, usually directly by the user using the text based interface (terminal).
  It incorporates some sort of programming language that can be used to write programs directly in the shell.
</small>

It claims to provide ease of programming through its custom non-[POSIX](https://en.wikipedia.org/wiki/POSIX) compliant language (more on that later). In this blog post I'll explain its basics, and share my thoughts on utilizing Nushell as a daily driver. Note, that the more I use it the more I like, so this blog post is also meant to convince the reader to try Nushell out.


{{h3|basics|The basics - structured data}}


In typical shell like *Bash*, *zsh* or *Fish* commands execute and return their output to the shell, where it is further processed through a command *pipeline*, saved in variable or just printed to the console. Nushell takes similar approach here. **The difference** is in *what* commands accept as an input, and return as an output. In all POSIX compliant shells (and most non-POSIX like Fish) everything is a text - simple list of characters, that don't encode any structured data. Some information is computed in one program, then converted into text, and if piped to another program it's that program's job to decode that text information for further processing.

Let's see an example. I'll list root directory of that homepage using Bash:

```
$ ls -l
-rw-rw-r-- 1 user user   72 Jul 15 13:45 Caddyfile
-rw-rw-r-- 1 user user   51 Jul 17 03:51 TODO.md
drwxrwxr-x 3 user user 4096 Jul 17 04:39 build
-n 1 user user  837 Jul 17 04:20 build.nu
-rwxrwxr-x 1 user user  406 Jul 16 17:47 container.nu
-rwxrwxr-x 1 user user  245 Jul 16 17:43 deploy.nu
drwxrwxr-x 4 user user 4096 Jul 11 01:01 src
```

If I would like to narrow that result to a file size (e.g. `72`) and the file name (e.g. `Caddyfile`) I would have to: 

1. Divide output into lines (usually happens automatically)
2. Divide each line into columns (the output resembles table format)
3. Pick 5th and 9th column (knowing that these are the columns I'm interested in)

Which finally would result in me using *awk* command to do the parsing: `ls -l | awk '{printf "%s %s \n",$5,$9}'` (other approach can be taken to achieve the same result)

<small class="disclaimer">
  Awk is a very powerful text-processing program usually used in such situations. In incorporates a programming language of its own.
</small>

On the other hand if the data returned by `ls -l` was structured in the first place (i.e. not simple text) it would already be divided into file entries (and not separate lines) that contain fields (and not arbitrary columns).

And that is exactly what Nushell is doing: has support for structured data. It starts by providing its own `ls` command:

```
> ls
╭───┬──────────────┬──────┬─────────┬────────────────╮
│ # │     name     │ type │  size   │    modified    │
├───┼──────────────┼──────┼─────────┼────────────────┤
│ 0 │ Caddyfile    │ file │    72 B │ 2 days ago     │
│ 1 │ TODO.md      │ file │    51 B │ 2 hours ago    │
│ 2 │ build        │ dir  │ 4.0 KiB │ 19 seconds ago │
│ 3 │ build.nu     │ file │   837 B │ an hour ago    │
│ 4 │ container.nu │ file │   406 B │ 11 hours ago   │
│ 5 │ deploy.nu    │ file │   245 B │ 11 hours ago   │
│ 6 │ src          │ dir  │ 4.0 KiB │ 6 days ago     │
╰───┴──────────────┴──────┴─────────┴────────────────╯
```

  We can already see the benefits of structured data. Default Nushell's formatter can print us a nice table. Now we can pipe the output to `each` function that will pick some fields from the table by referencing fields **directly by name**:

```
 > ls | each { echo $"($in.size) ($in.name)" }
╭───┬────────────────────╮
│ 0 │ 72 B Caddyfile     │
│ 1 │ 51 B TODO.md       │
│ 2 │ 4.0 KiB build      │
│ 3 │ 837 B build.nu     │
│ 4 │ 406 B container.nu │
│ 5 │ 245 B deploy.nu    │
│ 6 │ 4.0 KiB src        │
╰───┴────────────────────╯
```

The output is now formatted not as a table but a list. The code we wrote is more declarative and readable, and doesn't depend on arbitrary things like column separator and column order.


{{h3|features|Features}}


Before talking about Nushell's [pitfalls](#pitfalls) I would like to quickly go through some of its features

{{h4|features-repl|Interactive shell (REPL)}}

As demonstrated above Nushell is very useful when used as interactive shell (directly in a terminal emulator) for writing simple scripts. The language is expressive, and with the structured data and helper functions it is easy (and somewhat intuitive) to get the results we expect. It also is able to display the results in pretty-printed format (colored and structured). On top of that it can integrate with command-completion systems (like [Carapace](https://github.com/carapace-sh/carapace-bin), or even Fish).

```nushell
# convert all ogg files in music directory into mp3 using FFmpeg in parallel
> ls ./music/**/*.ogg # glob listing works
  | par-each { # built-in parallelism
    # easy path manipulation
    let output = ($in.name | path parse | $"($in.parent)/($in.stem).mp3");
    ffmpeg -i $in.name $output;
  }
</code>
```

One of the most interesting features available to Nushell's REPL are [hooks](https://www.nushell.sh/book/hooks.html). They can run certain code in configured situations. One use-case that I think might be the most powerful is the ability to track environment variables changes (`PWD` in particular) that allows to run code when entering or exiting a directory. It's up to one's imagination to find out how it can improve productivity. Check out Nushell's docs for more examples.

{{h4|features-commands|Built-in commands}}

Nushell has impressive number of [built-in commands](https://www.nushell.sh/commands/) for writing shell programs. That includes:

- HTTP client: `http get https://example.com/posts`
- Watch file changes: `watch ./src {|| cargo check }`
- Hashing/checksums: `open ./file | hash sha256`
- Random (various data types): `random uuid`
- Glob: `glob **/*.{rs,toml} --depth 2`
- Parsing popular formats (TOML, JSON, CSV etc.): `open Cargo.toml | select package.edition`
- Coloring: `print $"(ansi green)Success(ansi reset)"`

and a lot, lot more. It's truly battery-included. Besides what's provided, it also supports plugins, and has growing community [writing scripts](https://github.com/nushell/nu_scripts).

{{h3|pitfalls|Pitfalls}}

Nushell at current stage is not perfect. Its capabilities are impressive, but such number of features makes it harder to maintain.
This results in bugs that can appear after an upgrade, or some things simply not working consistently or as one may expect.

Nushell is not POSIX-compliant, so whatever you are used to in Linux/Mac is mostly useless, and you need to learn everything from scratch.
Although getting adjusted doesn't take a lot of time, it might be *really* annoying at first. There is another risk as well: integration with existing POSIX tools might not be straightforward. That being said Nushell provides good set of tools to convert unstructured data to a structured counterpart and vice versa.

It's worth to say that despite having huge amount of processing functions, it still lacks some useful utilities (like advanced string matching or replacing string at given position), so fallbacking to programms like `awk` might be necessary.


Nushell's API is sometimes a bit too flexible, and sometimes not consistent, so it's very easy to make an error. For example what is the expected result of creating a list from: `[1, 2 + 3]`? One could say it should be `[1, 5]` however in reality it will be `[1, 2, +, 3]`. It happens because commas are optional in list definition, and everything is treated as a string. To achieve desired result we have to convert addition into explit expression: `[1, (2 + 3)]`. Note that space between added numbers is required, otherwise `2+2` expression would be interpreted as a command of that name. Although **Nushell is more secure than other shells** it is still walking on thin ice - not because the shell is bad but because its language/API has number of problems. Hopefully they will be acknowledged and resolved.

At the moment of writing that blogpost Nushell has **[over 1400 open issues](https://github.com/nushell/nushell/issues)** while having 31000 stars. To me that ratio speaks for itself: it's one issue per 22 stars. In comparison [Fish](https://github.com/fish-shell/fish-shell) (albeit more mature, but still providing a lot of functionality) has 425 issues with 25000 stars: that is one issue per 58 - over two times less issues.