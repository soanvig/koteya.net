#!/usr/bin/nu

let target = "./build";

def main [
  --watch (-w)    # watch mode
] {
  build

  if $watch {
    watch ./html {|| build}
  }
}

def build [] {
  print -n "Rebuilding... "

  # Can't remove build because it breaks Caddy if already running
  rm -rf ./build/*
  mkdir $target;

  let pages = (ls html/pages/**/*.html);
  let template = (open html/template.html);

  for $page in $pages {
    let path = $page.name;
    let name = $page.name | str replace "html/pages/" "";
    let page_content = (open $path);
    let dir = $"($target)/($name | path parse | $in.parent)";

    mkdir $dir;

    $template
      | str replace "{{page}}" $page_content
      | process_tokens $path
      | save $"($target)/($name)"
  }

  cp ./html/assets/**/* ./build;

  print $"(ansi green)✓(ansi reset)"
}

def get-file-date [file_path: string] string {
  git log -1 --pretty="format:%ci" $file_path | format date "%Y-%m-%d"
}

def get-header [level: string, id: string, text: string] string {
  $"<($level) id=\"($id)\"><a href=\"#($id)\">#</a>($text)</($level)>"
}

def process_tokens [file_path: string] string -> string {
  $in | each-token {|token, ...rest|
    let result = match $token {
      "date" => {
        if ($rest | is-empty) {
          get-file-date $file_path
        } else {
          get-file-date ($file_path | path dirname | path join $rest.0)
        }
      },
      "h1" | "h2" | "h3" | "h4" | "h5" | "h6" => (get-header $token $rest.0 $rest.1)
    }

    $result
  }
}

def each-token [
  cb: closure # |...tokens| -> string
] string -> string {
  mut input: string = $in
  mut output: string = ''

  for line in ($input | lines) {
    mut last_index = 0
    mut token_ranges: list<range> = []

    loop {
      let token_start_index = $line | str index-of --range $last_index.. '{{'

      if $token_start_index == -1 {
        break
      }

      let token_end_index = $line | str index-of --range $token_start_index.. '}}'

      if $token_end_index == -1 {
        error make { msg: "token not finished" }
      }

      $last_index = $token_end_index + 1
      let $token_range = ($token_start_index..$last_index);
      $token_ranges = ($token_ranges | append [$token_range])
    }

    mut updated_line = $line
    for $token_range in $token_ranges {
      let token = $line | str substring $token_range | str replace '{{' '' | str replace '}}' ''
      let splitted = $token | split row '|'
      let replace_result = do $cb ...$splitted

      if ($replace_result | is-empty) {
        continue;
      }

      let replace_start = $token_range.0 - 1;
      let replace_end = $replace_start + ($token | str length) + 5;
      let before_token = if $replace_start == -1 { "" } else { $updated_line | str substring ..$replace_start; }
      let after_token = $updated_line | str substring $replace_end..;
      
      $updated_line = $before_token + $replace_result + $after_token
    }


    $output = $output + "\n" + $updated_line
  }

  $output
}