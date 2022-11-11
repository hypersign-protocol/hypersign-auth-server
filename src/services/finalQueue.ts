import { Queue } from 'bullmq';

export default class CredentialTxnQueue {
    private queue: Queue;
    constructor() {
        this.queue = new Queue('credential-txn-queue', {
            connection: {
                host: 'localhost',
                port: 6379,
            },defaultJobOptions:{
                removeOnComplete:true,
                removeOnFail:true
            }
        })
    }
    public async addJob(data: any) {
        const job = await this.queue.add('credential-txn', data, { removeOnComplete: true, removeOnFail: true });
    }

    close() {
        return this.queue.close();
    }

}