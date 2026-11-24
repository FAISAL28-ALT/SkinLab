/**
 * Bounded LRU in-memory TTL cache with namespace-based invalidation.
 * Prevents memory exhaustion attacks by enforcing a strict maximum entry bound.
 * Zero external dependencies.
 */
export class MemoryCache {
  constructor(defaultTtlMs = 60_000, maxEntries = 500) {
    this.defaultTtlMs = defaultTtlMs;
    this.maxEntries = Math.max(1, maxEntries);
    this.store = new Map();
    this.namespaces = new Map(); // namespace -> Set<key>

    // Proactive background sweep to evict expired items without waiting for access
    const sweepTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (now > entry.expiresAt) {
          this.delete(key);
        }
      }
    }, 60_000);
    sweepTimer.unref();
  }

  get size() {
    return this.store.size;
  }

  set(key, value, ttlMs = this.defaultTtlMs, namespace = null) {
    const expiresAt = Date.now() + ttlMs;

    // Delete first so re-insertion updates LRU ordering
    if (this.store.has(key)) {
      this.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      // Evict least-recently-used (first key in insertion order)
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.delete(oldestKey);
      }
    }

    this.store.set(key, { value, expiresAt, namespace });

    if (namespace) {
      if (!this.namespaces.has(namespace)) {
        this.namespaces.set(namespace, new Set());
      }
      this.namespaces.get(namespace).add(key);
    }
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return null;
    }

    // Refresh LRU position by re-inserting at the end of the Map
    this.store.delete(key);
    this.store.set(key, entry);

    return entry.value;
  }

  delete(key) {
    const entry = this.store.get(key);
    if (entry?.namespace && this.namespaces.has(entry.namespace)) {
      this.namespaces.get(entry.namespace).delete(key);
      if (this.namespaces.get(entry.namespace).size === 0) {
        this.namespaces.delete(entry.namespace);
      }
    }
    this.store.delete(key);
  }

  invalidateNamespace(namespace) {
    const keys = this.namespaces.get(namespace);
    if (!keys) return;

    for (const key of keys) {
      this.store.delete(key);
    }
    this.namespaces.delete(namespace);
  }

  clear() {
    this.store.clear();
    this.namespaces.clear();
  }
}

export const apiCache = new MemoryCache(60_000, 500); // 60s default TTL, 500 max entries
