type MutableRecord = Record<string, unknown>;

export function cloneConfig<T>(value: T): T {
    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value)) as T;
}

export function setConfigValueAtPath(target: MutableRecord, path: string, value: unknown): void {
    const segments = path.split('.').filter(Boolean);
    if (segments.length === 0) return;

    let cursor: MutableRecord = target;
    for (let i = 0; i < segments.length - 1; i++) {
        const segment = segments[i];
        const next = cursor[segment];
        if (typeof next !== 'object' || next === null || Array.isArray(next)) {
            cursor[segment] = {};
        }
        cursor = cursor[segment] as MutableRecord;
    }

    const leafKey = segments[segments.length - 1];
    cursor[leafKey] = value;
}

export function cloneAndSetConfigPath<T extends object>(config: T, path: string, value: unknown): T {
    const cloned = cloneConfig(config) as MutableRecord;
    setConfigValueAtPath(cloned, path, value);
    return cloned as T;
}
