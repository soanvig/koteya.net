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

  let pages = (glob src/pages/**/*.{html,md}) | path relative-to (pwd);
  let template = (open src/template.html);

  for $path in $pages {
    let name = $path | str replace "src/pages/" "" | str replace ".md" ".html";
    let dir = $"($target)/($name | path parse | $in.parent)";

    mkdir $dir;

    let page_content = (open $path)
      | process_tokens $path
      | md_to_html $path;

    $template
      | str replace "{{page}}" $page_content
      | process_tokens $path
      | save $"($target)/($name)"
  }

  mkdir ./build/assets
  cp -r ./src/assets/* ./build/assets;

  print $"(ansi green)✓(ansi reset)"
}

def get-file-date [file_path: string] string {
  let date = git log -1 --pretty="format:%ci" $file_path;

  if ($date | | str length) == 0 {
    date now | format date "%Y-%m-%d" 
  } else {
    $date | format date "%Y-%m-%d"
  }
}

def get-header [level: string, id: string, text: string] string {
  $"<($level) id=\"($id)\"><a href=\"#($id)\">#</a>($text)</($level)>"
}

def md_to_html [file_path: string] string -> string {
  if ($file_path | str ends-with '.md') {
    $in | comrak --syntax-highlighting none --unsafe --gfm
  } else {
    $in
  }
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