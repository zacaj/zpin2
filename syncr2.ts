import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'node-scp'

// const scp = require('scp2').Client;

// if (!process.argv[2]) {
//     throw 'remote path required';
// }
const remotePath = process.argv[3] || 'zpin2';
const localPath = process.argv[4] || './';
const address = process.argv[2] || '192.168.2.19';
const username = 'zacaj' || process.argv[5];
const password = 'pass' || process.argv[6];
const toCopy: string[] = [];
console.log('connecting to '+address);
Client({
    port: 22,
    host: address,
    username,
    privateKey: fs.readFileSync('C:/Users/zacaj/.ssh/id_rsa')
    // password,
    // readyTimeout: 0,
}).then(async client => {
    // await client.uploadDir()
/*console.log("starting...");
copyFile('./**').then(() =>*/ {
    console.log('watching, waiting');
    fs.watch(localPath, {
        recursive: true,
    }, async (eventType, filename) => {
        if (filename?.startsWith('.')) {
 /*console.log('skip dot');*/ return;
        }
        try {
            if (filename && fs.statSync(path.resolve(localPath, filename)).isDirectory()) {
                // console.log('skip dir');
                return;
            }
        }
        catch (e: any) {
            if (!e.message.includes('ENOENT'))
                console.error('stat err: ', e);
        }

        console.log(new Date().getHours() + ':' + new Date().getMinutes(), eventType, filename);
        if (filename && !toCopy.includes(filename)) {
            toCopy.push(filename);
            // console.info('queue ', filename, toCopy);
        }
    }).on('error', (err) => {
        console.error('watch error: ', err);
    });
}/*)
.catch(err => console.error('fatal error', err));*/
setTimeout(sync, 50);
async function sync() {
    while (toCopy.length) {
        const filename = toCopy.shift()!;
        try {
            // console.info('start ', filename);
            if (!toCopy.length)
                await new Promise(r => setTimeout(r, 10));
            await copyFile(filename);
            console.info('updated %s, %i remaining', filename, toCopy.length);
        } catch (e) {
            console.error('error ', filename, e);
        }
    }
    setTimeout(sync, 50);
}
async function copyFile(filename: string): Promise<void> {
    const remote = path.posix.join(remotePath, filename);
    // return new Promise((resolve, reject) => {
        // scp(filename, `${username}:${password}@${address}:${remote}`, (err: Error) => {
        //     if (err) reject(err);
        //     else resolve();
        // });
        console.log('copy %s to %s', path.join(localPath, filename), remote);
        await client.uploadFile(path.join(localPath, filename), remote);
        // });
    // });
}
}).catch(err => {
    console.error('client error: ', err);
});