#!/usr/bin/nu

def main [] {
  podman run --replace -d --name koteya.net -v $"./Caddyfile:/etc/caddy/Caddyfile:Z" -v ./build:/var/www:Z -p 8080:80 docker.io/caddy
  # -p 443:443
}