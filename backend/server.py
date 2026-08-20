from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

# Resolve frontend directory relative to this script file
BASE_DIR = (Path(__file__).resolve().parent / ".." / "frontend").resolve()

ALLOWED_FILES = {
    "/": (BASE_DIR / "index.html", "text/html"),
    "/index.html": (BASE_DIR / "index.html", "text/html"),
    "/style.css": (BASE_DIR / "style.css", "text/css"),
    "/script.js": (BASE_DIR / "script.js", "application/javascript"),
    "/favicon.ico": (BASE_DIR / "favicon.ico", "image/x-icon"),
}

class RestrictedHTTPRequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Strip query parameters if present
        clean_path = self.path.split("?")[0]

        if clean_path in ALLOWED_FILES:
            file_path, content_type = ALLOWED_FILES[clean_path]

            if file_path.is_file():
                self.send_response(200)
                self.send_header("Content-Type", content_type)
                self.send_header("Content-Length", str(file_path.stat().st_size))
                self.end_headers()

                with open(file_path, "rb") as f:
                    self.wfile.write(f.read())
                return

        # Return 404 for any unapproved routes or missing files
        self.send_error(404, "File Not Found")

def run(port=8080):
    server_address = ("", port)
    httpd = HTTPServer(server_address, RestrictedHTTPRequestHandler)
    print(f"Server running at http://localhost:{port}/")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()

if __name__ == "__main__":
    run()
    