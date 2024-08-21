#!/usr/bin/nu

def main [] {
  ./build.nu
  ./container.nu build
  podman image scp koteya.net vps::
  ssh vps 'podman run --replace -d --name koteya.net -v ~/caddy_data:/data -v ~/caddy_config:/config -p 80:80 -p 443:443 --restart always localhost/koteya.net'
}