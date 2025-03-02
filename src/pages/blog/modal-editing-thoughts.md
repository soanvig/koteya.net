# Modal editing thoughts (TUI editors rant)

I'm a programmer, and I use *VS Code* every day. I like its compromise between simplicity and useful built-in features. I **actually** like that it uses browser-engine for rendering, as browser-engine rendering is the best in the world for GUIs. But that's the problem - I am not a huge fun of GUIs.

The first obvious choice for TUI is *vim* (et consortes: I to put all forks/editions under the same umbrella). It's absolutely beloved by its long-term users.

<small class="disclaimer">
TUI - terminal user interface<br>
GUI - graphical user interface
</small>

> It's extensible!

> It has modal editing which is superior to anything else!

> It's superfast!

Well, well-written TUI editors (running in a GPU-accelerated terminal emulator) seem to be faster than GUI ones. They are *snappier*.

I also love that Vim is extensible by code in configuration files. That's the best way of configuration in my opinion.

<small class="disclaimer">
Modal editing means that during workflow user switches between *modes*:
one usually dedicated for navigating around and applying modifications (replace, remove, etc.), and one for inserting characters.
</small>

## Modal editing

But Vim has modal editing, it's inescapable - and I absolutely hate it.

> It's just skill issue!

Maybe. Or maybe not? The way I see it is that it requires a lot of investement in practice.
I have to build up entirely new muscle memory. I have to remember number of commands to be at least somewhat productive. I have to go through absolute pain of making mistakes and undoing them when executing commands to finally learn and "utilize full modal editing power".

Maybe after all these hours spent re-learning how to interact with text editor, I will be productive, and join Vim church. But why do I have to do that to just write text?

First of all, I'm pretty happy of how productive I am within VS Code. It gives me more than enough commands to navigate and modify the code. It's just a matter of finding them, binding to a shortcut I like (or not bind at all if used rarely, and execute them from the command palette), accustom with the shortcut, and that's all. I do not need to "increase my productivity". To me that's a buzzword, and has no real meaning without a context.

So let's provide that context (my context).

I don't experience problem with fingers or wrist pain with my current keyboard usage. I have long and flexible fingers. Using only alphanumeric keys is not an argument to me - I'm OK with using control keys. 

I am still able to write most of the text/code using just the keyboard, so I don't need to fallback to using mouse. And even if I do, I have a tenkeyless keyboard, so being right-handed my mouse is much closer to the place I have my hands on the keyboard.

I do achieve ~120 WPM with ~98% accuracy in english typing tests (note that english is not my native language). That comes with the fact, that I don't use typical 10-finger writing style; I have developed my own.

Around 50% of the time spent on programming is thinking. In my case, **at least** another 40% is spent on writing. That leaves 10% on navigating a file and applying transformations. And for 8% of that 10% leftover, I have few useful shortcuts. That leaves 2% of cases when I would like to have more advanced navigation/transformation tools, but I can really live with that 2%. Citing a random StackOverflow commenteer: **"productivity gain" from the "investment" is an argument made after the fact to excuse the time wasted on the investment.**

Considering that context: is modal-editing for me? Is it worth investing time? No.

Any time I see a video or comments recommending vim, when it comes to modal editing everybody seems to make a display of completely pointless text-manipulation that I cannot imagine using in practice. Even if useful, people seem to be able to achieve such things in Emacs (which doesn't have modal editing), so it's not related to the modal editing itself.

## Desired state of things

I wish there was a TUI editor, suitable for coding, that doesn't require modal editing. There is Emacs, but it has a lot of legacy baggage, has insane defaults, and - this is a skill issue - requires knowledge of Emacs LISP language I can't get through. On the other hand, there is Helix, which would be perfect if it was suitable for non-modal workflow. Although technically I can configure all the commands to be non-modal, first of all that doesn't get rid of modes, and secondly there is a lot of friction nevertheless.

That being said, I wish there was a TUI editor, suitable for coding, with sane defaults, that doesn't **encorce** anything. Give me an editor, give me LSP support, give me plugins, **and give me commands**. If I choose to have modal editing or non-modal editing on top of that, it should be up to me. Unfortunately, this is not how things are.

