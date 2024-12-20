/**
 * @fileoverview Express-based API server
 */
import { createClient } from 'redis';
import express from 'express';
import { Worker } from 'worker_threads';
import path from 'path';
import {fileURLToPath} from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = process.env.APP_PORT || 8000;
const redisUrl = process.env.REDIS_URL || 'redis://localhost:12000';
var client;
const app = express();
app.use(express.json());

/**
 * Static html/js files
 */
app.get('/', async(req, res) => {
    if (!await client.exists('load-complete')) {
        res.status(400).send('Data Load in Progress');
    }
    else {
        res.status(200).sendFile(path.join(__dirname,'./public', 'index.html'));
    }
});
app.use(express.static('./app/public'));

/**
 * Account suggestion endpoint.  
 */
app.get('/account/suggest', async (req, res) => {
    const account = decodeURI(req.query.account);
    console.log(`app - GET /account/suggest ${account}`);
   
    try {
        const accts = (await client.sendCommand(['FT.SUGGET', 'acctDict', account, 'WITHPAYLOADS']))
            .filter((_, i) => i % 2 != 0);
        let suggestions = []
        for (const acct of accts) {
            suggestions.push({account: acct})
        }
        res.status(200).json(suggestions);
    }
    catch (err) {
        console.error(`app - GET /account/suggest ${req.query.account} - ${err.message}`)
        res.status(400).json({ 'error': err.message });
    }
});

app.listen(port, async () => {
    client = createClient({url: redisUrl});
    client.on('error', (err) => {
        console.error(err.message);
    });  
    await client.connect();
    if (!await client.exists('load-complete')) {
        console.log(`app wd: ${process.cwd()}`)
        new Worker('./app/loader.js');
    }
    console.log(`Server is up - http://localhost:${port}`)
});