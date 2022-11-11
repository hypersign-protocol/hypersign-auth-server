import { Job } from "bullmq";
import CredentialTxnQueue from "./finalQueue";
import hsSdk from './wallet'
let sdk=undefined

let list = []
const queue = new CredentialTxnQueue();

async function processCredential(job: Job, done: any) {
    if(sdk===undefined){
        sdk = await hsSdk()
    }
    const { proof, credentialStatus } = job.data.data;

    try {

        const txn = await sdk.vc.generateRegisterCredentialStatusTxnMessage(credentialStatus, proof)
        console.log(txn)
        
        list.push(txn)
    } catch (e) {
        console.log('try again', e)
            
    }        

    done(null, "Credential processed");
    return job.data;
}


setInterval(async () => {
    console.log("list", list);
    if (list.length > 0) {
        // form batch txn and send to txn queue
        await queue.addJob(list);
    }
    list = []
    console.log("Done");

}, 5000)

export default processCredential;