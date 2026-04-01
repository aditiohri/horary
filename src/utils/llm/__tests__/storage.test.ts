import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DEFAULT_TIMEOUT, PROVIDER_CONFIGS } from '../../../types/llm';

// Mock the environment module so we can control canUseOllama() / getDefaultProvider()
// without depending on window.location.hostname in jsdom.
vi.mock('../../environment', () => ({
  canUseOllama: vi.fn(() => true),       // default: local dev
  getDefaultProvider: vi.fn(() => 'ollama'), // default: local dev
}));

// Import after mock setup so storage.ts picks up the mocked module
import { getDefaultSettings, loadSettings, saveSettings, clearSettings } from '../storage';
import { canUseOllama, getDefaultProvider } from '../../environment';

beforeEach(() => {
  localStorage.clear();
  // Reset mocks to the "local" defaults before each test
  vi.mocked(canUseOllama).mockReturnValue(true);
  vi.mocked(getDefaultProvider).mockReturnValue('ollama');
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// getDefaultSettings
// ---------------------------------------------------------------------------
describe('getDefaultSettings', () => {
  it('returns correct Ollama defaults', () => {
    const s = getDefaultSettings('ollama');
    expect(s.provider).toBe('ollama');
    if (s.provider === 'ollama') {
      expect(s.baseUrl).toBe('http://localhost:11434/v1/');
      expect(s.model).toBe(PROVIDER_CONFIGS.ollama.defaultModel);
      expect(s.timeout).toBe(DEFAULT_TIMEOUT);
    }
  });

  it('returns correct groq-free defaults', () => {
    const s = getDefaultSettings('groq-free');
    expect(s.provider).toBe('groq-free');
    if (s.provider === 'groq-free') {
      expect(s.mode).toBe('free-tier');
      expect(s.model).toBe(PROVIDER_CONFIGS['groq-free'].defaultModel);
      expect(s.timeout).toBe(DEFAULT_TIMEOUT);
    }
  });

  it('returns correct groq defaults with empty apiKey', () => {
    const s = getDefaultSettings('groq');
    expect(s.provider).toBe('groq');
    if (s.provider === 'groq') {
      expect(s.apiKey).toBe('');
      expect(s.model).toBe(PROVIDER_CONFIGS.groq.defaultModel);
    }
  });
});

// ---------------------------------------------------------------------------
// loadSettings — no stored data
// ---------------------------------------------------------------------------
describe('loadSettings — no stored data', () => {
  it('returns ollama defaults in a local environment', () => {
    vi.mocked(canUseOllama).mockReturnValue(true);
    vi.mocked(getDefaultProvider).mockReturnValue('ollama');
    const s = loadSettings();
    expect(s.provider).toBe('ollama');
  });

  it('returns groq-free defaults in a deployed environment', () => {
    vi.mocked(canUseOllama).mockReturnValue(false);
    vi.mocked(getDefaultProvider).mockReturnValue('groq-free');
    const s = loadSettings();
    expect(s.provider).toBe('groq-free');
  });
});

// ---------------------------------------------------------------------------
// saveSettings / loadSettings round-trip
// ---------------------------------------------------------------------------
describe('saveSettings / loadSettings round-trip', () => {
  it('persists and restores groq-free settings', () => {
    const settings = getDefaultSettings('groq-free');
    saveSettings(settings);
    const loaded = loadSettings();
    expect(loaded.provider).toBe('groq-free');
    expect(loaded.model).toBe(settings.model);
  });

  it('persists and restores groq settings including the apiKey', () => {
    const settings = { ...getDefaultSettings('groq'), apiKey: 'gsk_test_abc123' } as const;
    saveSettings(settings);
    const loaded = loadSettings();
    expect(loaded.provider).toBe('groq');
    if (loaded.provider === 'groq') {
      expect(loaded.apiKey).toBe('gsk_test_abc123');
    }
  });

  it('fills missing fields from defaults on load', () => {
    // Save an incomplete settings object (simulating an older stored version)
    localStorage.setItem('llm_settings', JSON.stringify({ provider: 'groq', apiKey: 'gsk_x' }));
    const loaded = loadSettings();
    expect(loaded.provider).toBe('groq');
    if (loaded.provider === 'groq') {
      // timeout should be filled from defaults
      expect(loaded.timeout).toBe(DEFAULT_TIMEOUT);
    }
  });
});

// ---------------------------------------------------------------------------
// loadSettings — model validation
// ---------------------------------------------------------------------------
describe('loadSettings — model validation', () => {
  it('replaces a stored model that is no longer in suggestedModels with the provider default', () => {
    const settings = { ...getDefaultSettings('groq-free'), model: 'gpt-5-turbo-ultra-deprecated' };
    saveSettings(settings);
    const loaded = loadSettings();
    expect(loaded.model).toBe(PROVIDER_CONFIGS['groq-free'].defaultModel);
  });
});

// ---------------------------------------------------------------------------
// loadSettings — Ollama on deployed site
// ---------------------------------------------------------------------------
describe('loadSettings — Ollama on deployed site', () => {
  it('switches to groq-free when ollama is stored but site is deployed', () => {
    saveSettings(getDefaultSettings('ollama'));
    vi.mocked(canUseOllama).mockReturnValue(false);
    vi.mocked(getDefaultProvider).mockReturnValue('groq-free');
    const loaded = loadSettings();
    expect(loaded.provider).toBe('groq-free');
  });
});

// ---------------------------------------------------------------------------
// loadSettings — legacy migration
// ---------------------------------------------------------------------------
describe('loadSettings — legacy migration', () => {
  it('migrates ollama_settings to llm_settings and removes the legacy key', () => {
    const legacy = {
      baseUrl: 'http://localhost:11434/v1/',
      model: 'llama3.2:latest',
      timeout: DEFAULT_TIMEOUT,
    };
    localStorage.setItem('ollama_settings', JSON.stringify(legacy));

    const loaded = loadSettings();
    expect(loaded.provider).toBe('ollama');
    if (loaded.provider === 'ollama') {
      expect(loaded.baseUrl).toBe(legacy.baseUrl);
    }

    // Legacy key removed, new key written
    expect(localStorage.getItem('ollama_settings')).toBeNull();
    expect(localStorage.getItem('llm_settings')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// clearSettings
// ---------------------------------------------------------------------------
describe('clearSettings', () => {
  it('removes llm_settings from localStorage', () => {
    saveSettings(getDefaultSettings('groq-free'));
    expect(localStorage.getItem('llm_settings')).not.toBeNull();
    clearSettings();
    expect(localStorage.getItem('llm_settings')).toBeNull();
  });

  it('also removes the legacy ollama_settings key', () => {
    localStorage.setItem('ollama_settings', JSON.stringify({ model: 'llama3.2:latest' }));
    clearSettings();
    expect(localStorage.getItem('ollama_settings')).toBeNull();
  });
});
