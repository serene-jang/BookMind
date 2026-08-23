#!/usr/bin/env python3
"""BookMind 로컬 서버: 정적 파일 제공 + 알라딘 API 프록시.

브라우저에서 알라딘 API를 직접 호출하면 CORS/ORB 정책으로 차단되므로,
이 서버가 대신 알라딘 API를 호출하고 결과만 프론트엔드로 전달한다.
API 키는 .env 파일에서만 읽으며 프론트엔드 코드에는 노출되지 않는다.
"""
import json
import os
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = 8000
ALADIN_SEARCH_URL = "https://www.aladin.co.kr/ttb/api/ItemSearch.aspx"


def load_env():
    env = {}
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(env_path):
        with open(env_path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                env[key.strip()] = value.strip()
    return env


ENV = load_env()
ALADIN_API_KEY = ENV.get("ALADIN_API_KEY", "")


class BookMindHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path == "/api/search-book":
            self.handle_search(parsed)
            return

        super().do_GET()

    def handle_search(self, parsed):
        if not ALADIN_API_KEY:
            self.send_json(
                {"error": "서버에 ALADIN_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요."},
                status=500,
            )
            return

        query = urllib.parse.parse_qs(parsed.query).get("query", [""])[0].strip()

        if not query:
            self.send_json({"error": "검색어가 필요합니다."}, status=400)
            return

        params = {
            "ttbkey": ALADIN_API_KEY,
            "Query": query,
            "QueryType": "Title",
            "MaxResults": "10",
            "start": "1",
            "SearchTarget": "Book",
            "output": "js",
            "Version": "20131101",
        }
        url = f"{ALADIN_SEARCH_URL}?{urllib.parse.urlencode(params)}"

        try:
            with urllib.request.urlopen(url, timeout=8) as res:
                raw = res.read().decode("utf-8", errors="replace")
        except Exception as exc:
            self.send_json({"error": f"알라딘 API 호출 실패: {exc}"}, status=502)
            return

        try:
            data = json.loads(raw)
        except ValueError:
            data = {"error": "알라딘 응답을 해석할 수 없습니다.", "raw": raw[:300]}

        self.send_json(data)

    def send_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        pass


if __name__ == "__main__":
    with ThreadingHTTPServer(("", PORT), BookMindHandler) as httpd:
        print(f"BookMind 서버 실행 중: http://localhost:{PORT}")
        httpd.serve_forever()
