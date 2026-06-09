# 오브래쉬 AUBE — 외국인 고객 응대용 안내 웹앱

제주도 속눈썹 펌 & LED 포인트 연장 전문샵 **AUBE**의 다국어 안내 웹사이트입니다.

## 📁 프로젝트 구조

```
AUBE/
├── index.html          # 메인 페이지 (소개, WeChat, 안내, 챗봇)
├── notice.html         # Notice / 안내문 / 公告 페이지
├── blog1.html          # (기존 블로그 — 레거시, notice.html로 대체됨)
├── chatbot.js          # ★ Gemini AI 챗봇 공용 모듈 (DOM 기반)
├── chatbot.css         # ★ 챗봇 전용 스타일 (Contact Card 포함)
├── api/
│   └── chat.js         # Gemini AI 챗봇 Vercel Serverless Function
├── styles.css          # 외부 CSS (레거시)
├── script.js           # 외부 JS (레거시)
├── aube-logo.png       # 로고 이미지
├── hero-bg.jpg         # 히어로 배경 이미지
├── wechat-qr.png       # WeChat QR 코드
├── vercel.json         # Vercel 배포 설정
├── .env.example        # 환경변수 템플릿
├── .gitignore
└── README.md
```

## 🌐 지원 언어

- 🇰🇷 한국어
- 🇺🇸 English
- 🇨🇳 中文

## 🤖 Gemini AI 챗봇

챗봇은 **Gemini 2.5 Flash** 모델을 사용하며, Vercel Serverless Function을 통해 API Key가 프론트엔드에 노출되지 않습니다.

### ★ DOM 기반 실시간 답변

챗봇은 **현재 페이지의 DOM 콘텐츠를 실시간으로 수집**하여 Gemini에 전달합니다.

- 웹앱 내용을 수정하면 **코드 변경 없이** 챗봇 답변이 자동으로 변경됩니다.
- 하드코딩된 FAQ나 매장 정보가 없습니다.
- 메인 페이지와 안내문 페이지 모두에서 동일한 챗봇이 동작합니다.

### 챗봇이 답변 가능한 주제
- 위치 / 영업시간
- 예약 방법
- WeChat 문의
- 서비스 안내
- 주차 안내
- 매장 이용 안내
- CCTV 안내
- Notice 내용
- 페이지에 표시된 모든 내용

### 답변 불가 시 Contact Card

페이지에 없는 정보(가격, 세부 시술 등)를 질문하면:
1. "현재 페이지에서 확인되지 않습니다" 안내
2. **Contact Card 자동 표시** — 전화, WeChat QR, Instagram 링크

### 모델 변경
환경변수 `GEMINI_MODEL`을 변경하면 됩니다:
```
GEMINI_MODEL=gemini-2.5-pro    # Pro 모델로 변경
```

## 📊 GA4 (Google Analytics 4)

### GA4 Measurement ID 설정

1. [Google Analytics](https://analytics.google.com/) 에서 GA4 속성 생성
2. **관리 → 데이터 스트림 → 측정 ID** 확인 (예: `G-ABC123DEF4`)
3. `index.html`과 `notice.html`에서 `G-XXXXXXXXXX`를 실제 ID로 교체:

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC123DEF4"></script>
```

### 수집 이벤트

| 이벤트 | 트리거 | 파라미터 |
|--------|--------|----------|
| `page_view` | 페이지 로드 (자동) | — |
| `chatbot_open` | 챗봇 버튼 클릭 | `page_location`, `language` |
| `chatbot_message` | 메시지 전송 | `language`, `page_type` |
| `chatbot_contact_conversion` | Contact Card 노출 | `language` |
| `booking_click` | 네이버 예약 클릭 | `language` |
| `instagram_click` | Instagram 클릭 | `language` |
| `wechat_click` | WeChat 관련 클릭 | `language` |
| `xiaohongshu_click` | 小红书 클릭 | `language` |

### GA4 이벤트 확인 방법

1. [GA4 DebugView](https://analytics.google.com/) 사용
2. Chrome 확장 프로그램: [Google Analytics Debugger](https://chrome.google.com/webstore/detail/jnkmfdileelhofjcijamephohjechhna)
3. DevTools → Network → `collect?` 요청 필터링

## 🚀 배포 방법 (Vercel)

### 1. Vercel에 프로젝트 연결
```bash
# Vercel CLI 설치 (이미 설치된 경우 생략)
npm i -g vercel

# 프로젝트 배포
vercel
```

### 2. 환경변수 설정
Vercel Dashboard → **Settings** → **Environment Variables**:

| 변수명 | 값 | 설명 |
|--------|-----|------|
| `GEMINI_API_KEY` | `AIza...` | [Google AI Studio](https://aistudio.google.com/apikey)에서 발급 |
| `GEMINI_MODEL` | `gemini-2.5-flash` | 사용할 모델 (선택, 기본값: gemini-2.5-flash) |

### 3. 재배포
환경변수 설정 후 **Deployments** → **Redeploy** 클릭

## 🧪 테스트 방법

### 로컬 테스트 (Vercel CLI)

```bash
# .env 파일 생성
cp .env.example .env
# GEMINI_API_KEY를 실제 값으로 수정

# Vercel dev 서버 실행
npx vercel dev
# → http://localhost:3000
```

### 테스트 체크리스트

| # | 테스트 항목 | 방법 |
|---|------------|------|
| 1 | 메인 페이지 챗봇 | `/` → 우측 하단 💬 버튼 클릭 |
| 2 | 안내문 페이지 챗봇 | `/notice.html` → 동일한 챗봇 표시 확인 |
| 3 | 한국어 질문 | "영업시간이 어떻게 되나요?" → 페이지 기반 답변 |
| 4 | 영어 질문 | 언어 전환 후 "What are the business hours?" |
| 5 | 중국어 질문 | 언어 전환 후 "营业时间是什么？" |
| 6 | 존재하는 정보 | "위치가 어디에요?" → 정상 답변 |
| 7 | 존재하지 않는 정보 | "가격이 얼마에요?" → Contact Card 표시 |
| 8 | Contact Card | 전화번호, WeChat QR, Instagram 링크 확인 |
| 9 | API Key 보안 | DevTools → Network → 프론트 요청에 API Key 없음 |
| 10 | 모바일 반응형 | DevTools 모바일 뷰에서 챗봇 정상 표시 |
| 11 | GA4 이벤트 | DevTools → Network → gtag 요청 확인 |
| 12 | 기존 UI 유지 | 챗봇 외 모든 요소 동일하게 동작 |
| 13 | 콘텐츠 자동 반영 | 페이지 텍스트 수정 → 챗봇 답변 자동 변경 |

## 📱 WeChat QR 코드 교체 방법

1. QR 코드 이미지를 `wechat-qr.png` 파일명으로 프로젝트 루트에 저장
2. 자동으로 메인/안내문 페이지 + 챗봇 Contact Card에 반영

## 📕 Xiaohongshu(小红书) URL 교체 방법

`index.html`과 `notice.html`에서 `href="#"` 부분을 실제 URL로 교체:
```html
<!-- 변경 전 -->
<a href="#" class="social-btn xiaohongshu" ...>

<!-- 변경 후 -->
<a href="https://www.xiaohongshu.com/user/profile/실제ID" class="social-btn xiaohongshu" ...>
```

## 🔧 로컬 개발

정적 HTML이므로 `index.html`을 브라우저에서 직접 열면 됩니다.

> ⚠️ 로컬에서는 Gemini 챗봇 API(`/api/chat`)가 동작하지 않습니다.
> `npx vercel dev`로 실행하거나 Vercel에 배포한 후 테스트하세요.

## 📝 라이선스

© 2025 AUBE. All rights reserved.
