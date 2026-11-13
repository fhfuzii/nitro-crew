"""Servidor local de desenvolvimento sem cache (o http.server padrão deixa o
navegador reaproveitar módulos JS antigos).

Uso: python tools/serve.py [porta]   (padrão 8080), na raiz do repositório.
"""
import functools
import http.server
import os
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    handler = functools.partial(NoCacheHandler, directory=root)
    with http.server.ThreadingHTTPServer(("127.0.0.1", port), handler) as srv:
        print(f"Nitro Crew em http://localhost:{port}")
        srv.serve_forever()


if __name__ == "__main__":
    main()
