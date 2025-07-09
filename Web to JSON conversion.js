// ==UserScript==
// @name         Web to JSON conversion
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  一键保存网页内容为AI可读的JSON文件（目前仅支持文本与表格内容）
// @author       DeepSeek R1 0528
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 创建按钮样式
    const style = document.createElement('style');
    style.textContent = `
        #saveForAI {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
            color: white;
            border: none;
            border-radius: 50px;
            padding: 12px 24px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
        }
        #saveForAI:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.25);
        }
        #saveForAI:active {
            transform: translateY(1px);
        }
    `;
    document.head.appendChild(style);

    // 创建按钮
    const button = document.createElement('button');
    button.id = 'saveForAI';
    button.textContent = '保存';
    document.body.appendChild(button);

    // 主功能
    button.addEventListener('click', () => {
        // 1. 提取文本内容
        const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, article, section');
        const texts = [];
        
        textElements.forEach(el => {
            if (el.offsetWidth > 0 && el.offsetHeight > 0) { // 检查元素是否可见
                const text = el.innerText.trim();
                if (text) {
                    // 添加元素类型信息
                    let type = 'paragraph';
                    if (el.tagName.startsWith('H')) type = 'heading';
                    if (el.tagName === 'LI') type = 'list_item';
                    
                    texts.push({
                        content: text,
                        type: type,
                        tag: el.tagName.toLowerCase()
                    });
                }
            }
        });

        // 2. 提取表格数据
        const tables = [];
        document.querySelectorAll('table').forEach(table => {
            if (table.offsetWidth > 0 && table.offsetHeight > 0) {
                const tableData = [];
                
                // 处理表头
                const headers = [];
                table.querySelectorAll('th').forEach(th => {
                    headers.push(th.innerText.trim());
                });
                
                // 处理数据行
                table.querySelectorAll('tr').forEach(tr => {
                    const row = [];
                    tr.querySelectorAll('td').forEach(td => {
                        row.push(td.innerText.trim());
                    });
                    if (row.length > 0) tableData.push(row);
                });
                
                // 只有当表格有数据时才保存
                if (headers.length > 0 || tableData.length > 0) {
                    tables.push({
                        headers: headers,
                        rows: tableData
                    });
                }
            }
        });

        // 3. 组织数据结构
        const pageData = {
            metadata: {
                url: window.location.href,
                title: document.title,
                timestamp: new Date().toISOString()
            },
            content: {
                texts: texts,
                tables: tables
            }
        };

        // 4. 创建并下载JSON文件
        const blob = new Blob([JSON.stringify(pageData, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Web JSON-${new Date().getTime()}.json`;
        document.body.appendChild(a);
        a.click();
        
        // 清理
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            button.textContent = '已保存，请注意查看文件管理器';
            setTimeout(() => button.textContent = '保存', 2000);
        }, 100);
    });
})();