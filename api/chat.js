/**
 * AUBE Gemini AI 챗봇 — Vercel Serverless Function
 * 
 * ★ DOM 기반 pageContent 전용 — 하드코딩된 매장 정보 없음
 * 
 * 환경변수 설정 (Vercel Dashboard → Settings → Environment Variables):
 *   GEMINI_API_KEY   = Google AI Studio에서 발급받은 API Key
 *   GEMINI_MODEL     = 사용할 모델명 (기본값: gemini-2.5-flash)
 * 
 * 프론트엔드에서 POST /api/chat 으로 요청:
 *   { message: string, lang: 'ko'|'en'|'zh', pageContent: string, history?: array }
 * 
 * 응답 형식:
 *   { answer: string, needsContact: boolean }
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
        return res.status(500).json({
            answer: 'Server configuration error. Please contact the store directly.',
            needsContact: true
        });
    }

    // 모델명은 환경변수로 분리 — 추후 gemini-2.5-pro 등으로 쉽게 변경 가능
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    const { message, lang = 'ko', pageContent = '', history = [] } = req.body || {};

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ error: 'Message is required' });
    }

    // ──────────────────────────────────────────────
    //  언어별 응답 지시
    // ──────────────────────────────────────────────
    const langInstruction = {
        ko: '한국어로 답변해주세요.',
        en: 'Please respond in English.',
        zh: '请用中文回答。'
    };

    const fallbackMsg = {
        ko: '정확한 내용은 매장으로 직접 문의해주세요.',
        en: 'For accurate information, please contact the store directly.',
        zh: '如需准确信息，请直接联系门店。'
    };

    // ──────────────────────────────────────────────
    //  시스템 프롬프트 — pageContent 전용
    //  ★ 매장 정보 하드코딩 없음
    //  ★ 프론트에서 전달받은 pageContent만 사용
    // ──────────────────────────────────────────────
    const systemPrompt = `You are the official multilingual customer guide for AUBE (오브래쉬), a beauty salon in Jeju, South Korea.

## Your Knowledge Source
Your ONLY source of information is the "Page Content" provided below. This content is extracted from the current webpage the customer is viewing.

## Page Content
${pageContent || '(No page content provided)'}

## Response Rules
1. ${langInstruction[lang] || langInstruction.ko}
2. Answer ONLY based on the Page Content above. This is your single source of truth.
3. Do NOT guess, assume, or invent any information.
4. Do NOT generate prices, fees, or cost estimates.
5. Do NOT generate policies or rules not explicitly stated in Page Content.
6. Do NOT generate service details not present in Page Content.
7. Keep responses concise and helpful (2-4 sentences).
8. Be warm and professional, like a premium beauty salon concierge.
9. When relevant, guide users to booking, location, WeChat, Instagram, or notice information available in the Page Content.
10. If the customer's question CANNOT be answered from the Page Content, you MUST set needsContact to true.

## Response Format
You MUST respond in this exact JSON format and nothing else:
{"answer": "Your helpful response here", "needsContact": false}

- Set needsContact to false when you CAN answer from Page Content.
- Set needsContact to true when you CANNOT answer from Page Content (e.g., specific pricing, unavailable info, policy details not on page).
- When needsContact is true, your answer should politely explain that the information is not available on the current page and suggest contacting the store directly.
  - Korean: "해당 내용은 현재 안내 페이지에서 확인되지 않습니다. 정확한 상담을 위해 AUBE로 직접 문의해 주세요."
  - English: "This information is not available on the current page. For accurate assistance, please contact AUBE directly."
  - Chinese: "该信息在当前页面上无法确认。如需准确咨询，请直接联系AUBE。"

IMPORTANT: Your entire response must be valid JSON. Do not include any text before or after the JSON object.`;

    try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        // Build contents array with history + current message
        const contents = [];

        // Add conversation history (limited)
        if (Array.isArray(history) && history.length > 0) {
            const recentHistory = history.slice(-MAX_HISTORY_ITEMS);
            recentHistory.forEach(h => {
                if (h.role && h.parts) {
                    contents.push({
                        role: h.role,
                        parts: h.parts
                    });
                }
            });
        }

        // Add current user message
        contents.push({
            role: 'user',
            parts: [{ text: message }]
        });

        const geminiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: contents,
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                },
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 500,
                    topP: 0.8,
                    topK: 20,
                    responseMimeType: 'application/json'
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
                answer: fallbackMsg[lang] || fallbackMsg.ko,
                needsContact: true
            });
        }

        const data = await geminiResponse.json();

        // Gemini 응답에서 텍스트 추출
        const rawReply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawReply) {
            console.error('No reply from Gemini:', JSON.stringify(data));
            return res.status(200).json({
                answer: fallbackMsg[lang] || fallbackMsg.ko,
                needsContact: true
            });
        }

        // Parse JSON response from Gemini
        try {
            const parsed = JSON.parse(rawReply.trim());
            return res.status(200).json({
                answer: (parsed.answer || '').trim() || fallbackMsg[lang] || fallbackMsg.ko,
                needsContact: parsed.needsContact === true
            });
        } catch (parseErr) {
            // If Gemini didn't return valid JSON, use raw text as answer
            console.warn('Gemini response was not valid JSON, using raw text:', rawReply);
            return res.status(200).json({
                answer: rawReply.trim(),
                needsContact: false
            });
        }

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({
            answer: fallbackMsg[lang] || fallbackMsg.ko,
            needsContact: true
        });
    }
}

// Maximum history items to include in API call
const MAX_HISTORY_ITEMS = 10;
