const LOWER = "abcdefghijkmnopqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%^&*-_=+?";
const ALL = LOWER + UPPER + DIGITS + SYMBOLS;

/** Uniform in [0, max) — modulo of a raw random int would bias toward low indexes. */
function randomIndex(max: number): number {
    const limit = Math.floor(0x100000000 / max) * max;
    const buffer = new Uint32Array(1);
    do {
        crypto.getRandomValues(buffer);
    } while (buffer[0] >= limit);
    return buffer[0] % max;
}

function pick(charset: string): string {
    return charset[randomIndex(charset.length)];
}

/**
 * A password that satisfies core-api's @StrongPassword by construction: one of each class,
 * the rest from the full set, then shuffled so the guaranteed four are not always first.
 * Look-alikes (l/1, O/0) are left out because this gets read out or retyped by a person.
 */
export function generateStrongPassword(length = 16): string {
    const chars = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)];
    while (chars.length < length) chars.push(pick(ALL));

    for (let i = chars.length - 1; i > 0; i--) {
        const j = randomIndex(i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars.join("");
}
