import { Worker } from "bullmq";


export const CredentialWorker= new Worker("credential-queue", __dirname+"/processor.ts", {
    connection: {
        host: "localhost",
        port: 6379,
    },
    limiter:{
        
        max:200,
        duration:7500
    }

})

CredentialWorker.on("completed", (job) => {
    console.log("Job completed", job.returnvalue);

})



