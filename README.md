# HarperDB Replay Transaction Log Custom Function

This is a custom function (for Fastify) that reads a transaction log for specified schema/table or all tables, with a given date rate, and replays all the transactions in that range as operations that are committed to the database.

This is intended by used after restoring an older database backup/snapshot, and then replay operations to progress forward in the database history to a specific point in time.

The routes assume the custom function is named/deployed as "replay-txn-log".

## Routes

### POST /replay-txn-log/range

The body of the POST should be JSON with the following properties:
* schema - The name of the schema
* table - The name of the table
* start - The start of the range of transactions to replay (in UTC format)
* end - The end of the range of transactions to replay (in UTC format)

This endpoint requires the same authentication as the standard HarperDB operations API.
