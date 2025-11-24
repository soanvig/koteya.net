default:
  just --list

build:
  node --experimental-strip-types ./build.ts

watch:
  watchexec -e html,md,css,ts just build

container-dev: build
  podman run --replace -d --name koteya.net -v ./Caddyfile:/etc/caddy/Caddyfile:Z -v ./build:/var/www:Z -p 8080:80 docker.io/caddy

container-build: build
  podman build -t koteya.net .

# Requires: podman system connection add --identity ~/.ssh/id_rsa vps ssh://mortimer@192.168.1.106:22
deploy-vps: build container-build
  podman image scp koteya.net vps::
  ssh vps 'podman network create --ignore vps'
  ssh vps 'podman run --replace -d --name koteya.net --hostname website --network vps --restart always localhost/koteya.net'

# Requires: gcloud and gcloud credential helper, should be run inside nix-shell
deploy-gcloud: build container-build
  gcloud auth print-access-token --quiet | podman login -u oauth2accesstoken --password-stdin europe-west4-docker.pkg.dev
  podman tag koteya.net europe-west4-docker.pkg.dev/private-cloud-291619/koteyanet/koteya.net:latest
  podman push europe-west4-docker.pkg.dev/private-cloud-291619/koteyanet/koteya.net
  gcloud run deploy koteyanet --port=80 --region=europe-west4 --image=europe-west4-docker.pkg.dev/private-cloud-291619/koteyanet/koteya.net

serve:
  pnpm live-server ./build
