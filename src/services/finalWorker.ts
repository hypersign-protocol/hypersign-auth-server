import { Worker } from "bullmq";


export const CredentialtxnWorker= new Worker("credential-txn-queue", __dirname+"/finalProcessor.ts", {
    connection: {
        host: "localhost",
        port: 6379,
    },

})

CredentialtxnWorker.on("completed", (job) => {
    console.log("Job completed");
    

})



