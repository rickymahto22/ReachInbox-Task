
const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:postgres@127.0.0.1:5432/reachinbox",
});

async function testConnection() {
    try {
        await client.connect();
        console.log("Connected successfully to PostgreSQL!");
        const res = await client.query('SELECT NOW()');
        console.log(res.rows[0]);
        await client.end();
    } catch (err) {
        console.error("Connection failed:", err);
    }
}

testConnection();
