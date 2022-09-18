import fs from 'fs';
import path from 'path';
import { Queue } from 'ps-std';
import io from 'serial-async-io';

import { Directory, File_Long, File_Short } from './types';
import { check_filename, fetch_buffer, fetch_object } from './utils';

const write_queue = new Queue(console.error);

export async function fetch(
	hash: string,
	where: string,
	exclude: RegExp = /node_modules/
): Promise<number> {
	const entry = await fetch_object<File_Short | File_Long | Directory>(hash);
	const filename = path.resolve(where, entry.name);

	if (
		!check_filename(entry.name) &&
		!(entry.type === 'directory' && entry.name === '.')
	) {
		throw new Error(`${entry.name} is not a valid filename!`);
	}

	if (filename.match(exclude)) {
		return 0;
	}

	switch (entry.type) {
		case 'directory': {
			await fs.promises.mkdir(filename, { recursive: true });

			const count = await Promise.all(
				entry.children.map((hash) => fetch(hash, filename))
			);

			return count.reduce((a, b) => a + b, 0);
		}
		case 'file': {
			const data = await fetch_buffer(entry.hash);

			await io.write(filename, data);

			return entry.size;
		}
		case 'longfile': {
			await write_queue.promise;

			const stream = fs.createWriteStream(filename);

			for (const part of entry.parts) {
				stream.write(await fetch_buffer(part));
			}

			stream.end(() => {
				write_queue.next_async();
			});

			return entry.size;
		}
	}
}
