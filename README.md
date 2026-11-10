# chat — 최소형 실시간 채팅

흑백 단일 채팅방입니다. 둥근 모서리, 그림자, 그라데이션, 장식 UI를 사용하지 않습니다.

## 구성
- GitHub Pages: 정적 프론트엔드
- Cloudflare Workers + Durable Objects(SQLite): WebSocket 실시간 채팅 및 기록
- 관리자: 비밀번호 로그인 후 전체 채팅 초기화

## 1. Cloudflare Worker 배포
1. `worker` 폴더에서 `npm create cloudflare@latest`를 실행할 필요 없이 Wrangler를 설치합니다.
2. `worker` 폴더에서 `npx wrangler login`
3. `npx wrangler secret put ADMIN_PASSWORD` 실행 후 관리자 비밀번호 입력
4. `npx wrangler secret put SESSION_SECRET` 실행 후 충분히 긴 임의의 비밀 문자열 입력
5. `wrangler.toml`의 `compatibility_date`는 현재 날짜로 유지하거나 최신 날짜로 갱신합니다.
6. `npx wrangler deploy`

배포 주소 예: `https://minimal-chat-api.<계정>.workers.dev`

## 2. 프론트엔드 설정
`config.js`의 `API_BASE`를 실제 Worker 주소로 변경합니다.

## 3. GitHub Pages
1. GitHub에서 새 저장소를 만들고 이 폴더의 파일을 업로드합니다.
2. 저장소 Settings → Pages → Build and deployment에서 GitHub Actions를 선택합니다.
3. `main` 브랜치에 push하면 Pages가 배포됩니다.

## 4. 내 도메인(.한국 포함) 연결
1. GitHub 저장소 Settings → Pages → Custom domain에 도메인을 입력합니다.
2. 도메인 등록기관의 DNS에서 GitHub Pages가 안내하는 A/AAAA 또는 CNAME 레코드를 설정합니다.
3. `.한국` 도메인은 DNS 관리 화면에서 퓨니코드(Punycode)로 표시될 수 있습니다. 도메인 등록기관이 제공하는 변환값을 사용합니다.
4. GitHub Pages의 Enforce HTTPS를 활성화합니다.
5. `worker/wrangler.toml`에 `ALLOWED_ORIGIN` 변수를 직접 추가하거나 Worker 환경변수로 설정합니다. 값은 `https://실제-도메인`입니다. `www`를 별도로 사용하면 그 호스트도 허용 정책에 반영해야 합니다.

예시로 Worker의 환경변수에 `ALLOWED_ORIGIN=https://xn--...` 형식의 실제 오리진을 설정합니다. 임의의 퓨니코드를 추측하지 마세요.

## 주의
- 관리자 비밀번호와 `SESSION_SECRET`은 절대 프론트엔드 파일이나 GitHub 저장소에 넣지 마세요. Worker Secrets로만 저장합니다.
- `config.js`에는 공개되어도 되는 Worker 주소만 둡니다.
- 현재 구현은 한 개의 전역 채팅방이며 최근 300개 메시지를 저장합니다.
- 닉네임은 사용자 입력값이며 계정 인증은 제공하지 않습니다. 공개 서비스로 운영하기 전에는 스팸 방지, 전송 빈도 제한, 신고/차단 정책을 추가하는 것이 좋습니다.
