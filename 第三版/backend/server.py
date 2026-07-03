from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs, urlparse
import json
import mimetypes
import threading
from datetime import datetime, timezone
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
LOG_FILE = DATA_DIR / "error_logs.json"
LOG_LOCK = threading.Lock()

REQUIRED_ATTEMPT_FIELDS = {
    "session_id",
    "target_pinyin",
    "user_input",
    "is_correct",
    "error_type",
    "module_id",
}


def ensure_log_file():
    DATA_DIR.mkdir(exist_ok=True)
    if not LOG_FILE.exists():
        LOG_FILE.write_text("[]", encoding="utf-8")


def read_logs():
    ensure_log_file()
    try:
        return json.loads(LOG_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        backup = LOG_FILE.with_suffix(f".corrupt-{datetime.now().strftime('%Y%m%d%H%M%S')}.json")
        LOG_FILE.replace(backup)
        LOG_FILE.write_text("[]", encoding="utf-8")
        return []


def append_log(attempt):
    clean = {key: attempt.get(key) for key in attempt.keys()}
    clean["id"] = str(uuid4())
    clean["created_at"] = datetime.now(timezone.utc).isoformat()

    with LOG_LOCK:
        logs = read_logs()
        logs.append(clean)
        LOG_FILE.write_text(json.dumps(logs, ensure_ascii=False, indent=2), encoding="utf-8")
    return clean


class PinyinPalHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        print("%s - - [%s] %s" % (self.address_string(), self.log_date_time_string(), format % args))

    def send_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            self.send_json({"ok": True, "app": "Pinyin Pal"})
            return

        if parsed.path == "/api/attempts":
            query = parse_qs(parsed.query)
            session_id = query.get("session_id", [None])[0]
            logs = read_logs()
            if session_id:
                logs = [item for item in logs if item.get("session_id") == session_id]
            self.send_json({"attempts": logs})
            return

        self.serve_static(parsed.path)

    def do_POST(self):
        if urlparse(self.path).path != "/api/attempts":
            self.send_json({"error": "Not found"}, status=404)
            return

        length = int(self.headers.get("Content-Length", 0))
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except json.JSONDecodeError:
            self.send_json({"error": "Invalid JSON"}, status=400)
            return

        missing = sorted(field for field in REQUIRED_ATTEMPT_FIELDS if field not in payload)
        if missing:
            self.send_json({"error": "Missing required fields", "fields": missing}, status=400)
            return

        saved = append_log(payload)
        self.send_json({"attempt": saved}, status=201)

    def serve_static(self, request_path):
        if request_path in ("", "/"):
            request_path = "/frontend/index.html"

        target = (ROOT / request_path.lstrip("/")).resolve()
        if ROOT not in target.parents and target != ROOT:
            self.send_json({"error": "Forbidden"}, status=403)
            return

        if not target.exists() or not target.is_file():
            self.send_json({"error": "Not found"}, status=404)
            return

        content_type = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
        body = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def run(host="127.0.0.1", port=8000):
    ensure_log_file()
    server = ThreadingHTTPServer((host, port), PinyinPalHandler)
    print(f"Pinyin Pal MVP running at http://{host}:{port}")
    print(f"Writing pronunciation logs to {LOG_FILE}")
    server.serve_forever()


if __name__ == "__main__":
    run()
