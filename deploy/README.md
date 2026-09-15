# HTTPS deployment

The contents of `src/blood_measure/web` are a static site. They can be placed
on any HTTPS static host without a database or application server.

## Private local-network testing

Create a locally trusted certificate with `mkcert` on the development machine:

```bash
mkcert -install
mkcert -cert-file deploy/local-cert.pem -key-file deploy/local-key.pem localhost 127.0.0.1 YOUR_LAN_IP
blood-measure-web --host 0.0.0.0 --port 8443 --certfile deploy/local-cert.pem --keyfile deploy/local-key.pem
```

Replace `YOUR_LAN_IP` with the computer's address, then open
`https://YOUR_LAN_IP:8443` on the phone. The mkcert root certificate must be
installed and trusted on the phone. Keep `local-key.pem` private and do not
commit it.

## Public HTTPS hosting

Copy `src/blood_measure/web` to the static web root. An example Caddy
configuration is included in `deploy/Caddyfile`; replace its example domain.
No readings are uploaded by this app because all history uses browser local
storage.
