import type { AppRouteName } from './routes';

type Listener = (route: AppRouteName) => void;

class RouteBus {
  private listeners: Set<Listener> = new Set();

  emit(route: AppRouteName) {
    for (const l of this.listeners) l(route);
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const routeBus = new RouteBus();


