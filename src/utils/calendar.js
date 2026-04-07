/**
 * 知日 - 农历/节气/节日/黄历工具模块
 */

import SolarLunar from 'lunar-calendar';
import dayjs from 'dayjs';

// ===== 基础农历转换 =====
export function solarToLunar(year, month, day) {
  return SolarLunar.solarToLunar(year, month, day);
}

// ===== 天干地支 =====
const tianGan = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const diZhi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const shengXiao = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

export function getGanZhi(year) {
  return tianGan[(year - 4) % 10] + diZhi[(year - 4) % 12] + '年';
}

export function getShengXiao(year) {
  return shengXiao[(year - 4) % 12];
}

// ===== 二十四节气 =====
const jieQi = {
  0: '小寒', 1: '大寒', 2: '立春', 3: '雨水', 4: '惊蛰', 5: '春分',
  6: '清明', 7: '谷雨', 8: '立夏', 9: '小满', 10: '芒种', 11: '夏至',
  12: '小暑', 13: '大暑', 14: '立秋', 15: '处暑', 16: '白露', 17: '秋分',
  18: '寒露', 19: '霜降', 20: '立冬', 21: '小雪', 22: '大雪', 23: '冬至'
};

export function getJieQiName(lunarTerm) {
  return jieQi[lunarTerm] || '';
}

// ===== 传统节日 =====
const festivals = {
  '1-1': '春节',
  '1-15': '元宵节',
  '5-5': '端午节',
  '7-7': '七夕节',
  '7-15': '中元节',
  '8-15': '中秋节',
  '9-9': '重阳节',
  '12-8': '腊八节',
  '12-30': '除夕',
  '12-29': '除夕'
};

export function getFestival(lunarMonth, lunarDay) {
  return festivals[`${lunarMonth}-${lunarDay}`] || '';
}

// ===== 公历节日 =====
const solarFestivals = {
  '1-1': '元旦',
  '2-14': '情人节',
  '3-8': '妇女节',
  '3-12': '植树节',
  '4-1': '愚人节',
  '5-1': '劳动节',
  '5-4': '青年节',
  '6-1': '儿童节',
  '7-1': '建党节',
  '8-1': '建军节',
  '9-10': '教师节',
  '10-1': '国庆节',
  '12-25': '圣诞节'
};

export function getSolarFestival(month, day) {
  return solarFestivals[`${month}-${day}`] || '';
}

// ===== 黄历数据 (简化版) =====
const yiJiBase = [
  { yi: ['祈福', '结婚', '订盟', '纳采'], ji: ['开市', '安葬'] },
  { yi: ['祭祀', '破屋', '坏垣', '余事勿取'], ji: ['诸事不宜'] },
  { yi: ['开市', '交易', '立券', '纳财'], ji: ['结婚', '搬家'] },
  { yi: ['结婚', '出行', '搬家', '动土'], ji: ['开市', '安床'] },
  { yi: ['祭祀', '祈福', '求嗣', '开光'], ji: ['结婚', '开市'] },
  { yi: ['裁衣', '安门', '安床', '安葬'], ji: ['出行', '搬家'] },
  { yi: ['读书', '考试', '签约', '开业'], ji: ['争吵', '诉讼'] },
  { yi: ['旅行', '出差', '探亲', '访友'], ji: ['动土', '破土'] },
  { yi: ['装修', '建房', '购置', '收藏'], ji: ['借贷', '担保'] },
  { yi: ['养生', '健身', '医疗', '调理'], ji: ['熬夜', '过度劳累'] }
];

export function getHuangLi(year, month, day) {
  const seed = (year * 10000 + month * 100 + day) % yiJiBase.length;
  return yiJiBase[seed];
}

// ===== 每日建议 (结合黄历) =====
const suggestions = [
  '今日适合静心冥想，读一本好书',
  '今日适合与朋友聚会，增进感情',
  '今日适合规划未来，制定目标',
  '今日适合整理思绪，反思过去',
  '今日适合学习新知，提升自己',
  '今日适合休息放松，享受当下',
  '今日适合创意表达，展现灵感',
  '今日适合整理收纳，清理空间'
];

export function getDailySuggestion(year, month, day) {
  const index = (year * 10000 + month * 100 + day) % suggestions.length;
  const huangli = getHuangLi(year, month, day);
  return {
    text: suggestions[index],
    yi: huangli.yi,
    ji: huangli.ji
  };
}

// ===== 综合日期信息 =====
export function getDayInfo(year, month, day) {
  const lunar = solarToLunar(year, month, day);
  const ganZhi = getGanZhi(year);
  const shengxiao = getShengXiao(year);
  const jieQiName = lunar.lunarTermName ? jieQi[lunar.lunarTermIndex] : '';
  const festival = getFestival(lunar.lunarMonth, lunar.lunarDay);
  const solarFestival = getSolarFestival(month, day);
  const huangli = getHuangLi(year, month, day);
  const suggestion = getDailySuggestion(year, month, day);

  return {
    solar: { year, month, day, weekDay: dayjs(`${year}-${month}-${day}`).day() },
    lunar: {
      month: lunar.lunarMonth,
      day: lunar.lunarDay,
      monthStr: lunar.lunarMonthName,
      dayStr: lunar.lunarDayName,
      fullStr: `${lunar.lunarMonthName}${lunar.lunarDayName}`
    },
    ganZhi,
    shengxiao,
    jieQi: jieQiName,
    festival: festival || solarFestival,
    huangli,
    suggestion
  };
}

// ===== 获取月份天数 =====
export function getDaysInMonth(year, month) {
  return dayjs(`${year}-${month}-01`).daysInMonth();
}

// ===== 获取月份第一天是星期几 =====
export function getFirstDayOfWeek(year, month) {
  return dayjs(`${year}-${month}-01`).day();
}
