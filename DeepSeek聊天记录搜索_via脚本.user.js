// ==UserScript==
// @name         DeepSeek 聊天记录搜索
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  为DeepSeek聊天添加搜索功能，支持关键词搜索历史对话
// @author       You
// @match        https://chat.deepseek.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // 添加样式
    GM_addStyle(`
        /* DeepSeek 聊天记录搜索插件样式 */
        .ds-search-button {
            position: fixed;
            top: 80px;
            left: 300px;
            z-index: 9999;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 50%;
            width: 48px;
            height: 48px;
            padding: 0;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
        }

        .ds-search-button:hover {
            transform: scale(1.1);
            box-shadow: 0 4px 16px rgba(77, 107, 254, 0.3);
            border-color: #4d6bfe;
        }

        .ds-search-button:active {
            transform: scale(0.95);
        }

        /* 搜索模态框 */
        .ds-search-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        /* 遮罩层 */
        .ds-modal-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
        }

        /* 模态框内容 */
        .ds-modal-content {
            position: relative;
            width: 90%;
            max-width: 700px;
            max-height: 80vh;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            display: flex;
            flex-direction: column;
            animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }

        /* 模态框头部 */
        .ds-modal-header {
            padding: 20px 24px;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .ds-modal-header h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }

        /* 头部操作按钮容器 */
        .ds-header-actions {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        /* 重新加载按钮 */
        .ds-reload-btn {
            background: none;
            border: none;
            color: #6b7280;
            cursor: pointer;
            padding: 0;
            width: 32px;
            height: 32px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }

        .ds-reload-btn:hover {
            background: #f3f4f6;
            color: #667eea;
        }

        .ds-reload-btn:disabled {
            cursor: not-allowed;
            opacity: 0.5;
        }

        /* 旋转动画 */
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }

        /* 关闭按钮 */
        .ds-close-btn {
            background: none;
            border: none;
            font-size: 24px;
            color: #6b7280;
            cursor: pointer;
            padding: 0;
            width: 32px;
            height: 32px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }

        .ds-close-btn:hover {
            background: #f3f4f6;
            color: #374151;
        }

        /* 搜索容器 */
        .ds-search-container {
            padding: 20px 24px;
            border-bottom: 1px solid #e5e7eb;
        }

        /* 搜索输入框 */
        .ds-search-input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e5e7eb;
            border-radius: 10px;
            font-size: 15px;
            outline: none;
            transition: all 0.2s;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }

        .ds-search-input:focus {
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .ds-search-input::placeholder {
            color: #9ca3af;
        }

        /* 搜索统计 */
        .ds-search-stats {
            margin-top: 8px;
            font-size: 12px;
            color: #6b7280;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }

        /* 结果容器 */
        .ds-results-container {
            flex: 1;
            overflow-y: auto;
            padding: 20px 24px;
            min-height: 200px;
        }

        /* 无结果提示 */
        .ds-no-results {
            text-align: center;
            color: #9ca3af;
            padding: 40px;
            font-size: 14px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }

        /* 结果统计 */
        .ds-results-count {
            font-size: 13px;
            color: #6b7280;
            margin-bottom: 16px;
            font-weight: 500;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }

        /* 结果列表 */
        .ds-results-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        /* 结果项 */
        .ds-result-item {
            padding: 12px 16px;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .ds-result-item:hover {
            background: #f3f4f6;
            border-color: #d1d5db;
            transform: translateX(4px);
        }

        /* 结果标题 */
        .ds-result-title {
            font-size: 14px;
            color: #1f2937;
            line-height: 1.5;
            margin-bottom: 4px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }

        /* 结果元信息 */
        .ds-result-meta {
            display: flex;
            gap: 12px;
            align-items: center;
        }

        /* 结果日期 */
        .ds-result-date {
            font-size: 12px;
            color: #9ca3af;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }

        /* 高亮标记 */
        .ds-highlight {
            background: linear-gradient(to bottom, transparent 40%, #fbbf24 40%, #fbbf24 70%, transparent 70%);
            color: inherit;
            font-weight: 500;
            padding: 0 2px;
        }

        /* 滚动条样式 */
        .ds-results-container::-webkit-scrollbar {
            width: 8px;
        }

        .ds-results-container::-webkit-scrollbar-track {
            background: #f3f4f6;
            border-radius: 4px;
        }

        .ds-results-container::-webkit-scrollbar-thumb {
            background: #d1d5db;
            border-radius: 4px;
        }

        .ds-results-container::-webkit-scrollbar-thumb:hover {
            background: #9ca3af;
        }

        /* 深色模式支持 */
        @media (prefers-color-scheme: dark) {
            .ds-search-button {
                background: #1f2937;
                border-color: #374151;
            }
            
            .ds-search-button:hover {
                border-color: #4d6bfe;
                background: #374151;
            }
            
            .ds-modal-content {
                background: #1f2937;
                color: #f3f4f6;
            }
            
            .ds-modal-header {
                border-bottom-color: #374151;
            }
            
            .ds-modal-header h3 {
                color: #f3f4f6;
            }
            
            .ds-reload-btn {
                color: #9ca3af;
            }
            
            .ds-reload-btn:hover {
                background: #374151;
                color: #667eea;
            }
            
            .ds-close-btn {
                color: #9ca3af;
            }
            
            .ds-close-btn:hover {
                background: #374151;
                color: #f3f4f6;
            }
            
            .ds-search-container {
                border-bottom-color: #374151;
            }
            
            .ds-search-input {
                background: #374151;
                border-color: #4b5563;
                color: #f3f4f6;
            }
            
            .ds-search-input:focus {
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
            }
            
            .ds-search-input::placeholder {
                color: #6b7280;
            }
            
            .ds-search-stats,
            .ds-results-count {
                color: #9ca3af;
            }
            
            .ds-no-results {
                color: #6b7280;
            }
            
            .ds-result-item {
                background: #374151;
                border-color: #4b5563;
            }
            
            .ds-result-item:hover {
                background: #4b5563;
                border-color: #6b7280;
            }
            
            .ds-result-title {
                color: #f3f4f6;
            }
            
            .ds-result-date {
                color: #9ca3af;
            }
            
            .ds-results-container::-webkit-scrollbar-track {
                background: #374151;
            }
            
            .ds-results-container::-webkit-scrollbar-thumb {
                background: #4b5563;
            }
            
            .ds-results-container::-webkit-scrollbar-thumb:hover {
                background: #6b7280;
            }
        }
    `);

    // 存储所有获取到的对话记录
    let allChatSessions = [];
    let searchModal = null;
    let searchButton = null;

    // 初始化插件
    async function init() {
        // 等待页面加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(initialize, 1000); // 延迟1秒确保页面完全加载
            });
        } else {
            setTimeout(initialize, 1000); // 延迟1秒确保页面完全加载
        }
    }

    async function initialize() {
        console.log('DeepSeek 聊天记录搜索插件正在初始化...');
        
        // 创建搜索按钮
        createSearchButton();
        
        // 创建搜索模态框
        createSearchModal();
        
        // 加载聊天记录
        await fetchAllChatSessions();
        
        // 如果加载失败，显示提示
        if (allChatSessions.length === 0) {
            updateSearchStats('未能加载聊天记录，请确保已登录');
        }
    }

    // 从 localStorage 获取认证信息
    function getAuthInfo() {
        try {
            // 获取 userToken
            const userTokenStr = localStorage.getItem('userToken');
            if (userTokenStr) {
                const tokenData = JSON.parse(userTokenStr);
                // 解析嵌套的 value 字段
                if (tokenData && tokenData.value) {
                    console.log('成功获取认证 token');
                    return tokenData.value;
                }
            }
        } catch (error) {
            console.error('获取认证信息失败:', error);
        }
        console.warn('未找到有效的认证 token');
        return null;
    }

    // 获取所有聊天记录（最多1000条）
    async function fetchAllChatSessions() {
        console.log('开始获取聊天记录...');
        allChatSessions = [];
        let hasMore = true;
        let beforeSeqId = null;
        let count = 0;
        const maxRecords = 1000;

        const userToken = getAuthInfo();
        if (!userToken) {
            console.error('未找到认证信息，请确保已登录 DeepSeek');
            return;
        }

        try {
            while (hasMore && count < maxRecords) {
                const url = beforeSeqId 
                    ? `https://chat.deepseek.com/api/v0/chat_session/fetch_page?before_seq_id=${beforeSeqId}&count=50`
                    : 'https://chat.deepseek.com/api/v0/chat_session/fetch_page?count=50';
                
                // 使用GM_xmlhttpRequest替代fetch以处理跨域
                const response = await new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: url,
                        headers: {
                            'accept': '*/*',
                            'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
                            'authorization': `Bearer ${userToken}`,
                            'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
                            'sec-ch-ua-mobile': '?0',
                            'sec-ch-ua-platform': '"macOS"',
                            'sec-fetch-dest': 'empty',
                            'sec-fetch-mode': 'cors',
                            'sec-fetch-site': 'same-origin',
                            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
                            'x-app-version': '20241129.1',
                            'x-client-locale': 'zh_CN',
                            'x-client-platform': 'web',
                            'x-client-version': '1.3.0-auto-resume'
                        },
                        onload: (response) => {
                            if (response.status >= 200 && response.status < 300) {
                                resolve(JSON.parse(response.responseText));
                            } else {
                                reject(new Error(`HTTP error! status: ${response.status}`));
                            }
                        },
                        onerror: (error) => reject(error),
                        onabort: () => reject(new Error('Request aborted')),
                        timeout: 10000
                    });
                });

                if (response.code === 0 && response.data?.biz_data?.chat_sessions) {
                    const sessions = response.data.biz_data.chat_sessions;
                    allChatSessions = allChatSessions.concat(sessions);
                    count += sessions.length;
                    
                    hasMore = response.data.biz_data.has_more;
                    
                    if (sessions.length > 0) {
                        beforeSeqId = sessions[sessions.length - 1].seq_id;
                    } else {
                        hasMore = false;
                    }
                } else {
                    console.error('API返回数据格式错误:', response);
                    break;
                }

                // 防止请求过快
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            console.log(`成功获取 ${allChatSessions.length} 条聊天记录`);
        } catch (error) {
            console.error('获取聊天记录时出错:', error);
        }
    }

    // 创建搜索按钮
    function createSearchButton() {
        searchButton = document.createElement('button');
        searchButton.id = 'deepseek-search-btn';
        searchButton.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="11" cy="11" r="8" stroke="#4d6bfe" stroke-width="2"/>
                <path d="M21 21L16.65 16.65" stroke="#4d6bfe" stroke-width="2" stroke-linecap="round"/>
            </svg>
        `;
        searchButton.className = 'ds-search-button';
        searchButton.title = '搜索对话 (⌘K / Ctrl+K)';
        searchButton.addEventListener('click', showSearchModal);
        document.body.appendChild(searchButton);
    }

    // 创建搜索模态框
    function createSearchModal() {
        searchModal = document.createElement('div');
        searchModal.id = 'deepseek-search-modal';
        searchModal.className = 'ds-search-modal';
        searchModal.style.display = 'none';
        
        searchModal.innerHTML = `
            <div class="ds-modal-overlay"></div>
            <div class="ds-modal-content">
                <div class="ds-modal-header">
                    <h3>搜索聊天记录</h3>
                    <div class="ds-header-actions">
                        <button class="ds-reload-btn" title="重新加载对话记录">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="23 4 23 10 17 10"></polyline>
                                <polyline points="1 20 1 14 7 14"></polyline>
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                            </svg>
                        </button>
                        <button class="ds-close-btn">&times;</button>
                    </div>
                </div>
                <div class="ds-search-container">
                    <input type="text" class="ds-search-input" placeholder="输入关键词搜索对话标题..." autocomplete="off">
                    <div class="ds-search-stats"></div>
                </div>
                <div class="ds-results-container">
                    <div class="ds-no-results">输入关键词开始搜索</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(searchModal);
        
        // 绑定事件
        const closeBtn = searchModal.querySelector('.ds-close-btn');
        const reloadBtn = searchModal.querySelector('.ds-reload-btn');
        const overlay = searchModal.querySelector('.ds-modal-overlay');
        const searchInput = searchModal.querySelector('.ds-search-input');
        
        closeBtn.addEventListener('click', hideSearchModal);
        reloadBtn.addEventListener('click', handleReload);
        overlay.addEventListener('click', hideSearchModal);
        searchInput.addEventListener('input', debounce(handleSearch, 300));
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            // ESC 键关闭
            if (e.key === 'Escape' && searchModal.style.display !== 'none') {
                hideSearchModal();
            }
            
            // Cmd+K (Mac) 或 Ctrl+K (Windows/Linux) 打开搜索
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                if (searchModal.style.display === 'none') {
                    showSearchModal();
                } else {
                    hideSearchModal();
                }
            }
        });
    }

    // 显示搜索模态框
    function showSearchModal() {
        searchModal.style.display = 'flex';
        const searchInput = searchModal.querySelector('.ds-search-input');
        searchInput.focus();
        
        // 显示统计信息
        updateSearchStats();
        
        // 显示所有对话记录
        if (allChatSessions.length > 0 && !searchInput.value) {
            displayAllSessions();
        }
    }

    // 隐藏搜索模态框
    function hideSearchModal() {
        searchModal.style.display = 'none';
        const searchInput = searchModal.querySelector('.ds-search-input');
        searchInput.value = '';
        const resultsContainer = searchModal.querySelector('.ds-results-container');
        resultsContainer.innerHTML = '<div class="ds-no-results">输入关键词开始搜索</div>';
    }

    // 更新搜索统计信息
    function updateSearchStats(customMessage = null) {
        const statsElement = searchModal?.querySelector('.ds-search-stats');
        if (statsElement) {
            if (customMessage) {
                statsElement.textContent = customMessage;
            } else {
                statsElement.textContent = `已加载 ${allChatSessions.length} 条对话记录`;
            }
        }
    }

    // 处理搜索
    function handleSearch(event) {
        const keyword = event.target.value.trim();
        const resultsContainer = searchModal.querySelector('.ds-results-container');
        
        if (!keyword) {
            // 显示所有对话
            if (allChatSessions.length > 0) {
                displayAllSessions();
            } else {
                resultsContainer.innerHTML = '<div class="ds-no-results">暂无对话记录</div>';
            }
            return;
        }
        
        // 执行模糊搜索
        const results = searchChatSessions(keyword);
        
        if (results.length === 0) {
            resultsContainer.innerHTML = '<div class="ds-no-results">未找到匹配的对话</div>';
            return;
        }
        
        // 显示搜索结果
        displaySearchResults(results, keyword);
    }

    // 显示所有对话记录
    function displayAllSessions() {
        const resultsContainer = searchModal.querySelector('.ds-results-container');
        
        const html = allChatSessions.map(session => {
            const date = formatDate(session.updated_at);
            
            return `
                <div class="ds-result-item" data-id="${session.id}">
                    <div class="ds-result-title">${session.title || '无标题'}</div>
                    <div class="ds-result-meta">
                        <span class="ds-result-date">${date}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        resultsContainer.innerHTML = `
            <div class="ds-results-count">所有对话 (${allChatSessions.length} 条)</div>
            <div class="ds-results-list">${html}</div>
        `;
        
        // 绑定点击事件
        resultsContainer.querySelectorAll('.ds-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const chatId = item.dataset.id;
                window.open(`https://chat.deepseek.com/a/chat/s/${chatId}`, '_blank');
                hideSearchModal();
            });
        });
    }

    // 模糊搜索聊天记录
    function searchChatSessions(keyword) {
        const lowerKeyword = keyword.toLowerCase();
        return allChatSessions.filter(session => {
            return session.title && session.title.toLowerCase().includes(lowerKeyword);
        });
    }

    // 显示搜索结果
    function displaySearchResults(results, keyword) {
        const resultsContainer = searchModal.querySelector('.ds-results-container');
        
        const html = results.map(session => {
            const highlightedTitle = highlightKeyword(session.title, keyword);
            const date = formatDate(session.updated_at);
            
            return `
                <div class="ds-result-item" data-id="${session.id}">
                    <div class="ds-result-title">${highlightedTitle}</div>
                    <div class="ds-result-meta">
                        <span class="ds-result-date">${date}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        resultsContainer.innerHTML = `
            <div class="ds-results-count">找到 ${results.length} 条相关对话</div>
            <div class="ds-results-list">${html}</div>
        `;
        
        // 绑定点击事件
        resultsContainer.querySelectorAll('.ds-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const chatId = item.dataset.id;
                window.open(`https://chat.deepseek.com/a/chat/s/${chatId}`, '_blank');
                hideSearchModal();
            });
        });
    }

    // 高亮关键词
    function highlightKeyword(text, keyword) {
        if (!text || !keyword) return text;
        
        const regex = new RegExp(`(${escapeRegExp(keyword)})`, 'gi');
        return text.replace(regex, '<mark class="ds-highlight">$1</mark>');
    }

    // 转义正则表达式特殊字符
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
    }

    // 格式化日期
    function formatDate(timestamp) {
        const date = new Date(timestamp * 1000);
        const now = new Date();
        const diff = now - date;
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor(diff / (1000 * 60));
        
        if (days > 0) {
            if (days === 1) return '昨天';
            if (days < 7) return `${days} 天前`;
            if (days < 30) return `${Math.floor(days / 7)} 周前`;
            if (days < 365) return `${Math.floor(days / 30)} 个月前`;
            return `${Math.floor(days / 365)} 年前`;
        }
        
        if (hours > 0) return `${hours} 小时前`;
        if (minutes > 0) return `${minutes} 分钟前`;
        return '刚刚';
    }

    // 重新加载对话记录
    async function handleReload() {
        const reloadBtn = searchModal.querySelector('.ds-reload-btn');
        const searchInput = searchModal.querySelector('.ds-search-input');
        
        // 显示加载状态
        reloadBtn.disabled = true;
        reloadBtn.style.animation = 'spin 1s linear infinite';
        updateSearchStats('正在重新加载...');
        
        // 清空搜索
        searchInput.value = '';
        const resultsContainer = searchModal.querySelector('.ds-results-container');
        resultsContainer.innerHTML = '<div class="ds-no-results">正在加载对话记录...</div>';
        
        // 重新获取数据
        await fetchAllChatSessions();
        
        // 恢复按钮状态
        reloadBtn.disabled = false;
        reloadBtn.style.animation = '';
        
        // 更新统计信息
        if (allChatSessions.length > 0) {
            updateSearchStats();
            resultsContainer.innerHTML = '<div class="ds-no-results">输入关键词开始搜索</div>';
        } else {
            updateSearchStats('未能加载聊天记录，请确保已登录');
            resultsContainer.innerHTML = '<div class="ds-no-results">未能加载聊天记录，请确保已登录后点击刷新按钮</div>';
        }
    }

    // 防抖函数
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 启动插件
    init();
})();