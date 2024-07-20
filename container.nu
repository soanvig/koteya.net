#!/usr/bin/nu

def main [] {
	
}

def 'main dev' [] {
  podman run --replace -d --name koteya.net -v $"./Caddyfile:/etc/caddy/Caddyfile:Z" -v ./build:/var/www:Z -p 8080:80 docker.io/caddy
}

def 'main prod' [] {
  podman run --replace -d --name koteya.net -v $"./Caddyfile:/etc/caddy/Caddyfile:Z" -v ./build:/var/www:Z -v ~/caddy_data:/data -v ~/caddy_config:/config -p 80:80 -p 443:443 --restart always docker.io/caddy
} 
