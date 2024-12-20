/**
 * This is executed as a worker thread from the Express server.
 */

import { createClient } from 'redis';
import { faker } from '@faker-js/faker';
const redisUrl = process.env.REDIS_URL || 'redis://localhost:12000';
const numAccts = 1000000;

(async () => {
    console.log('loader - data load started');

    const client = createClient({url: redisUrl});
    client.on('error', (err) => {
        console.error(err.message);
    });  
    await client.connect();
    faker.seed(2024)
    
    for (let i=0; i<numAccts; i++) {
        const name = faker.company.name();
        const subsidiary = faker.company.name();
        const region = faker.location.continent();
        const branchCode = 'B-' + faker.string.alphanumeric(5);
        const internalCode = 'I-' + faker.string.alphanumeric(5);
        const payload = `${name}:${subsidiary}:${region}:${branchCode}:${internalCode}`;
        await Promise.all([
            client.ft.sugAdd(`acctDict`, name, 1, {PAYLOAD: payload}),
            client.ft.sugAdd(`acctDict`, subsidiary, 1, {PAYLOAD: payload}),
            client.ft.sugAdd(`acctDict`, branchCode, 1, {PAYLOAD: payload}),
            client.ft.sugAdd(`acctDict`, internalCode, 1, {PAYLOAD: payload})
        ]);
    }
    
    await client.set('load-complete', 'true');
    await client.disconnect();     
    console.log('loader - data load complete');
})();