import * as coder from '@prokopschield/base64';
import * as Json from 'doge-json';
import nsblob from 'nsblob-native-if-available';
import path from 'path';
import { cacheFn } from 'ps-std';

export const fetch_nsblob = cacheFn(nsblob.fetch);

export async function store_buffer(buffer: Buffer | string): Promise<string> {
	const hex = await nsblob.store(buffer);

	return coder.encode(Buffer.from(hex, 'hex'));
}

export function store_object<T extends Record<string, any>>(object: T) {
	return store_buffer(Json.encode(object));
}

export function fetch_buffer(hash: string): Promise<Buffer> {
	return fetch_nsblob(Buffer.from(coder.decode(hash).buffer).toString('hex'));
}

export async function fetch_object<T>(hash: string): Promise<T> {
	const buffer = await fetch_buffer(hash);

	return Json.decode(String(buffer));
}

export function check_filename(filename: string) {
	return path.basename(path.resolve(filename)) === filename;
}
