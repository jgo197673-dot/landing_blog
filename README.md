# 오브래쉬 AUBE — 외국인 고객 응대용 안내 웹앱

제주도 속눈썹 펌 & LED 포인트 연장 전문샵 **AUBE**의 다국어 안내 웹사이트입니다.

## 📁 프로젝트 구조

```
AUBE/
├── index.html          # 메인 페이지 (소개, WeChat, 안내, 챗봇)
├── notice.html         # Notice / 안내문 / 公告 페이지
├── blog1.html          # (기존 블로그 — 레거시, notice.html로 대체됨)
├── api/
│   └── chat.js         # Gemini AI 챗봇 Vercel Serverless Function
├── styles.css          # 외부 CSS (레거시)
├── script.js           # 외부 JS (레거시)
├── aube-logo.png       # 로고 이미지
├── hero-bg.jpg         # 히어로 배경 이미지
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

### 챗봇이 답변 가능한 주제
- 위치 / 영업시간
- 예약 방법
- WeChat 문의
- 서비스 안내
- 주차 안내
- 매장 이용 안내
- CCTV 안내
- Notice 내용

### 모델 변경
환경변수 `GEMINI_MODEL`을 변경하면 됩니다:
```
GEMINI_MODEL=gemini-2.5-pro    # Pro 모델로 변경
```

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

## 📱 WeChat QR 코드 교체 방법

1. QR 코드 이미지를 `wechat-qr.png` 파일명으로 프로젝트 루트에 저장
2. `index.html`에서 `wechat-qr-placeholder` div를 다음으로 교체:
   ```html
   <img src="wechat-qr.png" alt="WeChat QR Code">
   ```
3. `notice.html`에서도 동일하게 교체
4. WeChat ID 텍스트를 실제 ID로 업데이트

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
> Vercel에 배포한 후 테스트하세요.

## 📝 라이선스

© 2025 AUBE. All rights reserved.
