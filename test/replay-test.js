'use strict';

import { assert, expect } from 'chai';
import axios from 'axios';

const authorization = 'Basic YWRtaW46QWJjMTIzNCE=';//'Basic ' + btoa('admin:Abc1234!');
const headers = { authorization };
describe('test schema operations', () => {
	before(async () => {
		let response;
		try {
			response = await axios({
				url: 'http://localhost:9925',
				method: 'POST',
				data: {
					operation: 'create_schema',
					schema: 'test-replay',
				},
				headers
			});
		} catch (error) {
			console.error(error);
		}
		try {
			response = await axios({
				url: 'http://localhost:9925',
				method: 'POST',
				data: {
					operation: 'create_table',
					schema: 'test-replay',
					table: 'some-data',
					hash_attribute: 'id'
				},
				headers
			});
		} catch (error) {
			console.error(error);
		}
		response = await axios({
			url: 'http://localhost:9925',
			method: 'POST',
			data: {
				operation: 'insert',
				schema: 'test-replay',
				table: 'some-data',
				records: [
					{id: 1, name: 'one'}
				]
			},
			headers
		});
		response = await axios({
			url: 'http://localhost:9925',
			method: 'POST',
			data: {
				operation: 'insert',
				schema: 'test-replay',
				table: 'some-data',
				records: [
					{id: 2, name: 'two'}
				]
			},
			headers
		});
	});

	it('describes all schemas and expect empty object', async () => {
		let response = await axios({
			url: 'http://localhost:9926/replay/range',
			method: 'POST',
			data: {
				'schema':'test-replay',
				'table':'some-data',
				'start': 'Thu, 26 Jan 2023 01:03:39 GMT',
				'end': 'Fri, 27 Jan 2023 10:03:39 GMT'
			},
			headers
		});
		console.log(response.status, response.data);
	});
});