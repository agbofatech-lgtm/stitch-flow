import type { PlatformRuntime } from '../platform/runtime';

export function authService(runtime: PlatformRuntime) {
  return {
    register: runtime.register,
    login: runtime.login,
  };
}
