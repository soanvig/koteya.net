## My journey of daily-driving NixOS

{{toc}}

I decided to switch from [Void Linux](https://voidlinux.org/) I've been using for years.
I was running it first on X11 with bspwm (tiling window manager), then Wayland with Hyprland (another tiling window manager).
The most important piece of a puzzle here is that I am disappointed Nvidia GPU user. Nvidia is well known in Linux community as being not Linux friendly. [Nvidia, fuck you!](https://www.youtube.com/watch?v=OF_5EKNX0Eg).

It just doesn't work as smooth as it should. I waited 2 years for explicit-sync being available in Nvidia closed-source driver.
Then it had to be supported by my window manager of choice (Hyprland). But Void is always very much behind when it comes to core dependencies (kernel version, drivers, compilers versions and so on), and Hyprland on the other hand is very much ahead. That means: I couldn't upgrade Nvidia driver, then I couldn't upgrade Hyprland which depends on a newer version of GCC.

This sparked the idea of switching distro, which I tried to avoid for a long time. So I wanted my new distro to offer me something interesting. Then I found [NixOS](https://nixos.org/).

NixOS makes some very interesting premise: "user can configure entire system using one configuration file".
I asked myself: "how's that possible, and how would it be useful to me?". An answer for the latter came immediately: I could have unified experience on both my laptop and desktop devices, and **know what I have configured** - I never knew what and how I have configured system & apps across dozens of configuration files, and what I have actually even installed, so having that explictly listed would be nice.

To answer the former I had to personally test it. So I spun virtual machine with NixOS on the deck, and gave it a try.

Fallen in love immediately.

{{h3|initial-experience|Initial experience}}

First and foremost I had to forget everything I knew about managing Linux based systems, and learn everything anew.
I wanted at least 90% things decided by the configuration file (`/etc/nixos/configuration.nix`), treating the rest as rather "non-important" parts of configuration, which can be easily reproduced on my other machine if needed.

Opening `configuration.nix` file strucked me with unfamiliar and rather strange (but quite readable) programming language syntax (the [Nix](https://nix.dev/tutorials/nix-language) language). I didn't complain - maybe it is just a language optimized for its primary role of configuring things.

I immediately noticed the settings I set during system (graphical) installation:

```nix
networking.networkmanager.enable = true;

time.timeZone = "Europe/Warsaw";
i18n.defaultLocale = "en_US.UTF-8";
console.keyMap = "pl2";

users.users.mortimer = {
  isNormalUser = true;
  description = "mortimer";
  extraGroups = [ "networkmanager" "wheel" ];
};
```

Ok, that looks interesting! Now I don't have to remember how to change my timezone or keymap. It also seems I can easily add user and its groups without remembering the commands (let's admit, we use them so rarely that we have to check them everytime we want to use them).

It's to try something by myself, let's install an app.

Normally one has to open up a terminal, use `search` of some sort, then `install` and it's done. In NixOS you have to find package in [repository](https://search.nixos.org/packages), copy its name and put it in the configuration file:

```nix
environment.systemPackages = with pkgs; [
  fish
]
```

... and rebuild system configuration:

```sh
sudo nixos-rebuild switch
```

Quite tedious and time consuming (rebuild *entire* configuration just to install an app?), but fine. It is what it is.
Ok, `fish` shell works, I tested it. Now the question: how do I configure it?

Here I encountered first problem: looking around Google I noticed that people are not installing shell using `environment.systemPackages`. They are adding an entirely new entry to the configuration file:

```nix
programs.fish.enable = true;
```

Well, so there are two ways of installing the same app? Or do I need to set both (first install the package, and then "enable" it)?

Apparently some apps are treated in a special way, and in fact, you should state them in the configuration file only once.
If there is a dedicated entry, like for the fish shell above, its want you usually want to use. You check the [NixOS options](https://search.nixos.org/options?show=programs.fish.enable&size=50&sort=relevance&type=packages&query=fish) first if there is a dedicated *option* for a desired package, then if not, you want to install it by adding an entry in `systemPackages`. It is what it is (again).

Ok, I have `fish` installed globally using an option: how do I configure it?

Apparently I have to make one crucial decision: am I talking about user-wide configuration or system-wide configuration?
I decided that I usually would want to keep configuration as close to the user as possible, so how do I do that? Well, that depends...

I discovered that NixOS is not responsible for user-wide configuration (it might be forced to, but it's not its default target). It is responsible for system-wide configuration. Hence using it for daily-driving is not something everyone recommends. Servers are fine, but a desktop usually requires quite solid and complicated management of user-wide configuration. There is a tool developed to do exactly that: [home-manager](https://github.com/nix-community/home-manager).

Fortunately home-manager itself is configured through system configuration file, so my goal of having everything in one place can be achieved.

Ok, I enabled `fish` system wide (because I want to have it available also outside home user), now I have to enable `fish` in user space using home-manager to control it, and be able to configure fish properly. Then I can follow [home-manager options](https://nix-community.github.io/home-manager/options.xhtml) to configure fish however I like - still without leaving `configuration.nix` file.

I followed home-manager options for all other packages I want, and set environment variables, PATH etc. After that my config file looks something like that:

```nix
home-manager.users.mortimer = { pkgs, config, lib, ... }: {
  # Installed normally from NixOS official package repository, but available only in my home user
  home.packages = with pkgs; [ 
    brave
    croc
    rustup
    ...
  ];

  # Environemnt variables
  home.sessionVariables = {
    EDITOR = "micro";
    RUSTUP_HOME = "${config.xdg.dataHome}/rustup";
    CARGO_HOME = "${config.xdg.dataHome}/cargo";
    ...
  };

  # PATH
  home.sessionPath = [
    "${config.xdg.dataHome}/cargo/bin"
  ];

  programs.fish = {
    enable = true;
    # Dedicated support for setting fish aliases
    shellAliases = {
      l = "eza -lh -s modified --group-directories-first --icons";
      s = "sudo";
      gst = "git status";
      ...
    }
  };

  programs.zoxide.enable = true;
}
```

What struck me is how easy it is to actually make things work. home-manager apps are extremely well interoperating.
For example: just because I enabled both `fish` and `zoxide` I immediately have properly working zoxide inside fish without any other configuration that normally would be required (this applies only to packages having dedicated options).

It's time to say that because configuration is a simple text file I can manage it through git, and have it version-controlled.
Also, each system rebuild (and update) creates a new boot entry, so if I break something up, I can always go back to latest properly working version, and: at least have usable system I need for work, or be able to fix an error in configuration (which during rebuild is checked for errors - including type errors - anyway). It makes NixOS "immutable" distribution in some sense.

At this point everything looks very nice (even if navigating Nix syntax, all package options etc requires proficiency). Note, that I haven't left virtual machine yet. It shouldn't be a problem: if I decide to go bare-metal, then I only need a configuration file, and everything should be just as in virtual machine, right?

Actually: right. I decided to go bare-metal, copied over configuration file, rebuilt, and... I could continue from where I left on virtual machine. Quite impressive if you ask me.

{{h3|managing-configuration-file|Managing configuration file}}

Now having working desktop configuration I had to decide how to approach having the same but slightly different configuration on my laptop. Here comes another **awesome** thing: you can just check other people configurations, and see in entirety how their systems are configured. And there is even [wiki list of users configuration](https://nixos.wiki/wiki/Configuration_Collection). I scouted few, and found one interesting.

The solution I decided to use to tackle the problem is having `base.nix` configuration, and additional "per device" configuration that includes the base. Then, link proper device configuration as primary `/etc/nixos/configuration.nix` used by NixOS.

I indeed formatted my laptop, installed NixOS, did above, and again... **it just worked**. If there is anything that **just works** it is NixOS, not Apple.

Now I can start splitting my one giant `base.nix` into multiple "feature" configurations changing "configure from one file" for "configure from one place" (have separate configuration file for `git`, for `fish` and so on). I can browse through other people configurations for inspirations, I can version control my configuration, and at any moment pull config done on desktop, and have it on my laptop. Beautiful. Everything as premised.

On one of forums dedicated to Linux I found a post saying: "all Linux systems should suppose to work like NixOS".

{{h3|nix-shell|nix-shell and shell.nix}}

We have to talk about another nice feature of NixOS. Due to its immutable concept, you can create subenvironments in your shell by creating `shell.nix` file in a given directory. Upon entering such directory and executing `nix-shell` you are taken into new shell that contains configuration defined in that `shell.nix` file: it can contain new packages, different configuration for already existing applications and so on. It effectively works like a subenvironment inside your system. It might be very elegant to have a clean system, and have everything configured in those subenvironments, but I find it an overkill, and prefer to use it only for some project's very specific requirements.

`nix-shell` also allows to test packages without installing (or to use a package that you wish not to have installed forever). Using a shortcut `nix-shell -p <package_name>` you enter environment that contains given package, so you can play with it without installing. It works even with GUI apps, so in that regard it is much better than for example a Docker container.

{{h3|struggles|Struggles}}

{{h4|multiple-channels|Multiple channels}}

NixOS has multiple channels of packages. Initially I went with `stable`. But stable is quite old, so there is also `unstable`. It wasn't obvious to me at first, but unstable is rolling while stable is more of point/release-based. Unstable doesn't mean that things are breaking, it means that they are often upgraded.

I decided to switch to `unstable` because not all packages very fresh enough (or simply not available) in stable. Fortunately it was easy, and required another system rebuild (this one took much longer, as it had to rebuild virtually everything).

{{h4|struggles-flakes|Flakes}}

I heard about *flakes* already, that they are new experimental feature. Apparently it's not new, and not that experimental already, as a lot of people are using them. Flakes are a concept built on top of a Nix package manager. They work as a function that accepts some input (for example package repository), and return an output (for example a part of a configuration), so in some sense they work very similar to a configuration file.

What's interesting about them, is that they are designed to be self-contained in some sense: first and foremost by having a `lockfile` known from programming build tools. That allows each flake to have its own list of dependencies, with specific versions (that is normally not possible, because NixOS system configuration is global). On top of that, one flake can be extended by another one that can come even from an external source like GitHub. The idea behind them is to increase system modularity and reproducibility.

I'm not using them at the moment, as they are not solving any particular issue that I have, break the idea of having single configuration file, and [might lead to overengineered system configuration](https://www.youtube.com/watch?v=D52UuOtZ1R0) unless used with caution.

{{h4|struggles-packages|Packages}}

All NixOS packages are managed through its [GitHub repository](https://github.com/NixOS/nixpkgs). And the repository... is enormous. At the moment of writing there are over 9391 issues open (33779 closed), 6557 pull requests open (314425 closed) - **how to even manage that scale?**

Anyway, according to [repology.org](https://repology.org/repositories/statistics/newest) NixOS has the highest number of newest packages - it's better than beloved and famous [Arch AUR](https://aur.archlinux.org/). Even with those statistics I found some packages missing, or some outdated enough for me to be a problem.

Maybe I had bad luck, but you see, the issue is that on typical Linux distro even if distribution channel is outdated I can just find another way to install a package. In NixOS... not really. You have to do everything Nix-way or it's simply too troublesome (or not working at all - more on that later). There are NixOS-ways to do non-NixOS things, but it requires advanced knowledge of NixOS ecosystem which is not beginner-friendly.

It is also non-trivial to change/downgrade package version. You are usually stuck with version in the selected distribution channel (stable/unstable). And again - there NixOS-ways to handle that situation, that - again - are not beginner friendly.

{{h4|struggles-linked-libraries|Dynamicly linked binaries from outside NixOS packages}}

NixOS manages libraries and dependencies in its own way. It effectively means that if you simply download a binary that is dynamically linked it won't work in NixOS. I haven't checked *why exactly*, but I know *it is*, and it is **very problematic**.

Let's say I'm a programmer (I am), and I want to manage version of my Node.js. There is excellent version manager [n](https://www.npmjs.com/package/n) (much, much better and stable than well-known [nvm](https://github.com/nvm-sh/nvm)). But it simply doesn't work. It downloads `node` binaries, installs them in your path, switches some links etc. By itself it works in NixOS, but the binary doesn't work at all - it is dynamically linked, and libraries are installed somewhere in NixOS, and only Nix package manager knows where. It is meant to be that way.

Of course, there are some solutions to overcome that: you have to wrap your custom dynamically-linked binary with Nix (usually using forementioned `flakes`) or something, but is it simple? No. Straightforward? Hell no!

This is something for me to figure out.

{{h4|struggles-learning-curve|Learning curve}}

Everything mentioned above makes NixOS having learning curve similar to normal distribution (sorry I'm slightly misusing the meme):

![programmer's journey of using NixOS]({{asset|/blog/nixos-journey-meme.webp|./src/pages/blog/nixos-journey-meme.webp}})

I'm currently in the middle: have working configuration, but some things have rough edges, some are not solved at all.

{{h3|summary|Summary}}

NixOS met all my expectations without. Using Linux system I expect to have issues (that in comparison to Windows are solvable at least). Although there are a lot of struggles I have with NixOS I generally see that they are solvable, but all of them require dwelving into NixOS even more. **NixOS is a rabbit hole**. You always come up with ideas to improve, so it's definitely a system for tinkerers. Knowledge of NixOS ecosystem is extremely beneficial: you can achieve things unachievable in other distributions. But it doesn't carry over to other distributions. My improvements of a workflow are not usable by people not using NixOS (and on the other hand very easily usable by people on NixOS). NixOS is a walled-garden in some sense (I already made Apple comparison in this blogpost, didn't I?). You are forced to do everything Nix-way. I mean you don't have to, but if you don't you are somehow punished - sooner or later. It's not a system for masochists (like MacOS), but you have to have some willpower to make your way through. NixOS **is** changing your perspective on what an operating system might be, and I believe this change is irreversible.

**I couldn't recommend it more.**


