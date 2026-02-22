import type { FreeTierUsage, FreeTierLimits } from '../../types/llm';

const FREE_TIER_STORAGE_KEY = 'free_tier_usage';

/**
 * Get hardcoded free tier limits
 */
export function getFreeTierLimits(): FreeTierLimits {
  return {
    maxTokensPerDay: 10000000,     // 10M tokens/day (very generous)
    maxRequestsPerHour: 10,        // 10 requests/hour for shared free tier
    freeModels: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
    ],
  };
}

/**
 * Load free tier usage from localStorage
 */
export function loadFreeTierUsage(): FreeTierUsage {
  try {
    const stored = localStorage.getItem(FREE_TIER_STORAGE_KEY);
    if (!stored) {
      return getDefaultUsage();
    }

    const usage = JSON.parse(stored) as FreeTierUsage;

    // Reset counters if needed (new day or new hour)
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Reset daily counters if it's a new day
    if (usage.lastResetDate !== today) {
      usage.dailyTokensUsed = 0;
      usage.lastResetDate = today;
    }

    // Reset hourly counter if it's been an hour
    const hourInMs = 60 * 60 * 1000;
    if (now - usage.lastHourReset > hourInMs) {
      usage.hourlyRequestCount = 0;
      usage.lastHourReset = now;
    }

    return usage;
  } catch (error) {
    console.error('Error loading free tier usage:', error);
    return getDefaultUsage();
  }
}

/**
 * Save free tier usage to localStorage
 */
export function saveFreeTierUsage(usage: FreeTierUsage): void {
  try {
    localStorage.setItem(FREE_TIER_STORAGE_KEY, JSON.stringify(usage));
  } catch (error) {
    console.error('Error saving free tier usage:', error);
  }
}

/**
 * Check if user is within quota limits
 * Returns { allowed: true } if within limits
 * Returns { allowed: false, reason: string } if over limits
 */
export function checkQuota(): { allowed: boolean; reason?: string } {
  const usage = loadFreeTierUsage();
  const limits = getFreeTierLimits();

  // Check daily token limit
  if (usage.dailyTokensUsed >= limits.maxTokensPerDay) {
    return {
      allowed: false,
      reason: `Daily token limit reached (${limits.maxTokensPerDay} tokens). Resets at midnight.`,
    };
  }

  // Check hourly request limit
  if (usage.hourlyRequestCount >= limits.maxRequestsPerHour) {
    const nextResetTime = new Date(usage.lastHourReset + 60 * 60 * 1000);
    const minutesUntilReset = Math.ceil((nextResetTime.getTime() - Date.now()) / (60 * 1000));

    return {
      allowed: false,
      reason: `Hourly request limit reached (${limits.maxRequestsPerHour} requests/hour). Try again in ${minutesUntilReset} minutes.`,
    };
  }

  return { allowed: true };
}

/**
 * Record usage after a successful API call
 */
export function recordUsage(tokens: number): void {
  const usage = loadFreeTierUsage();
  const now = Date.now();

  usage.tokensUsed += tokens;
  usage.dailyTokensUsed += tokens;
  usage.requestCount += 1;
  usage.hourlyRequestCount += 1;
  usage.lastRequestTime = now;

  saveFreeTierUsage(usage);

  // Dispatch custom event to notify UI components
  window.dispatchEvent(new CustomEvent('free-tier-usage-updated'));
}

/**
 * Get default usage object
 */
function getDefaultUsage(): FreeTierUsage {
  const now = Date.now();
  const today = new Date().toISOString().split('T')[0];

  return {
    tokensUsed: 0,
    requestCount: 0,
    lastRequestTime: 0,
    dailyTokensUsed: 0,
    hourlyRequestCount: 0,
    lastResetDate: today,
    lastHourReset: now,
  };
}

/**
 * Get usage stats for display in UI
 */
export function getUsageStats(): {
  dailyTokensUsed: number;
  dailyTokensRemaining: number;
  dailyTokensPercentUsed: number;
  hourlyRequestsUsed: number;
  hourlyRequestsRemaining: number;
  totalTokensUsed: number;
  totalRequests: number;
} {
  const usage = loadFreeTierUsage();
  const limits = getFreeTierLimits();

  const dailyTokensRemaining = Math.max(0, limits.maxTokensPerDay - usage.dailyTokensUsed);
  const dailyTokensPercentUsed = (usage.dailyTokensUsed / limits.maxTokensPerDay) * 100;
  const hourlyRequestsRemaining = Math.max(0, limits.maxRequestsPerHour - usage.hourlyRequestCount);

  return {
    dailyTokensUsed: usage.dailyTokensUsed,
    dailyTokensRemaining,
    dailyTokensPercentUsed,
    hourlyRequestsUsed: usage.hourlyRequestCount,
    hourlyRequestsRemaining,
    totalTokensUsed: usage.tokensUsed,
    totalRequests: usage.requestCount,
  };
}

/**
 * Reset all usage stats (for testing or admin purposes)
 */
export function resetUsage(): void {
  saveFreeTierUsage(getDefaultUsage());
}
