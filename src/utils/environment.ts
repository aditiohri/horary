/**
 * Determines if the app is running in local development mode
 */
export function isLocalDevelopment(): boolean {
  // Check if running on localhost or local IP
  const hostname = window.location.hostname;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.endsWith('.local')
  );
}

/**
 * Determines if Ollama can be used in the current environment
 */
export function canUseOllama(): boolean {
  return isLocalDevelopment();
}

/**
 * Gets the default provider based on the current environment
 */
export function getDefaultProvider(): 'ollama' | 'openrouter' {
  return isLocalDevelopment() ? 'ollama' : 'openrouter';
}
