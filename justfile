default:
  just --list

build:
  node ./build.mjs

container-dev:
  podman run --replace -d --name koteya.net -v $"./Caddyfile:/etc/caddy/Caddyfile:Z" -v ./build:/var/www:Z -p 8080:80 docker.io/caddy

container-build:
  podman build -t koteya.net .

# Requires: podman system connection add --identity ~/.ssh/id_rsa vps ssh://mortimer@192.168.1.106:22
deploy:
  just build
  just container-build
  podman image scp koteya.net vps::
  ssh vps 'podman run --replace -d --name koteya.net -v ~/caddy_data:/data -v ~/caddy_config:/config -p 80:80 -p 443:443 --restart always localhost/koteya.net'

serve:
  pnpm serve ./build