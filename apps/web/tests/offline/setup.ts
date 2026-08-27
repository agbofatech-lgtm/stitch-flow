/**
 * Client offline test environment: real Dexie on top of fake-indexeddb,
 * plus minimal window/localStorage shims (node environment).
 */
import 'fake-indexeddb/auto';

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string) { return this.map.has(key) ? this.map.get(key)! : null; }
  setItem(key: string, value: string) { this.map.set(key, String(value)); }
  removeItem(key: string) { this.map.delete(key); }
  clear() { this.map.clear(); }
}

const globalAny = globalThis as any;
if (!globalAny.window) globalAny.window = globalAny;
if (!globalAny.window.localStorage) {
  globalAny.window.localStorage = new MemoryStorage();
  globalAny.localStorage = globalAny.window.localStorage;
}
