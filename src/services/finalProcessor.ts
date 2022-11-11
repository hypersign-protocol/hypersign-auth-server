import { Job } from "bullmq";
import hsSdk from './wallet'
let sdk=undefined




export default async function processCredentialTxn(job: Job, done: any) {
    //send to blockchain
    if(sdk===undefined){
        sdk = await hsSdk()
    }
    try{
        const txn = await sdk.vc.registerCredentialStatusTxnBulk(job.data)
        console.log("txn", txn);
    }catch(e){
        console.log("error", e);
    }


    done(null, "Credential txn processed");
    return job.data;
}