// GET /api-docs — Swagger UI 페이지 (swagger-ui-dist CDN 사용, npm 의존성 없음).
// /api/openapi 스펙을 불러와 렌더링. withCredentials=true 로 NextAuth 세션 쿠키를 함께 전송하므로,
// 같은 브라우저에서 로그인되어 있으면 보호된 엔드포인트도 "Try it out"으로 호출 가능.

const SWAGGER_VERSION = '5.17.14'

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MP4 API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui.css" />
  <style>
    body { margin: 0; background: #fafafa; }
    .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui-bundle.js" crossorigin></script>
  <script src="https://unpkg.com/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui-standalone-preset.js" crossorigin></script>
  <script>
    window.onload = function () {
      window.ui = SwaggerUIBundle({
        url: '/api/openapi',
        dom_id: '#swagger-ui',
        deepLinking: true,
        withCredentials: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: 'StandaloneLayout',
        tryItOutEnabled: true,
      });
    };
  </script>
</body>
</html>`

export function GET() {
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
