/**
 * Cloudflare Pages Function - 导出 Polymarket 交易记录为 JSON 文件
 */
export async function onRequest(context) {
    const { searchParams } = new URL(context.request.url);
    const user = searchParams.get('user');
    const limit = parseInt(searchParams.get('limit')) || 100;

    if (!user || !/^0x[a-f0-9]{40}$/i.test(user)) {
        return new Response(JSON.stringify({ error: '无效或缺失钱包地址 (user)' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const API_BASE = 'https://data-api.polymarket.com/activity';
    const BATCH_SIZE = 100;
    let allRecords = [];
    let offset = 0;

    try {
        // 循环抓取数据直到满足 limit
        while (allRecords.length < limit) {
            const currentBatch = Math.min(BATCH_SIZE, limit - allRecords.length);
            const url = `${API_BASE}?user=${user}&limit=${currentBatch}&offset=${offset}`;
            
            const response = await fetch(url);
            if (!response.ok) break;

            const data = await response.json();
            if (!Array.isArray(data) || data.length === 0) break;

            // 过滤字段 (与前端过滤逻辑保持一致)
            const fieldsToRemove = ['icon', 'name', 'pseudonym', 'bio', 'profileImage', 'profileImageOptimized'];
            const cleanedData = data.map(record => {
                const cleaned = { ...record };
                fieldsToRemove.forEach(field => delete cleaned[field]);
                return cleaned;
            });

            allRecords.push(...cleanedData);
            if (data.length < currentBatch) break;
            offset += currentBatch;
        }

        // 生成 JSON 文件名
        const filename = `pm_${user}_${allRecords.length}.json`;

        return new Response(JSON.stringify(allRecords, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Access-Control-Allow-Origin': '*' // 允许跨域调用
            }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: '服务器内部错误', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
