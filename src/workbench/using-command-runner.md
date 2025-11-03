## Using proper command runner instead of npm script

### A glance into the history written by a person with shitty memory (it rhymes)

If you've ever worked with frontend, do you remember [Grunt](https://gruntjs.com/) or [Gulp](https://gulpjs.com/)?
These were one of the first widely popular build tools (focused on web frontend), back in the days of JS wild wild west when Node and npm were newcomers.

Anyway, they did one thing essentialy: picked files by a type (usually extension) and ran plugins (tools) on these.
So user could run his SCSS files through a compiler, and then minify it, using two separate tools. It created the >build pipeline< - user configured!

If you come from a different programming background you might know Makefile ([GNU Make](https://www.gnu.org/software/make/)) which sounds awfully similar. That's what webdevs noticed as well, so a call to use Make was made. Not for long though, as using tools not written in JS was not cool (back then we didn't rewrite everything in Rust). Then there was Browserify and Webpack with their own set of plugins, another call to use npm scripts, and it kind-of settled. Or something like that, I could mix the order of events. Okey, maybe there were another 16 build tools in the meantime, but it doesn't matter.

### npm scripts era

For about 8 years already it's all about npm scripts as an entrypoint to a development workflow. `npm install`, `npm build`, `npm start`... But hey, it's a package manager. So certainly `install <a package>` or `remove <a package>` make sense, but `start`? Does it mean `start <a package>`? No, it is running `start` script from my **package's definition file**. What package definition file has to do with my local development workflow. **And it's a JSON file**. That means, that when writing scripts I have to care about escaping double quotes. And it doesn't support newlines. And comments!

Now that **is not** proper task runner, we have to be honest. It's convienent for distributing your scripts alongside the project, but it doesn't even ensure that those scripts will work. First of all, they cannot ensure system tools are installed, so they need JS alternatives to be installed. Secondly, they don't support platform differences (i.e. different command for Windows and POSIX cannot be defined) so we need to flood those with even more JS glue. Additionaly, it is as barebones as it can be. Although it supports some part of POSIX shell syntax (like `&&` or `||`) it doesn't support everything that might be useful. Commands cannot be parametrized flexibly (`npm start <arg>` simply appends arg to the end of the command - if multiple commands are joined with `&&` we cannot decide which should receive the parameter).

