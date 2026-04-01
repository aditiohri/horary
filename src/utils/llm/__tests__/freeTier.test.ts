import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getFreeTierLimits,
  loadFreeTierUsage,
  checkQuota,
  recordUsage,
  getUsageStats,
  resetUsage,
} from '../freeTier';
import type { FreeTierUsage } from '../../../types/llm';

const STORAGE_KEY = 'free_tier_usage';

/** Seed localStorage with a FreeTierUsage, defaulting to clean state for today */
function seed(overrides: Partial<FreeTierUsage> = {}): void {
  const today = new Date().toISOString().split('T')[0];
  const defaults: FreeTierUsage = {
    tokensUsed: 0,
    requestCount: 0,
    lastRequestTime: 0,
    dailyTokensUsed: 0,
    hourlyRequestCount: 0,
    lastResetDate: today,
    lastHourReset: Date.now(),
    ...overrides,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.useRealTimers());

// ---------------------------------------------------------------------------
// getFreeTierLimits
// ---------------------------------------------------------------------------
describe('getFreeTierLimits', () => {
  it('returns 10_000_000 daily token limit', () => {
    expect(getFreeTierLimits().maxTokensPerDay).toBe(10_000_000);
  });

  it('returns 10 hourly request limit', () => {
    expect(getFreeTierLimits().maxRequestsPerHour).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// loadFreeTierUsage
// ---------------------------------------------------------------------------
describe('loadFreeTierUsage', () => {
  it('returns zero-state defaults when localStorage is empty', () => {
    const usage = loadFreeTierUsage();
    expect(usage.dailyTokensUsed).toBe(0);
    expect(usage.hourlyRequestCount).toBe(0);
    expect(usage.tokensUsed).toBe(0);
    expect(usage.requestCount).toBe(0);
  });

  it('preserves counters when date and hour are unchanged', () => {
    seed({ dailyTokensUsed: 500, hourlyRequestCount: 3 });
    const usage = loadFreeTierUsage();
    expect(usage.dailyTokensUsed).toBe(500);
    expect(usage.hourlyRequestCount).toBe(3);
  });

  it('resets dailyTokensUsed when the date has changed', () => {
    seed({ dailyTokensUsed: 5000, lastResetDate: '2000-01-01' });
    const usage = loadFreeTierUsage();
    expect(usage.dailyTokensUsed).toBe(0);
  });

  it('resets hourlyRequestCount when more than an hour has passed', () => {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    seed({ hourlyRequestCount: 7, lastHourReset: twoHoursAgo });
    const usage = loadFreeTierUsage();
    expect(usage.hourlyRequestCount).toBe(0);
  });

  it('does not reset hourly counter when less than an hour has passed', () => {
    const thirtyMinsAgo = Date.now() - 30 * 60 * 1000;
    seed({ hourlyRequestCount: 4, lastHourReset: thirtyMinsAgo });
    const usage = loadFreeTierUsage();
    expect(usage.hourlyRequestCount).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// checkQuota
// ---------------------------------------------------------------------------
describe('checkQuota', () => {
  it('returns { allowed: true } when well within limits', () => {
    seed({ dailyTokensUsed: 100, hourlyRequestCount: 2 });
    expect(checkQuota()).toEqual({ allowed: true });
  });

  it('returns { allowed: true } when storage is empty', () => {
    expect(checkQuota()).toEqual({ allowed: true });
  });

  it('blocks when dailyTokensUsed equals the daily limit', () => {
    seed({ dailyTokensUsed: 10_000_000 });
    const result = checkQuota();
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('daily limit');
  });

  it('blocks when hourlyRequestCount equals the hourly limit', () => {
    seed({ hourlyRequestCount: 10 });
    const result = checkQuota();
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('hourly limit');
  });

  it('includes correct minutes-until-reset in the hourly block reason', () => {
    const fixedNow = new Date('2024-06-15T12:30:00.000Z').getTime();
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);

    const thirtyMinsAgo = fixedNow - 30 * 60 * 1000;
    seed({ hourlyRequestCount: 10, lastHourReset: thirtyMinsAgo });

    const result = checkQuota();
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('30 minute');
  });
});

// ---------------------------------------------------------------------------
// recordUsage
// ---------------------------------------------------------------------------
describe('recordUsage', () => {
  it('increments all usage counters by the given token count', () => {
    seed({ tokensUsed: 100, dailyTokensUsed: 50, requestCount: 2, hourlyRequestCount: 1 });
    recordUsage(200);
    const usage = loadFreeTierUsage();
    expect(usage.tokensUsed).toBe(300);
    expect(usage.dailyTokensUsed).toBe(250);
    expect(usage.requestCount).toBe(3);
    expect(usage.hourlyRequestCount).toBe(2);
  });

  it('updates lastRequestTime to approximately now', () => {
    const before = Date.now();
    seed();
    recordUsage(100);
    const usage = loadFreeTierUsage();
    expect(usage.lastRequestTime).toBeGreaterThanOrEqual(before);
  });

  it('dispatches a free-tier-usage-updated CustomEvent on window', () => {
    seed();
    const spy = vi.fn();
    window.addEventListener('free-tier-usage-updated', spy);
    recordUsage(500);
    window.removeEventListener('free-tier-usage-updated', spy);
    expect(spy).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// getUsageStats
// ---------------------------------------------------------------------------
describe('getUsageStats', () => {
  it('calculates dailyTokensRemaining as limit minus used', () => {
    seed({ dailyTokensUsed: 1_000_000 });
    const stats = getUsageStats();
    expect(stats.dailyTokensRemaining).toBe(9_000_000);
    expect(stats.dailyTokensUsed).toBe(1_000_000);
  });

  it('clamps dailyTokensRemaining to zero when usage exceeds limit', () => {
    seed({ dailyTokensUsed: 11_000_000 });
    const stats = getUsageStats();
    expect(stats.dailyTokensRemaining).toBe(0);
  });

  it('calculates hourlyRequestsRemaining correctly', () => {
    seed({ hourlyRequestCount: 6 });
    const stats = getUsageStats();
    expect(stats.hourlyRequestsRemaining).toBe(4);
    expect(stats.hourlyRequestsUsed).toBe(6);
  });

  it('reports totalTokensUsed and totalRequests from the usage object', () => {
    seed({ tokensUsed: 42_000, requestCount: 17 });
    const stats = getUsageStats();
    expect(stats.totalTokensUsed).toBe(42_000);
    expect(stats.totalRequests).toBe(17);
  });
});

// ---------------------------------------------------------------------------
// resetUsage
// ---------------------------------------------------------------------------
describe('resetUsage', () => {
  it('sets all counters to zero', () => {
    seed({ tokensUsed: 5000, dailyTokensUsed: 3000, hourlyRequestCount: 8, requestCount: 15 });
    resetUsage();
    const usage = loadFreeTierUsage();
    expect(usage.tokensUsed).toBe(0);
    expect(usage.dailyTokensUsed).toBe(0);
    expect(usage.hourlyRequestCount).toBe(0);
    expect(usage.requestCount).toBe(0);
  });

  it('allows quota again after reset even when previously over both limits', () => {
    seed({ dailyTokensUsed: 10_000_000, hourlyRequestCount: 10 });
    expect(checkQuota().allowed).toBe(false);
    resetUsage();
    expect(checkQuota()).toEqual({ allowed: true });
  });
});
