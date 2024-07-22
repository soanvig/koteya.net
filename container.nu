#!/usr/bin/nu

def main [] {
	
}

def 'main dev' [] {
  podman run --replace -d --name koteya.net -v $"./Caddyfile:/etc/caddy/Caddyfile:Z" -v ./build:/var/www:Z -p 8080:80 docker.io/caddy
}

def 'main build' [] {
  podman build -t koteya.net .
}
