// URL 格式化工具
function normalizeBaseUrl(raw) {
  return (raw || '').trim().replace(/\/+$/, '').replace(/\/chat\/completions$/, '').replace(/\/models$/, '');
}

// API Key 清洗工具
function cleanApiKey(key) {
  return (key || '').trim().replace(/^bearer\s+/i, '');
}

// Worker 跨域网络请求
async function workerFetch(target, opts = {}) {
  return await fetch(`${WORKER_PROXY}${encodeURIComponent(target)}`, opts);
}

// 模型列表拉取接口
async function fetchRemoteModels(baseUrl, apiKey) {
  const cleanKey = cleanApiKey(apiKey);
  const base = normalizeBaseUrl(baseUrl);
  const resp = await workerFetch(`${base}/v1/models`, {
    headers: { 'Authorization': `Bearer ${cleanKey}` }
  });
  const resJson = await resp.json();
  if (Array.isArray(resJson.data)) {
    return resJson.data.map(i => i.id);
  }
  return [];
}
