from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
import subprocess

# Base directories
BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = (BASE_DIR / ".." / "frontend").resolve()
TEMP_DIR = (BASE_DIR / ".." / "temp").resolve()

# Ensure temp directory exists
TEMP_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_FILES = {
    "/": (FRONTEND_DIR / "index.html", "text/html"),
    "/index.html": (FRONTEND_DIR / "index.html", "text/html"),
    "/style.css": (FRONTEND_DIR / "style.css", "text/css"),
    "/script.js": (FRONTEND_DIR / "script.js", "application/javascript"),
    "/favicon.ico": (FRONTEND_DIR / "favicon.ico", "image/x-icon"),
}

class RestrictedHTTPRequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
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

        self.send_error(404, "File Not Found")

    def do_POST(self):
        if self.path == "/simulate":
            try:
                # Read POST body
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length).decode('utf-8')

                # Define temp file paths
                input_file = TEMP_DIR / "input.qca"
                output_file = TEMP_DIR / "output.txt"

                # Check and delete existing files
                if input_file.exists():
                    input_file.unlink()
                if output_file.exists():
                    output_file.unlink()

                # Write request payload to input.qca
                with open(input_file, "w", encoding="utf-8") as f:
                    f.write(post_data)

                # Execute QCADesigner
                # Using absolute resolved paths for file locations, but relying on ./QCADesigner in the current directory
                command = ["./QCADesigner", str(input_file), "-o", str(output_file)]
                
                subprocess.run(command, check=True, capture_output=True)

                # Send back the contents of output.txt
                if output_file.exists():
                    with open(output_file, "rb") as f:
                        response_data = f.read()

                    self.send_response(200)
                    self.send_header("Content-Type", "text/plain")
                    self.send_header("Content-Length", str(len(response_data)))
                    self.end_headers()
                    self.wfile.write(response_data)
                else:
                    self.send_error(500, "Simulation succeeded, but output.txt was not generated.")

            except subprocess.CalledProcessError as e:
                error_msg = f"QCADesigner error:\n{e.stderr.decode('utf-8')}\n{e.stdout.decode('utf-8')}"
                self.send_error(500, error_msg)
            except FileNotFoundError:
                self.send_error(500, "Failed to start subprocess. Make sure ./QCADesigner exists in the directory from where the server is being run.")
            except Exception as e:
                self.send_error(500, f"Server error: {str(e)}")
        else:
            self.send_error(404, "Endpoint Not Found")

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
