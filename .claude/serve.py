import functools
import http.server
import socketserver
import sys

port = int(sys.argv[1]) if len(sys.argv) > 1 else 5555
directory = sys.argv[2] if len(sys.argv) > 2 else "."

handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=directory)
with socketserver.TCPServer(("127.0.0.1", port), handler) as httpd:
    httpd.serve_forever()
