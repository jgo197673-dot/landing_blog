/**
 * AUBE Gemini AI 챗봇 — Vercel Serverless Function
 * 
 * 환경변수 설정 (Vercel Dashboard → Settings → Environment Variables):
 *   GEMINI_API_KEY   = Google AI Studio에서 발급받은 API Key
 *   GEMINI_MODEL     = 사용할 모델명 (기본값: gemini-2.5-flash)
 * 
 * 프론트엔드에서 POST /api/chat 으로 요청:
 *   { message: string, lang: 'ko'|'en'|'zh', context: string }
 */

export default async function handler(req, res) {
    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY is not set');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    // 모델명은 환경변수로 분리 — 추후 gemini-2.5-pro 등으로 쉽게 변경 가능
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    const { message, lang = 'ko', context = '' } = req.body || {};

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ error: 'Message is required' });
    }

    // 언어별 응답 지시
    const langInstruction = {
        ko: '한국어로 답변해주세요.',
        en: 'Please respond in English.',
        zh: '请用中文回答。'
    };

    const fallbackMsg = {
        ko: '정확한 내용은 매장으로 직접 문의해주세요. (전화: 010-7365-0623)',
        en: 'For accurate information, please contact the store directly. (Phone: 010-7365-0623)',
        zh: '如需准确信息，请直接联系门店。(电话: 010-7365-0623)'
    };

    // 시스템 프롬프트: AUBE 매장 정보 + 안내 데이터 포함
    const systemPrompt = `당신은 제주도에 위치한 뷰티샵 "오브래쉬 AUBE"의 전용 AI 안내 챗봇입니다.

## 매장 기본 정보
- 매장명: 오브래쉬 AUBE
- 주소: 제주특별자치도 제주시 연북로 158 2층
- 전화: 010-7365-0623
- 운영시간: 오전 10시부터 운영, 예약제 중심
- 위치 팁: 연동 중앙버스정류장에서 도보 약 3분

## 주요 서비스
- 속눈썹 펌
- 속눈썹 연장
- LED 포인트 연장
- 뷰티 케어

## 예약/문의
- WeChat 문의 가능
- 전화 문의: 010-7365-0623
- 100% 예약제 운영, 당일 예약 문의 가능

## 주차
- 전용 주차장은 없으나, 건물 앞 공영주차장 이용 가능 (1시간 무료)

## 매장 이용 안내
- 큰 소리의 대화 자제
- 휴대전화 통화 자제
- 다른 고객을 위한 편안한 분위기 유지 협조

## CCTV 안내
- 고객 안전을 위해 CCTV 운영 중

## 현재 페이지 공지/안내 데이터
${context}

## 응답 규칙
1. ${langInstruction[lang] || langInstruction.ko}
2. 위 정보에 포함된 내용만 답변하세요.
3. 확실하지 않거나 위 정보에 없는 내용은 절대 추측하지 마세요.
4. 모르는 내용은 반드시 다음과 같이 답변하세요: "${fallbackMsg[lang] || fallbackMsg.ko}"
5. 친절하고 전문적인 뷰티샵 직원처럼 답변하세요.
6. 답변은 간결하게 2~4문장 이내로 해주세요.
7. 가격 관련 질문은 정확한 금액을 언급하지 말고, 매장 문의를 안내하세요.`;

    try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const geminiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: message }]
                    }
                ],
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                },
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 500,
                    topP: 0.8,
                    topK: 20
                },
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
                ]
            })
        });

        if (!geminiResponse.ok) {
            const errorData = await geminiResponse.text();
            console.error('Gemini API error:', geminiResponse.status, errorData);
            return res.status(502).json({ 
                reply: fallbackMsg[lang] || fallbackMsg.ko 
            });
        }

        const data = await geminiResponse.json();
        
        // Gemini 응답에서 텍스트 추출
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!reply) {
            console.error('No reply from Gemini:', JSON.stringify(data));
            return res.status(200).json({ 
                reply: fallbackMsg[lang] || fallbackMsg.ko 
            });
        }

        return res.status(200).json({ reply: reply.trim() });
    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ 
            reply: fallbackMsg[lang] || fallbackMsg.ko 
        });
    }
}
