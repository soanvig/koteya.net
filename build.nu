#!/usr/bin/nu

let target = "./build";

def main [
  --watch (-w)    # watch mode
] {
  build

  if $watch {
    watch ./src {|| build}
  }
}

def build [] {
  print -n "Rebuilding... "

  # Can't remove build because it breaks Caddy if already running
  rm -rf ./build/*
  mkdir $target;

  let pages = (ls src/pages/**/*.html);
  let template = (open src/template.html);

  for $page in $pages {
    let path = $page.name;
    let name = $page.name | str replace "src/pages/" "";
    let page_content = (open $path);
    let dir = $"($target)/($name | path parse | $in.parent)";

    mkdir $dir;

    $template
      | str replace "{{page}}" $page_content
      | str replace "{{date}}" (git log -1 --pretty="format:%ci" $path | format date "%Y-%m-%d")
      | save $"($target)/($name)"
  }

  cp ./src/assets/**/* ./build;

  print $"(ansi green)✓(ansi reset)"
}