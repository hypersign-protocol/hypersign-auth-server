import { nodeServer, logger, bootstrapConfig, hs_schema } from '../config'
import fetch from 'node-fetch'
import path from 'path'
import { store, retrive } from '../utils/file';


const  {keysfilePath, schemafilePath} =  bootstrapConfig;

// Register DID
const registerDid = async () => {
    logger.info("Registering did start....")
    const url = `${nodeServer.baseURl}${nodeServer.didCreateEp}?name=${hs_schema.APP_NAME}`;
    // Call create api of core and get keys.json
    const resp = await fetch(url);
    const json = await resp.json();
    if(json && json.status != 200) throw new Error(json.error);
    // store keys into file 
    const { keys } = json.message;
    logger.info("Storing keys = " + JSON.stringify(keys))
    await store(keys, keysfilePath);
    logger.info("Did registration finished.")
}


// Register schema
const registerSchema = async () => {
    logger.info("Registering schema start....")
    const keys = JSON.parse(await retrive(keysfilePath));
    logger.info("Fetched keys = " + JSON.stringify(keys))
    const url = `${nodeServer.baseURl}${nodeServer.schemaCreateEp}`;
    const schemaData = {
        name: hs_schema.APP_NAME,
        owner: keys.publicKey.id.split('#')[0],
        attributes: hs_schema.ATTRIBUTES,
        description: hs_schema.DESCRIPTION,
    };
    let headers = {
        "Content-Type": "application/json",
    };
    const resp = await fetch(url, {
        method: "POST",
        body: JSON.stringify(schemaData),
        headers,
    });
    const j = await resp.json();
    if (j.status === 200) {
        logger.info("Schema = " + JSON.stringify(j.message))
        await store(j.message, schemafilePath);
        logger.info("Schema registration finished at = " +  schemafilePath)
        return
    } else {
        throw new Error(j.error);
    }
}

export async function bootstrap(){
    await registerDid()
    await registerSchema();
}


