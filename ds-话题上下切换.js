// ==UserScript==
// @name         ds-话题上下切换
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  增强版翻页工具，修复了动态内容检测和翻页逻辑，确保不会错过任何对话框。
// @author       拾年
// @match        https://chat.deepseek.com/*
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // --- 配置区域 ---
    // 如果脚本无法正确识别对话框，请修改此处的选择器。
    // 多个选择器用英文逗号隔开。例如： '.dialog, .message-box'
    const DIALOG_SELECTOR = 'div.fbb737a4, div.ds-markdown';
    // --- 配置结束 ---

    // --- 样式注入 ---
    GM_addStyle(`
        .page-turner-container {
            position: fixed;
            right: 20px;
            top: 50%;
            transform: translateY(-50%);
            display: flex;
            flex-direction: column;
            gap: 12px;
            z-index: 9999;
            opacity: 1;
            transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        .page-turner-container.hidden {
            opacity: 0.4;
            right: -28px;
        }
        .page-turner-btn {
            width: 40px;
            height: 40px;
            background-color: rgba(0, 0, 0, 0.7);
            color: #fff;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            transition: background-color 0.2s, transform 0.2s;
        }
        .page-turner-btn:hover {
            background-color: rgba(0, 0, 0, 0.9);
            transform: scale(1.1);
        }
        .page-turner-toast {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(0, 0, 0, 0.85);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease-in-out;
            pointer-events: none;
        }
    `);

    // --- 脚本逻辑 ---

    const HIDE_DELAY = 3000;
    let pages = [];
    let hideTimeout;
    const container = document.createElement('div');
    container.className = 'page-turner-container';

    function loadFontAwesome() {
        if (!document.querySelector('link[href*="font-awesome"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
            document.head.appendChild(link);
        }
    }

    /**
     * 更新页面元素列表，并输出调试信息
     */
    function updatePages() {
        pages = Array.from(document.querySelectorAll(DIALOG_SELECTOR));
        console.log(`[翻页工具] 检测到 ${pages.length} 个对话框。`);
    }

    function showToast(message) {
        const oldToast = document.querySelector('.page-turner-toast');
        if (oldToast) oldToast.remove();
        const toast = document.createElement('div');
        toast.className = 'page-turner-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        requestAnimationFrame(() => { toast.style.opacity = '1'; });
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 1500);
    }

    /**
     * 导航到上一个或下一个页面（核心逻辑已重构）
     */
    function navigate(direction) {
        // 1. 每次点击时强制刷新页面列表，确保获取最新状态
        updatePages();
        if (pages.length === 0) {
            showToast("没有找到可翻页的内容哦");
            return;
        }

        // 2. 找到当前最接近视口顶部的对话框索引
        let activeIndex = -1;
        for (let i = 0; i < pages.length; i++) {
            // getBoundingClientRect().top 是元素相对于视口顶部的距离
            // 我们找到第一个顶部不在视口上方的元素（即 >= 0）
            if (pages[i].getBoundingClientRect().top >= 0) {
                activeIndex = i;
                break;
            }
        }

        let targetIndex = -1;
        if (direction === 'next') {
            // 如果当前没有元素在视口内（已滚动到底部），或当前是最后一个元素
            if (activeIndex === -1 || activeIndex === pages.length - 1) {
                showToast("已经到底啦");
                return;
            }
            targetIndex = activeIndex + 1;
        } else { // 'prev'
            // 如果当前没有元素在视口内（已滚动到底部），则跳转到最后一个
            if (activeIndex === -1) {
                targetIndex = pages.length - 1;
            }
            // 如果当前是第一个元素
            else if (activeIndex === 0) {
                showToast("已经到顶啦");
                return;
            }
            // 否则，跳转到上一个
            else {
                targetIndex = activeIndex - 1;
            }
        }

        // 3. 滚动到目标页面
        if (targetIndex !== -1 && pages[targetIndex]) {
            pages[targetIndex].scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function resetHideTimer() {
        clearTimeout(hideTimeout);
        container.classList.remove('hidden');
        hideTimeout = setTimeout(() => {
            container.classList.add('hidden');
        }, HIDE_DELAY);
    }

    function initUI() {
        loadFontAwesome();
        const buttonsHtml = `
            <button class="page-turner-btn" title="上一页"><i class="fas fa-angle-up"></i></button>
            <button class="page-turner-btn" title="下一页"><i class="fas fa-angle-down"></i></button>
        `;
        container.innerHTML = buttonsHtml;
        document.body.appendChild(container);

        const btns = container.querySelectorAll('.page-turner-btn');
        btns[0].addEventListener('click', () => { navigate('prev'); resetHideTimer(); });
        btns[1].addEventListener('click', () => { navigate('next'); resetHideTimer(); });

        container.addEventListener('mouseenter', resetHideTimer);
        container.addEventListener('mouseleave', resetHideTimer);
        resetHideTimer();
    }

    function main() {
        if (document.body) {
            initUI();
        } else {
            window.addEventListener('load', initUI);
        }
        updatePages(); // 初始加载
        const observer = new MutationObserver(updatePages);
        observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    }

    main();

})();