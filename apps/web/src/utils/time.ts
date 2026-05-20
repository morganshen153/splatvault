/**
 * 安全的时间格式化工具
 * 处理毫秒时间戳，带容错保护
 */

const MS_PER_SECOND = 1000;
const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
const MS_THRESHOLD = SECONDS_PER_YEAR * MS_PER_SECOND; // ~31,536,000,000 (2021年后的毫秒值)

/**
 * 检测时间戳单位（秒 vs 毫秒）
 * 基于时间值大小推断：大于阈值认为是毫秒
 */
function detectTimestampUnit(ts: number): 'ms' | 's' {
  return ts > MS_THRESHOLD ? 'ms' : 's';
}

/**
 * 标准化为毫秒时间戳
 * 自动检测并转换秒级时间戳
 */
export function toMilliseconds(ts: number | undefined | null): number | null {
  if (ts == null) return null;
  if (typeof ts !== 'number') return null;
  if (isNaN(ts) || ts <= 0) return null;

  // 自动检测并转换
  if (detectTimestampUnit(ts) === 's') {
    return ts * MS_PER_SECOND;
  }
  return ts;
}

/**
 * 格式化时间为本地字符串
 * 带容错：处理无效值、秒级时间戳、undefined/null
 */
export function formatDateTime(ts: number | undefined | null): string {
  const ms = toMilliseconds(ts);
  if (ms === null) return '-';

  try {
    const date = new Date(ms);
    // 额外检查：如果是 1970 或 1971，可能是数据问题
    if (date.getFullYear() < 2000) {
      console.warn(`[formatDateTime] Suspicious date year: ${date.getFullYear()}, raw: ${ts}`);
      return '-';
    }
    return date.toLocaleString('zh-CN');
  } catch {
    return '-';
  }
}

/**
 * 格式化时间为日期字符串（不含时间）
 */
export function formatDate(ts: number | undefined | null): string {
  const ms = toMilliseconds(ts);
  if (ms === null) return '-';

  try {
    const date = new Date(ms);
    if (date.getFullYear() < 2000) return '-';
    return date.toLocaleDateString('zh-CN');
  } catch {
    return '-';
  }
}
