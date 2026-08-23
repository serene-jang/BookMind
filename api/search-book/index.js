const https = require('https');

const ALADIN_SEARCH_URL = 'https://www.aladin.co.kr/ttb/api/ItemSearch.aspx';

// ALADIN_API_KEY는 Static Web Apps 리소스의 애플리케이션 설정에서만 주입되며 코드에는 없다.
module.exports = async function (context, req) {
  const apiKey = process.env.ALADIN_API_KEY || '';
  const query = (req.query.query || '').trim();

  if (!apiKey) {
    sendJson(context, 500, { error: '서버에 ALADIN_API_KEY 설정이 없습니다.' });
    return;
  }

  if (!query) {
    sendJson(context, 400, { error: '검색어가 필요합니다.' });
    return;
  }

  const params = new URLSearchParams({
    ttbkey: apiKey,
    Query: query,
    QueryType: 'Title',
    MaxResults: '10',
    start: '1',
    SearchTarget: 'Book',
    output: 'js',
    Version: '20131101'
  });

  try {
    const data = await fetchJson(`${ALADIN_SEARCH_URL}?${params.toString()}`);
    sendJson(context, 200, data);
  } catch (err) {
    sendJson(context, 502, { error: `알라딘 API 호출 실패: ${err.message}` });
  }
};

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let raw = '';
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            resolve({ error: '알라딘 응답을 해석할 수 없습니다.', raw: raw.slice(0, 300) });
          }
        });
      })
      .on('error', reject);
  });
}

function sendJson(context, status, payload) {
  context.res = {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload)
  };
}
