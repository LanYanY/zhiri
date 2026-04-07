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
  const weekDay = ['日', '一', '二', '三', '四', '五', '六'][dayInfo.solar.weekDay];
  const season = getSeason(dayInfo.solar.month);

  const prompt = `今天是公历${dayInfo.solar.year}年${dayInfo.solar.month}月${dayInfo.solar.day}日，星期${weekDay}，农历${lunarInfo}。${season}${festival}${jieQi}。

请根据以上信息，生成一份简洁但有趣的生活建议，包含以下格式：

🎯 今日宜做
1件具体的小事

🍲 今日推荐
一种适合这个时节的食物

📖 今日推荐
一本书/一部电影/一段音乐（任选其一）

💡 小提醒
一条实用的生活小贴士

每条建议请简洁具体（每行不超过20字），避免空泛的大道理，要有趣味性和可操作性。`;

  const systemPrompt = '你是"知日"日历应用的AI生活助手。你的回答应该温暖、具体、有趣，避免说教和空洞的感悟。推荐的食物、书籍、电影或音乐要与当前的季节、节气或节日有所呼应。每条建议都要简洁但信息丰富。';

  try {
    const suggestion = await callLLM(prompt, systemPrompt);
    // 缓存成功的结果
    setAICache(dateStr, suggestion);
    return suggestion;
  } catch (error) {
    // 返回本地建议作为降级方案
    console.warn('AI 建议获取失败:', error.message);
    return getRichLocalSuggestion(dayInfo);
  }
}

// ===== 获取季节 =====
function getSeason(month) {
  if (month >= 3 && month <= 5) return '🌸 春季';
  if (month >= 6 && month <= 8) return '☀️ 夏季';
  if (month >= 9 && month <= 11) return '🍂 秋季';
  return '❄️ 冬季';
}

// ===== 丰富的本地建议（当 LLM 未配置时）=====
export function getRichLocalSuggestion(dayInfo) {
  const month = dayInfo.solar.month;
  const day = dayInfo.solar.day;
  const weekDay = dayInfo.solar.weekDay;
  const jieQi = dayInfo.jieQi;
  const yi = dayInfo.huangli.yi;
  const ji = dayInfo.huangli.ji;

  const activities = {
    '宜做': [
      { text: '整理书桌，挑一本搁置很久的书读30分钟', season: [3,4,5,9,10,11] },
      { text: '午后散步20分钟，边走边听喜欢的播客', season: [3,4,5,6,9,10,11] },
      { text: '给久未联系的朋友发条消息，问候近况', season: [1,2,3,4,5,6,7,8,9,10,11,12] },
      { text: '尝试做一道没做过的家常菜', season: [1,2,3,4,5,6,7,8,9,10,11,12] },
      { text: '写下三件今天让你感恩的小事', season: [1,2,3,4,5,6,7,8,9,10,11,12] },
      { text: '早睡一小时，把手机调成飞行模式', season: [1,2,3,4,5,6,7,8,9,10,11,12] },
      { text: '泡一杯花茶，安静地坐15分钟', season: [3,4,5,9,10,11] },
      { text: '整理手机相册，删掉不需要的截图', season: [1,2,3,4,5,6,7,8,9,10,11,12] },
      { text: '做一套简单的拉伸，放松肩颈', season: [1,2,3,4,5,6,7,8,9,10,11,12] },
      { text: '看一部收藏了很久的电影', season: [1,2,3,4,5,6,7,8,9,10,11,12] },
    ],
    '推荐': [
      { food: '绿豆汤', season: [6,7,8], desc: '清热解暑' },
      { food: '红豆薏米粥', season: [7,8,9], desc: '祛湿健脾' },
      { food: '银耳莲子羹', season: [9,10,11], desc: '润肺滋阴' },
      { food: '红枣桂圆茶', season: [11,12,1,2], desc: '暖身补气' },
      { food: '菊花枸杞茶', season: [3,4,5,9,10], desc: '明目清肝' },
      { food: '冰糖雪梨', season: [9,10,11,12], desc: '润喉止咳' },
      { food: '酸梅汤', season: [6,7,8], desc: '生津止渴' },
      { food: '姜枣茶', season: [11,12,1,2], desc: '驱寒暖胃' },
      { food: '桂花糕', season: [9,10], desc: '应季小点' },
      { food: '青团', season: [3,4], desc: '清明时令' },
    ],
    '提醒': [
      { text: '换季了，注意适时增减衣物', season: [3,4,9,10] },
      { text: '今天多喝水，保持身体水分充足', season: [6,7,8] },
      { text: '出门记得涂防晒，紫外线不容忽视', season: [5,6,7,8,9] },
      { text: '天气干燥，注意皮肤保湿', season: [10,11,12,1,2] },
      { text: '久坐了，站起来活动活动筋骨', season: [1,2,3,4,5,6,7,8,9,10,11,12] },
      { text: '今天适合放下手机，早点休息', season: [1,2,3,4,5,6,7,8,9,10,11,12] },
    ]
  };

  const pickSeasonal = (list) => {
    const seasonal = list.filter(item => item.season.includes(month));
    return seasonal.length > 0 ? seasonal[Math.floor(Math.random() * seasonal.length)] : list[0];
  };

  const activity = pickSeasonal(activities['宜做']);
  const food = pickSeasonal(activities['推荐']);
  const reminder = pickSeasonal(activities['提醒']);

  // 根据宜忌动态选择活动
  const yiActivity = yi.includes('祈福') ? '去附近的寺庙或公园静心' :
                     yi.includes('出行') ? '去一个一直想去但还没去的地方' :
                     yi.includes('动土') ? '整理房间，给生活换个新感觉' :
                     activity.text;

  return `🎯 今日宜做
${yiActivity}

🍲 今日推荐
${food.food}，${food.desc}

📖 今日推荐
读一首你喜欢的诗，安静10分钟

💡 小提醒
${reminder.text}`;
}
