import { Queue } from 'bullmq';

export default class CredentialQueue {
    private queue: Queue;

    constructor() {
        this.queue = new Queue('credential-queue', {
            connection: {
                host: 'localhost',
                port: 6379,
                
            }, defaultJobOptions: {
            
                removeOnComplete: true,
                attempts: 3,
                backoff: {
                    type: 'fixed',
                    delay: 1000
                },
                


            }
        })


    }

    public async addJob(data: any) {
        const job = await this.queue.add('credential', data, { removeOnComplete: true, removeOnFail: true });


    }

    public async addBulkJob(jobs: { name: string, data: any }[]) {
        const job = await this.queue.addBulk(jobs);
    }

    public close() {
        return this.queue.close();
    }
}