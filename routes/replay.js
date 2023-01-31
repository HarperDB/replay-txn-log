const MAX_CONCURRENT_OPERATIONS = 1000;
const LOGGING_PERIOD = 1000;
let outstanding_operations = [];
export default (server, { hdbCore, logger }) => {
	/*
	  POST /txn-replay/range
	  the primary entry point for replaying a transaction log
	*/
	server.post('/range', {
		preValidation: [hdbCore.preValidation[1]],
		handler: async (request, reply) => {
			// Get all the properties. Also make sure we preserve hdb_user so we can just use standard authorization
			// procedures
			const { schema, table, start, end, hdb_user } = request.body || {};
			if (!start)
				throw new Error('A start time must be provided');
			if (!end)
				throw new Error('An end time must be provided');
			let tables = [];
			if (table) {
				if (!schema)
					throw new Error('A table name was provided, but no schema name');
				tables.push({ schema, table });
			} else if (schema) {
				// get all the tables for the schema
				request.body = {
					hdb_user,
					operation: 'describe_schema',
					schema,
				};
				let all_tables = await hdbCore.request(request);
				for (let table_name in all_tables) {
					tables.push({ schema, table: table_name });
				}
			} else {
				// get all the tables for all the schemas
				request.body = {
					hdb_user,
					operation: 'describe_all',
				};
				let all_schemas = await hdbCore.request(request);
				for (let schema_name in all_schemas) {
					let schema = all_schemas[schema_name];
					for (let table_name in schema) {
						tables.push({ schema: schema_name, table: table_name });
					}
				}
			}
			// in case there are multiple, do the tables in parallel to hopefully perform better
			let replay_promises = tables.map(({ schema, table }) => {
				let request_body = {
					hdb_user,
					operation: 'read_transaction_log',
					schema,
					table,
					from: Date.parse(start),
					to: Date.parse(end),
				};
				return replay_range(request_body);
			});
			// wait for all of them, even if some reject/fail
			return Promise.allSettled(replay_promises);
		},
	});
	async function replay_range(request_body) {
		let log = await hdbCore.request({ body: request_body });
		const { schema, table, hdb_user } = request_body;
		let count = 0;
		for await (let { operation, records, hash_values } of log) {
			let update_request = {
				body: {
					hdb_user,
					operation,
					schema,
					table,
				}
			};
			if (operation === 'delete') {
				update_request.body.hash_values = hash_values;
			} else {
				update_request.body.records = records;
			}
			let completion = hdbCore.request(update_request).finally(() => {
				outstanding_operations.splice(outstanding_operations.indexOf(completion), 1);
			});
			// track outstanding operations so we can throttle
			outstanding_operations.push(completion);

			// if we go beyond our limit of concurrent/outstanding operations, wait for the first in the queue to finish
			if (outstanding_operations.length > MAX_CONCURRENT_OPERATIONS) {
				await outstanding_operations[0];
			}
			count++;
			if (count % LOGGING_PERIOD === 0) // periodically log our progress
				logger.log('${count} transactions processed, last updated time: ${records[0].__updated__}');
		}
		await Promise.all(outstanding_operations);
		return `Processed ${count} transactions from ${schema}.${table}`;
	}
};