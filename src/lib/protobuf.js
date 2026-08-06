/**
 * Bộ đọc protobuf wire format tối giản, đủ để giải mã payload export của Google Authenticator.
 *
 * Chỉ đọc, không ghi. Không cần .proto descriptor: trả về map fieldNumber => danh sách giá trị thô,
 * tầng trên tự diễn giải theo schema đã biết.
 */

import { fail } from './errors.js';

const WIRE_VARINT = 0;
const WIRE_64BIT = 1;
const WIRE_LENGTH = 2;
const WIRE_32BIT = 5;

class Reader {
    constructor(bytes) {
        this.bytes = bytes;
        this.pos = 0;
    }

    get done() {
        return this.pos >= this.bytes.length;
    }

    readVarint() {
        let result = 0n;
        let shift = 0n;
        while (true) {
            if (this.done) fail('error.protobufTruncatedVarint');
            if (shift > 63n) fail('error.protobufVarintTooLong');
            const byte = this.bytes[this.pos++];
            result |= BigInt(byte & 0x7f) << shift;
            if ((byte & 0x80) === 0) break;
            shift += 7n;
        }
        return result;
    }

    readBytes(length) {
        if (this.pos + length > this.bytes.length) {
            fail('error.protobufOverrun');
        }
        const slice = this.bytes.subarray(this.pos, this.pos + length);
        this.pos += length;
        return slice;
    }

    skip(count) {
        if (this.pos + count > this.bytes.length) {
            fail('error.protobufTruncated');
        }
        this.pos += count;
    }
}

/**
 * @param {Uint8Array} bytes
 * @returns {Map<number, Array<bigint|Uint8Array>>}
 */
export function decodeMessage(bytes) {
    const reader = new Reader(bytes);
    const fields = new Map();

    const push = (fieldNumber, value) => {
        const bucket = fields.get(fieldNumber);
        if (bucket) bucket.push(value);
        else fields.set(fieldNumber, [value]);
    };

    while (!reader.done) {
        const tag = reader.readVarint();
        const fieldNumber = Number(tag >> 3n);
        const wireType = Number(tag & 7n);

        if (fieldNumber === 0) fail('error.protobufBadFieldNumber');

        switch (wireType) {
            case WIRE_VARINT:
                push(fieldNumber, reader.readVarint());
                break;
            case WIRE_64BIT:
                reader.skip(8);
                break;
            case WIRE_LENGTH: {
                const length = Number(reader.readVarint());
                push(fieldNumber, reader.readBytes(length));
                break;
            }
            case WIRE_32BIT:
                reader.skip(4);
                break;
            default:
                fail('error.protobufBadWireType', { wireType });
        }
    }

    return fields;
}

export function firstVarint(fields, fieldNumber, fallback = 0n) {
    const values = fields.get(fieldNumber);
    if (!values || values.length === 0) return fallback;
    const value = values[values.length - 1];
    return typeof value === 'bigint' ? value : fallback;
}

export function firstBytes(fields, fieldNumber) {
    const values = fields.get(fieldNumber);
    if (!values || values.length === 0) return null;
    const value = values[values.length - 1];
    return value instanceof Uint8Array ? value : null;
}

export function allBytes(fields, fieldNumber) {
    const values = fields.get(fieldNumber) ?? [];
    return values.filter((value) => value instanceof Uint8Array);
}

export function firstString(fields, fieldNumber) {
    const bytes = firstBytes(fields, fieldNumber);
    return bytes ? new TextDecoder().decode(bytes) : '';
}
