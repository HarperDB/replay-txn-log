'use strict';

import { assert } from 'chai';
import axios from 'axios';

const authorization = 'Basic SERCX0FETUlOOnBhc3N3b3Jk';
const TEST_URL = 'http://localhost:9925';
const headers = { authorization };
let response;
try {
	console.log('setting up schema');
	response = await operation({
		operation: 'create_schema',
		schema: 'test-replay',
	});
} catch (error) {
	console.error(error.message, error.response?.data);
}
try {
	console.log('setting up table');
	response = await operation({
		operation: 'create_table',
		schema: 'test-replay',
		table: 'some-data',
		hash_attribute: 'id'
	});
} catch (error) {
	console.error(error.message, error.response?.data);
}
console.log('writing data');
for (let i = 0; i < 100; i++) {
	response = await operation({
		operation: 'insert',
		schema: 'test-replay',
		table: 'some-data',
		records: [
			{id: Math.floor(Math.random() * 1000), name: 'some data'}
		]
	});
	console.log('inserted data',response?.data);
}


function operation(operation_data) {
	return axios({
		url: TEST_URL,
		method: 'POST',
		data: operation_data,
		headers
	});
}