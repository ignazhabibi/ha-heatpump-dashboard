export const hexToRgb = (hex: string | undefined): string | null => {
    if (!hex) return null;
    let chars: string[];
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        chars = hex.substring(1).split('');
        if (chars.length === 3) {
            chars = [chars[0], chars[0], chars[1], chars[1], chars[2], chars[2]];
        }
        const value = Number.parseInt(chars.join(''), 16);
        return [(value >> 16) & 255, (value >> 8) & 255, value & 255].join(',');
    }
    return null;
};
