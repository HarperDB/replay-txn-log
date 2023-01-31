'use strict';

import { assert } from 'chai';
import axios from 'axios';

const authorization = 'Basic YWRtaW46QWJjMTIzNCE=';//'Basic ' + btoa('admin:Abc1234!');
const TEST_URL = 'http://localhost:9925';
const headers = { authorization };
describe('test schema operations', () => {
	before(async () => {
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
		response = await operation({
			operation: 'insert',
			schema: 'test-replay',
			table: 'some-data',
			records: [
				{id: 1, name: 'one'}
			]
		});
		response = await operation({
			operation: 'insert',
			schema: 'test-replay',
			table: 'some-data',
			records: [
				{id: 2, name: 'two'}
			]
		});
		response = await operation({
			operation: 'delete',
			schema: 'test-replay',
			table: 'some-data',
			hash_values: [1],
		});
		console.log('wrote data');
	});

	it('executes replay of a range', async () => {
		// drop the schema and recreate and try to replay the operations on it
		let response = await operation({
			operation: 'drop_schema',
			schema: 'test-replay',
		});
		console.log('dropped table')
		response = await operation({
			operation: 'create_schema',
			schema: 'test-replay',
		});
		console.log('creating table')
		response = await operation({
			operation: 'create_table',
			schema: 'test-replay',
			table: 'some-data',
			hash_attribute: 'id',
		});

		response = await axios({
			url: 'http://localhost:9926/replay/range',
			method: 'POST',
			data: {
				'schema':'test-replay',
				//'table':'some-data',
				'start': new Date(Date.now() - 86400000).toUTCString(),
				'end': new Date(Date.now() + 86400000).toUTCString(),
			},
			headers
		});
		console.log(response.status, response.data);
		response = await operation({
			operation: 'search_by_hash',
			schema: 'test-replay',
			table: 'some-data',
			hash_values: [1, 2],
			get_attributes: ['*']
		});
		assert.equal(response.data.length, 1);
		console.log(response.status, response.data);
	});
	after(function() {
		return operation({
			operation: 'drop_schema',
			schema: 'test-replay',
		});
	});
});

function operation(operation_data) {
	return axios({
		url: TEST_URL,
		method: 'POST',
		data: operation_data,
		headers
	});
}