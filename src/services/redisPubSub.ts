import Redis from 'ioredis'
import hsSdk from './wallet'
import { delay } from 'bullmq'

import { logger, MAXIMUM_DELAY, MAX_BATCH_SIZE, MINIMUM_DELAY ,REDIS_HOST,REDIS_PASSWORD,REDIS_PORT } from '../config'
const redis = new Redis({
    port: parseInt(REDIS_PORT),
    host: REDIS_HOST,
    password: REDIS_PASSWORD,

})

let sdk = undefined
let pause_duration = MINIMUM_DELAY

let erroridx = 0;
let txnidx = 0

const runner = async () => {
    if (sdk === undefined) {
        sdk = await hsSdk()
        try {
            const idx = await redis.call('ft._list') as Array<string>

            if (await redis.hget("vc-counter-vars", "erroridx") === null) {
                erroridx = 0
            } else {
                erroridx = parseInt(await redis.hget("vc-counter-vars", "erroridx"))
            }

            if (await redis.hget("vc-counter-vars", "txnidx") === null) {
                txnidx = 0
            } else {
                txnidx = parseInt(await redis.hget("vc-counter-vars", "txnidx"))
            }


            if (!idx.includes('idx:vc-txn-err')) {
                await redis.call("ft.create", "idx:vc-txn-err", "on", "hash", "prefix", "1", "vc-txn-err:", "schema", "error", "text", "unregistred-credentials", "text")
                console.log("created index for redisearch");

            }
            if (!idx.includes('idx:vc-txn')) {
                await redis.call("ft.create", "idx:vc-txn", "on", "hash", "prefix", "1", "vc-txn:", "schema", "txid", "text", "successful-txn", "text")
                console.log("created index for redisearch");

            }

        } catch (error) {
            console.log(error);

        }
    }
    let list = await redis.lrange('vc-txn', 0, MAX_BATCH_SIZE - 1)
    if (list.length > 0) {
        const newList = []
        let logdata = []
        list.every(async (item) => {
            const elem = JSON.parse(item)// generateTxnMessage(JSON.parse(item).credentialStatus, JSON.parse(item).proof)
            newList.push(elem.txn)
            logdata.push(elem.vcId)
        })
        try {
            const res = await sdk.vc.registerCredentialStatusTxnBulk(newList)
            console.log(res.transactionHash);
            await redis.hset(`vc-txn:${txnidx++}`, { 'txid': res.transactionHash, 'successful-txn': logdata })
            await redis.ltrim('vc-txn', MAX_BATCH_SIZE, -1)
            // const x = await redis.hset(`vc-txn-hash:${res.transactionHash}`, {...logdata})
            //  console.log(x);
            logdata = []
            pause_duration = MINIMUM_DELAY
            return runner()
        }
        catch (err) {
            console.log(err);

            await redis.hset(`vc-txn-err:${erroridx++}`, { "error": err, "unregistred-credentials": logdata })
            //  ft.create idx:vc-txn-err on hash prefix 1 "vc-txn-err:" schema error text unregistred-credentials text
            await redis.ltrim('vc-txn', MAX_BATCH_SIZE, -1)
        }
    }
    // console.log('----------------------------', pause_duration)
    pause_duration > MAXIMUM_DELAY ? pause_duration = MAXIMUM_DELAY : pause_duration = pause_duration + 100

    await delay(pause_duration)
    redis.hset("vc-counter-vars",{erroridx,txnidx})
    return await runner()

}
runner()
