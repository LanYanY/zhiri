/**
 * 知日 - 数据存储模块
 */

const STORAGE_KEY = 'zhiri_data';
const LLM_CONFIG_KEY = 'zhiri_llm_config';
const AI_CACHE_KEY = 'zhiri_ai_cache';

// ===== 纪念日/标注管理 =====
export function getAnnotations() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : {};
}

export function saveAnnotation(dateStr, annotation) {
  const data = getAnnotations();
  if (!data[dateStr]) {
    data[dateStr] = { annotations: [], events: [] };
  }
  data[dateStr].annotations.push({
    id: Date.now(),
    text: annotation,
    createdAt: new Date().toISOString()
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function deleteAnnotation(dateStr, id) {
  const data = getAnnotations();
  if (data[dateStr]) {
    data[dateStr].annotations = data[dateStr].annotations.filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}

export function getDayAnnotations(dateStr) {
  const data = getAnnotations();
  return data[dateStr]?.annotations || [];
}

// ===== 事件/纪念日管理 =====
export function addEvent(dateStr, event) {
  const data = getAnnotations();
  if (!data[dateStr]) {
    data[dateStr] = { annotations: [], events: [] };
  }
  data[dateStr].events.push({
    id: Date.now(),
    title: event.title,
    type: event.type || 'memorial',
    repeat: event.repeat || 'none',
    createdAt: new Date().toISOString()
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function deleteEvent(dateStr, id) {
  const data = getAnnotations();
  if (data[dateStr]) {
    data[dateStr].events = data[dateStr].events.filter(e => e.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}

export function getDayEvents(dateStr) {
  const data = getAnnotations();
  return data[dateStr]?.events || [];
}

export function getMonthEvents(year, month) {
  const data = getAnnotations();
  const events = {};
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  Object.keys(data).forEach(dateStr => {
    if (dateStr.startsWith(prefix) && data[dateStr].events.length > 0) {
      events[dateStr] = data[dateStr].events;
    }
  });
  return events;
}

// ===== LLM 配置管理 =====
export function getLLMConfig() {
  const data = localStorage.getItem(LLM_CONFIG_KEY);
  return data ? JSON.parse(data) : {
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-3.5-turbo',
    enabled: false
  };
}

export function saveLLMConfig(config) {
  localStorage.setItem(LLM_CONFIG_KEY, JSON.stringify(config));
}

// ===== AI 建议缓存管理 =====
function getAICache() {
  const data = localStorage.getItem(AI_CACHE_KEY);
  return data ? JSON.parse(data) : {};
}

function setAICache(dateStr, suggestion) {
  const cache = getAICache();
  cache[dateStr] = {
    suggestion,
    timestamp: Date.now()
  };
  // 只保留最近 7 天的缓存
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  Object.keys(cache).forEach(key => {
    if (cache[key].timestamp < sevenDaysAgo) {
      delete cache[key];
    }
  });
  localStorage.setItem(AI_CACHE_KEY, JSON.stringify(cache));
}

function getCachedAI(dateStr) {
  const cache = getAICache();
  return cache[dateStr]?.suggestion || null;
}

// ===== 调用 LLM API（带重试和限流处理）=====
let lastCallTime = 0;
const MIN_INTERVAL = 10000; // 最小调用间隔 10 秒
let retryCount = 0;
const MAX_RETRIES = 2;

export async function callLLM(prompt, systemPrompt = '') {
  const config = getLLMConfig();
  if (!config.enabled || !config.apiKey) {
    throw new Error('LLM API 未配置，请在设置中配置 API');
  }

  // 限流检查
  const now = Date.now();
  const timeSinceLastCall = now - lastCallTime;
  if (timeSinceLastCall < MIN_INTERVAL) {
    throw new Error('请求过于频繁，请稍后再试');
  }
  lastCallTime = now;

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (response.status === 429) {
        // 429 限流错误
        const errorData = await response.json().catch(() => ({}));
        const waitTime = errorData.error?.message?.match(/(\d+)ms/) || 5000;
        throw new Error(`API 调用次数已达上限，${Math.ceil(parseInt(waitTime) / 1000)}秒后重试`);
      }

      if (response.status === 401) {
        throw new Error('API Key 无效，请检查设置');
      }

      if (response.status === 403) {
        throw new Error('API 访问被拒绝，请检查账户状态');
      }

      if (!response.ok) {
        throw new Error(`API 请求失败 (${response.status})`);
      }

      const data = await response.json();
      retryCount = 0; // 重置重试计数

      if (!data.choices?.[0]?.message?.content) {
        throw new Error('API 返回数据格式异常');
      }

      return data.choices[0].message.content;

    } catch (error) {
      lastError = error;
      retryCount++;

      // 如果是 429 错误，等待后重试
      if (error.message.includes('上限') || error.message.includes('频繁')) {
        if (attempt < MAX_RETRIES) {
          const waitMs = Math.min(5000 * retryCount, 30000);
          await new Promise(resolve => setTimeout(resolve, waitMs));
          continue;
        }
      }

      // 其他错误直接抛出
      if (!error.message.includes('上限') && !error.message.includes('频繁')) {
        throw error;
      }
    }
  }

  throw lastError || new Error('AI 服务调用失败');
}

// ===== 获取每日 AI 建议（带缓存）=====
export async function getAIDailySuggestion(dateStr, dayInfo) {
  // 先检查缓存
  const cached = getCachedAI(dateStr);
  if (cached) {
    return cached;
  }

  const lunarInfo = `${dayInfo.lunar.fullStr} ${dayInfo.ganZhi}`;
  const festival = dayInfo.festival ? `，今日节日：${dayInfo.festival}` : '';
  const jieQi = dayInfo.jieQi ? `，节气：${dayInfo.jieQi}` : '';

  const prompt = `今天是公历${dayInfo.solar.year}年${dayInfo.solar.month}月${dayInfo.solar.day}日，农历${lunarInfo}${festival}${jieQi}。黄历宜：${dayInfo.huangli.yi.join('、')}，忌：${dayInfo.huangli.ji.join('、')}。请根据这些信息，给出一句简洁的生活建议或感悟，50字以内。`;

  const systemPrompt = '你是"知日"日历应用的AI助手，擅长结合传统历法和现代生活给出实用建议。回答要简洁、温暖、有启发性。';

  try {
    const suggestion = await callLLM(prompt, systemPrompt);
    // 缓存成功的结果
    setAICache(dateStr, suggestion);
    return suggestion;
  } catch (error) {
    // 返回本地建议作为降级方案
    console.warn('AI 建议获取失败:', error.message);
    return null; // 返回 null 让组件使用本地建议
  }
}
