/**
 * AUBE Chatbot — Shared Module
 * 
 * DOM 기반 실시간 pageContent 수집 + Gemini API 호출 + Contact Card
 * index.html과 notice.html 모두에서 동작하는 공용 챗봇 모듈
 * 
 * 요구사항:
 *   - 현재 페이지 DOM 콘텐츠를 읽어 답변
 *   - 웹앱 내용 변경 시 챗봇 답변도 자동 변경
 *   - 답변 불가 시 Contact Card 자동 노출
 *   - 다국어 지원 (ko, en, zh)
 *   - GA4 이벤트 연동
 */

(function () {
    'use strict';

    // ──────────────────────────────────────────────
    //  State
    // ──────────────────────────────────────────────
    let chatLang = 'ko';
    let isSending = false;
    let chatHistory = [];
    const MAX_HISTORY = 5;

    // Expose language change function to window for page-level syncing
    let isLangSyncing = false;
    window.changeChatbotLanguage = function (lang) {
        if (isLangSyncing) return;
        if (['ko', 'en', 'zh'].includes(lang) && lang !== chatLang) {
            isLangSyncing = true;
            try {
                changeChatLang(lang);
            } finally {
                isLangSyncing = false;
            }
        }
    };

    // ──────────────────────────────────────────────
    //  Multilingual UI Text
    // ──────────────────────────────────────────────
    const chatUI = {
        ko: {
            title: 'AUBE 안내 챗봇',
            subtitle: 'AI 매장 안내',
            placeholder: '궁금한 점을 입력하세요...',
            send: '전송',
            welcome: '안녕하세요! 오브래쉬 AUBE AI 안내 챗봇입니다.\n위치, 영업시간, 서비스, 예약 방법 등 이 페이지에 있는 내용을 안내해 드립니다.',
            quickActions: ['영업시간', '위치 안내', '서비스 안내', '예약 방법', 'WeChat 문의'],
            typing: '답변을 준비하고 있어요...',
            error: '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
            contactTitle: '📋 문의 안내',
            contactPhone: '전화 문의',
            contactWechat: 'WeChat 문의',
            contactWechatScan: 'QR 스캔으로 문의',
            contactInstagram: 'Instagram DM'
        },
        en: {
            title: 'AUBE Concierge',
            subtitle: 'AI Store Guide',
            placeholder: 'Ask me anything...',
            send: 'Send',
            welcome: 'Hello! I\'m the AUBE AI concierge.\nI can help you with information available on this page — location, hours, services, booking, and more.',
            quickActions: ['Business Hours', 'Location', 'Services', 'Booking', 'WeChat'],
            typing: 'Preparing an answer...',
            error: 'Sorry, something went wrong. Please try again in a moment.',
            contactTitle: '📋 Contact Us',
            contactPhone: 'Call',
            contactWechat: 'WeChat Inquiry',
            contactWechatScan: 'Scan QR to inquire',
            contactInstagram: 'Instagram DM'
        },
        zh: {
            title: 'AUBE 智能客服',
            subtitle: 'AI 门店向导',
            placeholder: '请输入您的问题...',
            send: '发送',
            welcome: '您好！我是AUBE专属AI客服。\n我可以为您解答本页面上的信息——位置、营业时间、服务、预约等。',
            quickActions: ['营业时间', '位置', '服务', '预约方法', '微信咨询'],
            typing: '正在准备回答...',
            error: '抱歉，出现了暂时性的错误。请稍后再试。',
            contactTitle: '📋 联系我们',
            contactPhone: '电话咨询',
            contactWechat: '微信咨询',
            contactWechatScan: '扫描二维码咨询',
            contactInstagram: 'Instagram 私信'
        }
    };

    // ──────────────────────────────────────────────
    //  Contact Info (extracted from DOM, with fallback)
    // ──────────────────────────────────────────────
    const contactDefaults = {
        phone: '010-7365-0623',
        instagram: 'https://www.instagram.com/aube_lash_/',
        wechatQR: 'wechat-qr.png'
    };

    // ──────────────────────────────────────────────
    //  DOM Content Collection
    // ──────────────────────────────────────────────
    function collectPageContent() {
        // Clone the body to work with without affecting the page
        const clone = document.body.cloneNode(true);

        // Remove elements that should NOT be part of page content
        const removeSelectors = [
            '.chatbot-button', '.chatbot-window',  // chatbot itself
            'script', 'style', 'noscript',           // scripts/styles
            '.leaf-shadow',                           // decorative overlays
            '[aria-hidden="true"]'                    // hidden elements
        ];

        removeSelectors.forEach(sel => {
            clone.querySelectorAll(sel).forEach(el => el.remove());
        });

        // Get clean text content
        let text = clone.innerText || clone.textContent || '';

        // Clean up excessive whitespace while preserving structure
        text = text
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\n');

        // Truncate if too long (Gemini context limit consideration)
        if (text.length > 6000) {
            text = text.substring(0, 6000) + '\n...(truncated)';
        }

        return text;
    }

    // ──────────────────────────────────────────────
    //  Language Detection
    // ──────────────────────────────────────────────
    function detectCurrentLang() {
        // Try to read from page-level language variables
        if (typeof window.pageLang === 'string') return window.pageLang;
        if (typeof window.currentLang === 'string') return window.currentLang;

        // Fallback: check document lang attribute
        const htmlLang = document.documentElement.lang;
        if (['ko', 'en', 'zh'].includes(htmlLang)) return htmlLang;

        return 'ko';
    }

    // ──────────────────────────────────────────────
    //  GA4 Event Helper
    // ──────────────────────────────────────────────
    function trackEvent(eventName, params) {
        if (typeof window.gtag === 'function') {
            window.gtag('event', eventName, params || {});
        }
    }

    // ──────────────────────────────────────────────
    //  Extract Contact Info from DOM
    // ──────────────────────────────────────────────
    function getContactInfo() {
        let phone = contactDefaults.phone;
        let instagram = contactDefaults.instagram;
        let wechatQR = contactDefaults.wechatQR;

        // Try to extract phone from DOM
        const phoneLink = document.querySelector('a[href^="tel:"]');
        if (phoneLink) {
            phone = phoneLink.href.replace('tel:', '');
        }

        // Try to extract Instagram link
        const instaLink = document.querySelector('a[href*="instagram.com"]');
        if (instaLink) {
            instagram = instaLink.href;
        }

        // Try to extract WeChat QR image
        const wechatImg = document.querySelector('.wechat-qr-area img, .wechat-qr-box img');
        if (wechatImg && wechatImg.src) {
            wechatQR = wechatImg.src;
        }

        return { phone, instagram, wechatQR };
    }

    // ──────────────────────────────────────────────
    //  Chat History Management
    // ──────────────────────────────────────────────
    function addToHistory(role, text) {
        chatHistory.push({ role, text });
        if (chatHistory.length > MAX_HISTORY * 2) {
            chatHistory = chatHistory.slice(-MAX_HISTORY * 2);
        }
    }

    function getHistoryForAPI() {
        return chatHistory.map(h => ({
            role: h.role,
            parts: [{ text: h.text }]
        }));
    }

    function resetHistory() {
        chatHistory = [];
    }

    // ──────────────────────────────────────────────
    //  UI: Inject Chatbot HTML
    // ──────────────────────────────────────────────
    function injectChatbotHTML() {
        // Don't inject if already present
        if (document.getElementById('aubeChatbotToggle')) return;

        const ui = chatUI[chatLang];

        const chatbotHTML = `
            <!-- AUBE Chatbot Button -->
            <button class="chatbot-button pulse" id="aubeChatbotToggle" aria-label="Open chatbot">💬</button>

            <!-- AUBE Chatbot Window -->
            <div class="chatbot-window" id="aubeChatbotWindow">
                <div class="chatbot-header">
                    <div>
                        <h4 id="aubeChatbotTitle">${ui.title}</h4>
                        <div class="chatbot-subtitle" id="aubeChatbotSubtitle">${ui.subtitle}</div>
                    </div>
                    <button class="chatbot-close" id="aubeChatbotClose" aria-label="Close chatbot">×</button>
                </div>
                <div class="chatbot-lang-selector" id="aubeChatbotLangSelector">
                    <button class="chatbot-lang-btn${chatLang === 'ko' ? ' active' : ''}" data-chatlang="ko">한국어</button>
                    <button class="chatbot-lang-btn${chatLang === 'en' ? ' active' : ''}" data-chatlang="en">English</button>
                    <button class="chatbot-lang-btn${chatLang === 'zh' ? ' active' : ''}" data-chatlang="zh">中文</button>
                </div>
                <div class="chatbot-messages" id="aubeChatbotMessages"></div>
                <div class="chatbot-input-area">
                    <input type="text" class="chatbot-input" id="aubeChatbotInput"
                        placeholder="${ui.placeholder}" autocomplete="off">
                    <button class="chatbot-send" id="aubeChatbotSendBtn">${ui.send}</button>
                </div>
            </div>
        `;

        // Append to body
        const wrapper = document.createElement('div');
        wrapper.id = 'aubeChatbotContainer';
        wrapper.innerHTML = chatbotHTML;
        document.body.appendChild(wrapper);

        // Bind events
        bindChatbotEvents();
    }

    // ──────────────────────────────────────────────
    //  UI: Bind Events
    // ──────────────────────────────────────────────
    function bindChatbotEvents() {
        // Toggle button
        document.getElementById('aubeChatbotToggle').addEventListener('click', toggleChatbot);

        // Close button
        document.getElementById('aubeChatbotClose').addEventListener('click', toggleChatbot);

        // Send button
        document.getElementById('aubeChatbotSendBtn').addEventListener('click', sendMessage);

        // Enter key
        document.getElementById('aubeChatbotInput').addEventListener('keypress', function (e) {
            if (e.key === 'Enter') sendMessage();
        });

        // Language buttons
        document.getElementById('aubeChatbotLangSelector').addEventListener('click', function (e) {
            const btn = e.target.closest('.chatbot-lang-btn');
            if (!btn) return;
            const lang = btn.getAttribute('data-chatlang');
            if (lang) changeChatLang(lang);
        });

        // Click on WeChat QR in contact card
        document.getElementById('aubeChatbotMessages').addEventListener('click', function (e) {
            if (e.target.closest('.contact-card-qr img')) {
                trackEvent('wechat_click', {
                    language: chatLang,
                    source: 'chatbot_contact_card'
                });
            }
        });
    }

    // ──────────────────────────────────────────────
    //  UI: Toggle Chatbot
    // ──────────────────────────────────────────────
    function toggleChatbot() {
        const win = document.getElementById('aubeChatbotWindow');
        const btn = document.getElementById('aubeChatbotToggle');
        const isOpening = !win.classList.contains('open');

        win.classList.toggle('open');

        // Remove pulse animation after first open
        btn.classList.remove('pulse');

        if (isOpening) {
            // Track GA4 event
            trackEvent('chatbot_open', {
                page_location: window.location.pathname,
                language: chatLang
            });

            // Initialize chat if empty
            if (document.getElementById('aubeChatbotMessages').children.length === 0) {
                initChat();
            }

            // Focus input
            setTimeout(() => {
                document.getElementById('aubeChatbotInput').focus();
            }, 300);
        }
    }

    // ──────────────────────────────────────────────
    //  UI: Change Chat Language
    // ──────────────────────────────────────────────
    function changeChatLang(lang) {
        if (lang === chatLang) return; // Prevent redundant update
        chatLang = lang;

        // Update active button
        document.querySelectorAll('#aubeChatbotLangSelector .chatbot-lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-chatlang') === lang);
        });

        // Update UI text
        const ui = chatUI[lang];
        document.getElementById('aubeChatbotTitle').textContent = ui.title;
        document.getElementById('aubeChatbotSubtitle').textContent = ui.subtitle;
        document.getElementById('aubeChatbotInput').placeholder = ui.placeholder;
        document.getElementById('aubeChatbotSendBtn').textContent = ui.send;

        // Clear messages and re-initialize
        document.getElementById('aubeChatbotMessages').innerHTML = '';
        resetHistory();
        initChat();
    }

    // ──────────────────────────────────────────────
    //  UI: Init Chat (Welcome + Quick Actions)
    // ──────────────────────────────────────────────
    function initChat() {
        const ui = chatUI[chatLang];
        addBotMessage(ui.welcome);

        // Quick action buttons
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'chatbot-quick-actions';
        ui.quickActions.forEach(action => {
            const btn = document.createElement('button');
            btn.className = 'chatbot-quick-btn';
            btn.textContent = action;
            btn.addEventListener('click', () => sendMessageText(action));
            actionsDiv.appendChild(btn);
        });
        document.getElementById('aubeChatbotMessages').appendChild(actionsDiv);
    }

    // ──────────────────────────────────────────────
    //  UI: Message Rendering
    // ──────────────────────────────────────────────
    function addBotMessage(text) {
        const messagesDiv = document.getElementById('aubeChatbotMessages');
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chatbot-message bot';
        msgDiv.textContent = text;
        messagesDiv.appendChild(msgDiv);
        scrollToBottom();
        return msgDiv;
    }

    function addUserMessage(text) {
        const messagesDiv = document.getElementById('aubeChatbotMessages');
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chatbot-message user';
        msgDiv.textContent = text;
        messagesDiv.appendChild(msgDiv);
        scrollToBottom();
    }

    function addTypingIndicator() {
        const messagesDiv = document.getElementById('aubeChatbotMessages');
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chatbot-message typing';
        msgDiv.id = 'aubeChatbotTyping';
        msgDiv.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
        messagesDiv.appendChild(msgDiv);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        const el = document.getElementById('aubeChatbotTyping');
        if (el) el.remove();
    }

    function scrollToBottom() {
        const messagesDiv = document.getElementById('aubeChatbotMessages');
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    // ──────────────────────────────────────────────
    //  UI: Contact Card
    // ──────────────────────────────────────────────
    function renderContactCard() {
        const messagesDiv = document.getElementById('aubeChatbotMessages');
        const ui = chatUI[chatLang];
        const contact = getContactInfo();

        const card = document.createElement('div');
        card.className = 'chatbot-contact-card';
        card.innerHTML = `
            <h5>${ui.contactTitle}</h5>
            <div class="contact-card-item">
                <span class="contact-icon">📞</span>
                <span>${ui.contactPhone}: <a href="tel:${contact.phone}">${contact.phone}</a></span>
            </div>
            <div class="contact-card-item">
                <span class="contact-icon">📷</span>
                <span><a href="${contact.instagram}" target="_blank" rel="noopener noreferrer">${ui.contactInstagram}</a></span>
            </div>
            <div class="contact-card-qr">
                <p>💬 ${ui.contactWechat}</p>
                <p style="font-size:0.72rem;color:#a39281;">${ui.contactWechatScan}</p>
                <img src="${contact.wechatQR}" alt="WeChat QR Code">
            </div>
        `;

        messagesDiv.appendChild(card);
        scrollToBottom();

        // Track GA4 event
        trackEvent('chatbot_contact_conversion', {
            language: chatLang,
            page_location: window.location.pathname
        });
    }

    // ──────────────────────────────────────────────
    //  API: Send Message
    // ──────────────────────────────────────────────
    function sendMessage() {
        const input = document.getElementById('aubeChatbotInput');
        const text = input.value.trim();
        if (text) {
            input.value = '';
            sendMessageText(text);
        }
    }

    async function sendMessageText(text) {
        if (isSending || !text.trim()) return;
        isSending = true;

        addUserMessage(text);
        addToHistory('user', text);
        addTypingIndicator();

        const sendBtn = document.getElementById('aubeChatbotSendBtn');
        sendBtn.disabled = true;

        // Track GA4 event
        trackEvent('chatbot_message', {
            language: chatLang,
            page_type: window.location.pathname.includes('notice') ? 'notice' : 'main'
        });

        try {
            // Collect current page content (real-time DOM)
            const pageContent = collectPageContent();

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    lang: chatLang,
                    pageContent: pageContent,
                    history: getHistoryForAPI()
                })
            });

            removeTypingIndicator();

            let data = null;
            try {
                data = await response.json();
            } catch (jsonErr) {
                // Response body is not valid JSON
            }

            if (!response.ok) {
                // If backend returned a valid fallback JSON answer under 500/502 status, display it
                if (data && (data.answer || data.reply)) {
                    const fallbackAnswer = data.answer || data.reply;
                    addBotMessage(fallbackAnswer);
                    addToHistory('model', fallbackAnswer);
                    if (data.needsContact === true) {
                        renderContactCard();
                    }
                    return;
                }
                throw new Error('API Error: ' + response.status);
            }

            // Handle structured response
            let answer = '';
            let needsContact = false;

            if (data.answer) {
                answer = data.answer;
                needsContact = data.needsContact === true;
            } else if (data.reply) {
                // Backward compatibility with old API format
                answer = data.reply;
            } else {
                answer = chatUI[chatLang].error;
            }

            addBotMessage(answer);
            addToHistory('model', answer);

            // Show Contact Card if needed
            if (needsContact) {
                renderContactCard();
            }

        } catch (err) {
            removeTypingIndicator();
            addBotMessage(chatUI[chatLang].error);
            console.error('AUBE Chatbot error:', err);
        } finally {
            isSending = false;
            sendBtn.disabled = false;
            document.getElementById('aubeChatbotInput').focus();
        }
    }

    // ──────────────────────────────────────────────
    //  Initialize
    // ──────────────────────────────────────────────
    function init() {
        // Detect current language
        chatLang = detectCurrentLang();

        // Inject chatbot HTML into page
        injectChatbotHTML();
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM already loaded (script loaded with defer or at bottom)
        // Small delay to ensure page scripts have run first
        setTimeout(init, 100);
    }

})();
