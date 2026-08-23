import json
import os
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler

ALADIN_SEARCH_URL = "https://www.aladin.co.kr/ttb/api/ItemSearch.aspx"


class handler(BaseHTTPRequestHandler):
    """Vercel Python 서버리스 함수: 알라딘 도서 검색 프록시.

    ALADIN_API_KEY는 Vercel 프로젝트의 환경변수로만 설정하며 코드/저장소에는 없다.
    """

    def do_GET(self):
        api_key = os.environ.get("ALADIN_API_KEY", "")
        parsed = urllib.parse.urlparse(self.path)
        query = urllib.parse.parse_qs(parsed.query).get("query", [""])[0].strip()

        if not api_key:
            self.send_json({"error": "서버에 ALADIN_API_KEY 환경변수가 설정되지 않았습니다."}, 500)
            return

        if not query:
            self.send_json({"error": "검색어가 필요합니다."}, 400)
            return

        params = {
            "ttbkey": api_key,
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
            self.send_json({"error": f"알라딘 API 호출 실패: {exc}"}, 502)
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
