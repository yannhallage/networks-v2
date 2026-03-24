export const MAX_BODY_LENGTH_BYTES = 100 * 1024;
export function truncateBody(body) {
    if (body == null)
        return undefined;
    const encoder = new TextEncoder();
    const bytes = encoder.encode(body);
    if (bytes.byteLength <= MAX_BODY_LENGTH_BYTES) {
        return body;
    }
    const truncated = bytes.slice(0, MAX_BODY_LENGTH_BYTES);
    const decoder = new TextDecoder();
    return decoder.decode(truncated) + "\n/* truncated */";
}
