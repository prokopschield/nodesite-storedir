import * as Json from 'doge-json';
import fs from 'fs';
import path from 'path';
import { cacheFn, ProceduralQueue } from 'ps-std';
import io from 'serial-async-io';

import { Directory, File_Long, File_Short } from './types';
import { store_buffer, store_object } from './utils';

const stat = cacheFn(io.stat);

const streamer = new ProceduralQueue((filename: string) => {
	return new Promise<string[]>((resolve) => {
		const chunks = new Array<Promise<string>>();
		const stream = fs.createReadStream(filename);

		stream.on('data', (chunk) => chunks.push(store_buffer(chunk)));
		stream.on('end', () => resolve(Promise.all(chunks)));
	});
});

export async function store_stream(filename: string): Promise<string[]> {
	const { output } = await streamer.await(filename);

	return output;
}

export async function store_multiple(filenames: string[]): Promise<string[]> {
	const promises = new Array<string>();

	for (const filename of filenames) {
		promises.push(await store(filename));
	}

	return Promise.all(promises);
}

export async function store(filename: string): Promise<string> {
	try {
		const stats = await stat(filename);

		if (!stats) {
			throw `Cannot access ${filename}`;
		} else if (stats.isDirectory()) {
			const list = await fs.promises.readdir(filename);
			const files = list.map((child) => path.resolve(filename, child));
			const children = await store_multiple(files);

			const record: Directory = {
				name: path.basename(filename),
				type: 'directory',
				children: children,
			};

			return store_object(record);
		} else if (stats.isFile()) {
			if (stats.size > stats.blksize) {
				const parts = await store_stream(filename);

				const entry: File_Long = {
					name: path.basename(filename),
					type: 'longfile',
					parts,
					size: stats.size,
				};

				return store_object(entry);
			} else {
				const entry: File_Short = {
					name: path.basename(filename),
					type: 'file',
					hash: await store_buffer(await io.read(filename)),
					size: stats.size,
				};

				return store_object(entry);
			}
		} else {
			throw Json.encode({ stats });
		}
	} catch (error) {
		const buffer = Buffer.from(String(error));
		const hash = await store_buffer(buffer);
		const size = buffer.length;

		const record: File_Short = {
			name: path.basename(filename),
			type: 'file',
			hash,
			size,
		};

		return store_object(record);
	}
}
