// ==UserScript==
// @name         DS-一键 折/展 全局思考过程
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  新增位置记忆功能，按钮会记住上次拖动的位置。
// @author       拾年
// @match        https://chat.deepseek.com/*
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. 样式定义 ---
    const style = document.createElement('style');
    style.textContent = `
        .via-collapse-toggle-btn {
            position: fixed !important;
            width: 40px !important;
            height: 40px !important;
            background-color: #007AFF !important;
            border-radius: 50% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            cursor: move !important;
            z-index: 2147483647 !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
            transition: opacity 0.4s ease, box-shadow 0.4s ease !important;
            -webkit-tap-highlight-color: transparent !important;
            touch-action: none !important;
        }
        .via-collapse-toggle-btn svg {
            width: 24px !important;
            height: 24px !important;
            fill: white !important;
            pointer-events: none;
        }
        .via-collapse-toggle-btn.hidden {
            opacity: 0.3 !important;
        }
        .via-collapse-toast {
            position: fixed !important;
            top: 20% !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            background-color: rgba(0, 0, 0, 0.85) !important;
            color: white !important;
            padding: 12px 24px !important;
            border-radius: 8px !important;
            font-size: 16px !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            z-index: 2147483647 !important;
            opacity: 0 !important;
            transition: opacity 0.3s ease-in-out !important;
            pointer-events: none !important;
        }
        .via-collapse-toast.show {
            opacity: 1 !important;
        }
    `;
    (document.head || document.documentElement).appendChild(style);

    // --- 2. 核心变量 ---
    const COLLAPSE_SELECTOR = 'div._5ab5d64';
    const STORAGE_KEY = 'via-toggle-button-position'; // 用于存储位置的键
    let isCollapsed = false;
    let hideTimer;
    let toggleButton;

    // --- 拖动相关变量 ---
    let isDragging = false;
    let startX, startY;
    let initialLeft, initialTop;

    // --- 3. 核心功能函数 ---
    function showToast(message) {
        const oldToast = document.querySelector('.via-collapse-toast');
        if (oldToast) oldToast.remove();
        const toast = document.createElement('div');
        toast.className = 'via-collapse-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    function toggleAllComponents() {
        const components = document.querySelectorAll(COLLAPSE_SELECTOR);
        if (components.length === 0) {
            showToast('未找到可折叠的组件');
            return;
        }
        if (!isCollapsed) {
            components.forEach(el => el.click());
            isCollapsed = true;
            showToast('已折叠');
        } else {
            components.forEach(el => el.click());
            isCollapsed = false;
            showToast('已展开');
        }
    }

    function hideButton() { if (toggleButton) toggleButton.classList.add('hidden'); }
    function showButton() { if (toggleButton) { toggleButton.classList.remove('hidden'); resetAutoHideTimer(); } }
    function resetAutoHideTimer() { if (hideTimer) clearTimeout(hideTimer); hideTimer = setTimeout(hideButton, 3000); }

    // --- 4. 拖动功能函数 (含位置记忆) ---
    function handleStart(e) {
        const point = e.touches ? e.touches[0] : e;
        startX = point.clientX;
        startY = point.clientY;

        const rect = toggleButton.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;

        isDragging = false;
        toggleButton.style.transition = 'none';

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleEnd);

        e.preventDefault();
    }

    function handleMove(e) {
        const point = e.touches ? e.touches[0] : e;
        const deltaX = point.clientX - startX;
        const deltaY = point.clientY - startY;

        if (!isDragging && Math.abs(deltaX) < 5 && Math.abs(deltaY) < 5) {
            return;
        }

        isDragging = true;

        let newLeft = initialLeft + deltaX;
        let newTop = initialTop + deltaY;

        const maxX = window.innerWidth - toggleButton.offsetWidth;
        const maxY = window.innerHeight - toggleButton.offsetHeight;

        newLeft = Math.max(0, Math.min(newLeft, maxX));
        newTop = Math.max(0, Math.min(newTop, maxY));

        toggleButton.style.left = `${newLeft}px`;
        toggleButton.style.top = `${newTop}px`;

        e.preventDefault();
    }

    function handleEnd(e) {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', handleEnd);

        toggleButton.style.transition = '';

        if (!isDragging) {
            toggleAllComponents();
        } else {
            // 如果是拖动结束，则保存当前位置
            const rect = toggleButton.getBoundingClientRect();
            const positionToSave = { left: rect.left, top: rect.top };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(positionToSave));
        }

        isDragging = false;
        resetAutoHideTimer();
    }

    // --- 5. 创建按钮 (含位置恢复) ---
    function createToggleButton() {
        if (document.querySelector('.via-collapse-toggle-btn')) return;

        toggleButton = document.createElement('div');
        toggleButton.className = 'via-collapse-toggle-btn';
        toggleButton.innerHTML = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
        `;

        // 尝试从localStorage恢复位置
        let initialLeft = 15;
        let initialTop = (window.innerHeight / 2) - 20; // 默认位置

        const storedPosition = localStorage.getItem(STORAGE_KEY);
        if (storedPosition) {
            try {
                const pos = JSON.parse(storedPosition);
                const maxX = window.innerWidth - toggleButton.offsetWidth;
                const maxY = window.innerHeight - toggleButton.offsetHeight;

                if (typeof pos.left === 'number' && typeof pos.top === 'number') {
                    // 确保恢复的位置在当前窗口内
                    initialLeft = Math.max(0, Math.min(pos.left, maxX));
                    initialTop = Math.max(0, Math.min(pos.top, maxY));
                }
            } catch (e) {
                console.error("恢复按钮位置失败:", e);
                // 如果失败，将使用默认位置
            }
        }

        toggleButton.style.left = `${initialLeft}px`;
        toggleButton.style.top = `${initialTop}px`;

        toggleButton.addEventListener('mousedown', handleStart);
        toggleButton.addEventListener('touchstart', handleStart, { passive: false });

        document.body.appendChild(toggleButton);
        resetAutoHideTimer();
    }

    // --- 6. 初始化 ---
    function init() {
        if (document.body) {
            createToggleButton();
        } else {
            setTimeout(init, 100);
        }
    }

    init();

})();