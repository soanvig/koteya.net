FROM docker.io/caddy

COPY ./Caddyfile /etc/caddy/Caddyfile
COPY ./build /var/www