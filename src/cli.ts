#!/usr/bin/env node

import nsblob from 'nsblob-native-if-available';
import { argv } from 'process';
import { stat } from 'serial-async-io';

import { fetch } from './fetch';
import { store } from './store';

const file = argv[2] || '.';

async function main() {
	const stats = await stat(file);

	if (stats) {
		const hash = await store(file);

		console.log(hash);
	} else {
		await fetch(file, argv[3] || '.');
	}

	nsblob.socket.close();

	// fix no-exit bug caused by nscdn-hashmap
	require('nsblob').socket.close();
}

main();
