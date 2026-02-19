default:
  just --list

build:
  node --experimental-strip-types ./build.ts
  cp -r ./projects ./build/projects

watch:
  watchexec -e html,md,css,ts just build

container-dev: build
  podman run --replace -d --name koteya.net -v ./Caddyfile:/etc/caddy/Caddyfile:Z -v ./build:/var/www:Z -p 8080:80 docker.io/caddy

container-build: build
  podman build -t koteya.net .

# Requires: podman system connection add --identity ~/.ssh/id_rsa vps ssh://<user>@<ip>:22
deploy-vps: build container-build
  podman image scp koteya.net vps::
  ssh vps 'podman network create --ignore vps'
  ssh vps 'podman run --replace -d --name koteya.net --hostname website --network vps --restart always localhost/koteya.net'

serve:
  pnpm live-server ./build
