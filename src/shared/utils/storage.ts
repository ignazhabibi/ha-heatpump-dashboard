export function readStorageItem(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

export function writeStorageItem(key: string, value: string): void {
    try {
        localStorage.setItem(key, value);
    } catch {
        // Ignore storage errors (e.g. private mode, quota exceeded)
    }
}

export function readStorageJson<T extends object>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return fallback;
        return { ...fallback, ...parsed };
    } catch {
        return fallback;
    }
}

export function writeStorageJson(key: string, value: unknown): void {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Ignore storage errors (e.g. private mode, quota exceeded)
    }
}
