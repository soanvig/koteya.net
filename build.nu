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

  rm -rf $target;
  mkdir $target;

  let pages = (ls src/pages/**/*.html);
  let template = (open src/template.html);

  for $page in $pages {
    let path = $page.name;
    let name = $page.name | str replace "src/pages/" "";
    let page_content = (open $path);

    $template | str replace "{{page}}" $page_content | save $"($target)/($name)"
  }

  cp ./src/assets/**/* ./build;

  print $"(ansi green)✓(ansi reset)"
}