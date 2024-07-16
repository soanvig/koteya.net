#!/usr/bin/nu

def main [] {
  git push -f vps master
  ssh vps git --work-tree=/home/mortimer/koteya.net --git-dir=/home/mortimer/koteya.net.git checkout -f

  ssh vps 'cd koteya.net; ./build.nu'
  ssh vps 'cd koteya.net; ./container.nu prod'
}