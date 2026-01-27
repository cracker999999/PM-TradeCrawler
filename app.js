/**
 * Polymarket Trade Crawler
 * 抓取并导出Polymarket用户交易记录
 */

class PolymarketCrawler {
    constructor() {
        this.API_BASE = 'https://data-api.polymarket.com/activity';
        this.BATCH_SIZE = 100; // 每次请求的条数
        this.allRecords = [];
        this.currentAddress = '';
        this.isRunning = false;
        this.previewLimit = 20; // 初始预览条数
        
        this.initTheme();
        this.initElements();
        this.bindEvents();
    }
    
    /**
     * 初始化主题
     */
    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    /**
     * 切换主题
     */
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.log(`主题已切换为: ${newTheme === 'light' ? '浅色' : '深色'}`, 'info');
    }

    initElements() {
        this.userInput = document.getElementById('userInput');
        this.limitInput = document.getElementById('limitInput');
        this.fetchBtn = document.getElementById('fetchBtn');
        this.btnText = this.fetchBtn.querySelector('.btn-text');
        this.btnLoading = this.fetchBtn.querySelector('.btn-loading');
        this.logArea = document.getElementById('logArea');
        this.clearLogBtn = document.getElementById('clearLogBtn');
        this.resultCard = document.getElementById('resultCard');
        this.totalRecords = document.getElementById('totalRecords');
        this.totalVolume = document.getElementById('totalVolume');
        this.timeRangeDisplay = document.getElementById('timeRangeDisplay');
        this.previewBody = document.getElementById('previewBody');
        this.downloadCsvBtn = document.getElementById('downloadCsvBtn');
        this.downloadJsonBtn = document.getElementById('downloadJsonBtn');
        this.themeToggle = document.getElementById('themeToggle');
    }
    
    bindEvents() {
        this.fetchBtn.addEventListener('click', () => this.startFetch());
        this.clearLogBtn.addEventListener('click', () => this.clearLog());
        this.downloadCsvBtn.addEventListener('click', () => this.downloadCSV());
        this.downloadJsonBtn.addEventListener('click', () => this.downloadJSON());
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        // 回车键触发
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.startFetch();
        });
    }
    
    /**
     * 从用户输入中提取钱包地址
     */
    extractWalletAddress(input) {
        input = input.trim();
        
        // 如果是直接的钱包地址
        if (/^0x[a-fA-F0-9]{40}$/i.test(input)) {
            return input.toLowerCase();
        }
        
        // 从URL中提取
        // 支持格式: 
        // https://polymarket.com/profile/0x...
        // https://polymarket.com/@username (需要额外处理)
        const addressMatch = input.match(/0x[a-fA-F0-9]{40}/i);
        if (addressMatch) {
            return addressMatch[0].toLowerCase();
        }
        
        return null;
    }
    
    /**
     * 日志输出
     */
    log(message, type = 'info') {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false });
        
        const entry = document.createElement('div');
        entry.className = `log-entry log-${type}`;
        entry.innerHTML = `
            <span class="log-time">[${timeStr}]</span>
            <span class="log-message">${message}</span>
        `;
        
        this.logArea.appendChild(entry);
        this.logArea.scrollTop = this.logArea.scrollHeight;
    }
    
    clearLog() {
        this.logArea.innerHTML = `
            <div class="log-entry log-info">
                <span class="log-time">[--:--:--]</span>
                <span class="log-message">日志已清空，等待新指令...</span>
            </div>
        `;
    }
    
    /**
     * 设置按钮加载状态
     */
    setLoading(loading) {
        this.isRunning = loading;
        this.fetchBtn.disabled = loading;
        this.btnText.style.display = loading ? 'none' : 'inline';
        this.btnLoading.style.display = loading ? 'flex' : 'none';
    }
    
    /**
     * 开始抓取
     */
    async startFetch() {
        if (this.isRunning) return;
        
        const userInput = this.userInput.value;
        const limit = parseInt(this.limitInput.value) || 100;
        
        if (!userInput) {
            this.log('请输入用户钱包地址或链接', 'error');
            return;
        }
        
        const walletAddress = this.extractWalletAddress(userInput);
        if (!walletAddress) {
            this.log('无法识别钱包地址，请检查输入格式', 'error');
            return;
        }
        
        this.currentAddress = walletAddress;
        this.allRecords = [];
        this.previewLimit = 20; // 重置预览条数
        this.resultCard.style.display = 'none';
        this.setLoading(true);
        
        this.log(`开始抓取用户: ${walletAddress}`, 'success');
        this.log(`目标条数: ${limit}`, 'info');
        
        try {
            let offset = 0;
            let hasMore = true;
            
            while (hasMore && this.allRecords.length < limit) {
                const batchSize = Math.min(this.BATCH_SIZE, limit - this.allRecords.length);
                const url = `${this.API_BASE}?user=${walletAddress}&limit=${batchSize}&offset=${offset}`;
                
                this.log(`请求第 ${offset / this.BATCH_SIZE + 1} 页数据 (offset=${offset})...`, 'fetch');
                
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`API请求失败: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (!Array.isArray(data) || data.length === 0) {
                    this.log('已获取全部可用数据', 'warning');
                    hasMore = false;
                    break;
                }
                
                this.allRecords.push(...data);
                this.log(`获取 ${data.length} 条记录，累计: ${this.allRecords.length}`, 'success');
                
                if (data.length < batchSize) {
                    hasMore = false;
                } else {
                    offset += batchSize;
                }
                
                // 避免请求过快
                if (hasMore) {
                    await this.sleep(300);
                }
            }
            
            if (this.allRecords.length === 0) {
                this.log('未找到任何交易记录', 'warning');
            } else {
                this.log(`✅ 抓取完成! 共获取 ${this.allRecords.length} 条交易记录`, 'success');
                this.showResults();
            }
            
        } catch (error) {
            this.log(`❌ 抓取失败: ${error.message}`, 'error');
            console.error(error);
        } finally {
            this.setLoading(false);
        }
    }
    
    /**
     * 显示结果
     */
    showResults() {
        // 计算统计数据
        const totalVolume = this.allRecords.reduce((sum, r) => sum + (r.usdcSize || 0), 0);
        
        this.totalRecords.textContent = this.allRecords.length;
        this.totalVolume.textContent = `$${totalVolume.toFixed(2)}`;
        
        // 计算时间范围
        if (this.allRecords.length > 0) {
            const timestamps = this.allRecords.map(r => r.timestamp);
            const minTs = Math.min(...timestamps);
            const maxTs = Math.max(...timestamps);
            const startTime = new Date(minTs * 1000).toLocaleString('zh-CN');
            const endTime = new Date(maxTs * 1000).toLocaleString('zh-CN');
            this.timeRangeDisplay.textContent = `📅 时间跨度: ${startTime} 至 ${endTime}`;
        } else {
            this.timeRangeDisplay.textContent = '';
        }
        
        this.resultCard.style.display = 'block';
        this.resultCard.scrollIntoView({ behavior: 'smooth' });
        
        this.renderPreviewTable();
    }
    
    /**
     * 渲染预览表格
     */
    renderPreviewTable() {
        this.previewBody.innerHTML = '';
        const previewData = this.allRecords.slice(0, this.previewLimit);
        
        previewData.forEach(record => {
            const row = document.createElement('tr');
            const time = new Date(record.timestamp * 1000).toLocaleString('zh-CN');
            const title = record.title || '-';
            const shortTitle = title.length > 30 ? title.substring(0, 30) + '...' : title;
            const eventUrl = record.eventSlug ? `https://polymarket.com/event/${record.eventSlug}` : '#';
            
            row.innerHTML = `
                <td>${time}</td>
                <td class="market-cell" title="${title}"><a href="${eventUrl}" target="_blank" rel="noopener">${shortTitle}</a></td>
                <td class="side-${record.side?.toLowerCase()}">${record.side || '-'}</td>
                <td class="outcome-${record.outcome?.toLowerCase()}">${record.outcome || '-'}</td>
                <td>${record.size?.toFixed(2) || '-'}</td>
                <td>${record.price?.toFixed(2) || '-'}</td>
                <td>$${record.usdcSize?.toFixed(2) || '-'}</td>
            `;
            this.previewBody.appendChild(row);
        });
        
        if (this.allRecords.length > this.previewLimit) {
            const row = document.createElement('tr');
            const remaining = this.allRecords.length - this.previewLimit;
            row.innerHTML = `
                <td colspan="7" style="text-align: center; padding: var(--spacing-md);">
                    <button class="btn-ghost load-more-btn" style="width: 200px;">
                        加载更多 (还有 ${remaining} 条)
                    </button>
                </td>
            `;
            this.previewBody.appendChild(row);
            
            // 绑定加载更多事件
            row.querySelector('.load-more-btn').addEventListener('click', () => {
                this.previewLimit += 20;
                this.renderPreviewTable();
            });
        }
    }
    
    /**
     * 下载CSV
     */
    downloadCSV() {
        if (this.allRecords.length === 0) return;
        
        const headers = [
            'timestamp', 'datetime', 'type', 'title', 'slug', 'side', 'outcome',
            'size', 'price', 'usdcSize', 'transactionHash', 'conditionId'
        ];
        
        const rows = this.allRecords.map(r => [
            r.timestamp,
            new Date(r.timestamp * 1000).toISOString(),
            r.type,
            `"${(r.title || '').replace(/"/g, '""')}"`,
            r.slug,
            r.side,
            r.outcome,
            r.size,
            r.price,
            r.usdcSize,
            r.transactionHash,
            r.conditionId
        ]);
        
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        
        const filename = `pm_${this.currentAddress}_${this.allRecords.length}.csv`;
        this.downloadFile(csv, filename, 'text/csv');
        this.log('CSV文件下载成功', 'success');
    }
    
    /**
     * 下载JSON
     */
    downloadJSON() {
        if (this.allRecords.length === 0) return;
        
        // 过滤掉不需要的字段
        const fieldsToRemove = ['proxyWallet', 'icon', 'name', 'pseudonym', 'bio', 'profileImage', 'profileImageOptimized'];
        const cleanedRecords = this.allRecords.map(record => {
            const cleaned = { ...record };
            fieldsToRemove.forEach(field => delete cleaned[field]);
            return cleaned;
        });
        
        const json = JSON.stringify(cleanedRecords, null, 2);
        const filename = `pm_${this.currentAddress}_${this.allRecords.length}.json`;
        this.downloadFile(json, filename, 'application/json');
        this.log('JSON文件下载成功', 'success');
    }
    
    /**
     * 通用下载方法
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    
    /**
     * 延时
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.crawler = new PolymarketCrawler();
});
