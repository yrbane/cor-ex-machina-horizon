/**
 * Gains des côtés A et B pour une position de crossfader x ∈ [-1, 1].
 * constant-power : équi-puissance (cos/sin) ; sharp : cut DJ (pleins gaz au centre).
 */
export function crossfadeGains(x, curve) {
    if (curve === 'sharp') {
        return {
            a: x <= 0 ? 1 : 1 - x,
            b: x >= 0 ? 1 : 1 + x,
        };
    }
    const t = ((x + 1) / 2) * (Math.PI / 2);
    return { a: Math.cos(t), b: Math.sin(t) };
}
