// ==UserScript==
// @name         对话窗口悬浮导航按钮
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  添加上下箭头悬浮按钮，支持拖动、记忆位置、切换消息
// @author       You
// @match        https://chat.deepseek.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    // 配置参数
    const CONFIG = {
        buttonSize: 40,
        buttonOffset: 20,
        longPressDelay: 500,
        userMessageSelector: '.d29f3d7d.ds-message._63c77b1'
    };

    // 创建悬浮按钮
    function createButton(direction) {
        const button = document.createElement('div');
        button.id = `nav-button-${direction}`;
        button.innerHTML = direction === 'up' ? '↑' : '↓';
        button.style.cssText = `
            position: fixed;
            width: ${CONFIG.buttonSize}px;
            height: ${CONFIG.buttonSize}px;
            background: rgba(77, 107, 254, 0.8);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: move;
            z-index: 9999;
            font-size: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            transition: background 0.2s;
        `;

        // 加载保存的位置
        const savedPos = GM_getValue(`button_${direction}_pos`);
        if (savedPos) {
            button.style.left = `${savedPos.left}px`;
            button.style.top = `${savedPos.top}px`;
        } else {
            // 默认位置（右下角）
            const right = CONFIG.buttonOffset + CONFIG.buttonSize + 10;
            button.style.left = `calc(100% - ${right}px)`;
            button.style.top = direction === 'up' 
                ? `calc(50% - ${CONFIG.buttonSize + 15}px)` 
                : `calc(50% + 15px)`;
        }

        document.body.appendChild(button);
        return button;
    }

    // 实现按钮拖动
    function makeDraggable(button, direction) {
        let isDragging = false;
        let startX, startY, offsetX, offsetY;
        let longPressTimer = null;
        let isLongPress = false;
        let initialPos = {};

        button.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // 只响应左键

            initialPos = { left: button.offsetLeft, top: button.offsetTop };
            startX = e.clientX;
            startY = e.clientY;
            offsetX = e.clientX - button.offsetLeft;
            offsetY = e.clientY - button.offsetTop;
            isDragging = false;

            // 长按检测
            longPressTimer = setTimeout(() => {
                isLongPress = true;
                button.style.background = 'rgba(55, 85, 215, 0.9)';
            }, CONFIG.longPressDelay);

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        function onMouseMove(e) {
            if (!longPressTimer) return;

            const moveX = e.clientX - offsetX;
            const moveY = e.clientY - offsetY;

            // 若移动超过5px则判定为拖动
            if (Math.abs(e.clientX - startX) > 5 || Math.abs(e.clientY - startY) > 5) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
                isDragging = true;
                button.style.left = `${moveX}px`;
                button.style.top = `${moveY}px`;
            }
        }

        function onMouseUp(e) {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                
                if (!isDragging) {
                    // 点击事件 - 切换消息
                    direction === 'up' ? scrollToPrevMessage() : scrollToNextMessage();
                }
            } else if (isLongPress && !isDragging) {
                // 长按未拖动 - 滚动到顶/底
                direction === 'up' ? window.scrollTo({ top: 0, behavior: 'smooth' }) : 
                                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            } else if (isDragging) {
                // 保存位置
                GM_setValue(`button_${direction}_pos`, {
                    left: button.offsetLeft,
                    top: button.offsetTop
                });
            }

            // 重置状态
            isDragging = false;
            isLongPress = false;
            button.style.background = 'rgba(77, 107, 254, 0.8)';
        }
    }

    // 切换到上一个/下一个用户消息
    function scrollToPrevMessage() {
        const messages = Array.from(document.querySelectorAll(CONFIG.userMessageSelector));
        const currentIndex = messages.findIndex(el => {
            const rect = el.getBoundingClientRect();
            return rect.top >= 0 && rect.bottom <= window.innerHeight;
        });

        if (currentIndex > 0) {
            messages[currentIndex - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function scrollToNextMessage() {
        const messages = Array.from(document.querySelectorAll(CONFIG.userMessageSelector));
        const currentIndex = messages.findIndex(el => {
            const rect = el.getBoundingClientRect();
            return rect.top >= 0 && rect.bottom <= window.innerHeight;
        });

        if (currentIndex < messages.length - 1) {
            messages[currentIndex + 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // 初始化
    function init() {
        const upButton = createButton('up');
        const downButton = createButton('down');
        
        makeDraggable(upButton, 'up');
        makeDraggable(downButton, 'down');
    }

    // 等待DOM加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();