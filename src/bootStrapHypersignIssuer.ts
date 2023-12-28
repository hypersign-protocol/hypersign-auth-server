import path from "path";
import { HypersignSSISdk } from 'hs-ssi-sdk'
import { store } from './utils/file';
import dotenv from "dotenv";
import fs from 'fs';
import HIDWallet from 'hid-hd-wallet';

let walletOptions = {
    hidNodeRPCUrl: process.env.HIDNODE_RPC_URL,
    hidNodeRestUrl: process.env.HIDNODE_REST_URL,
    namespace: 'testnet'
}

let mnemonic = process.env.HID_WALLET_MNEMONIC; 

const hsJsonTemplate = {
    "keys": {
        "publicKey": {
            "@context": "https://w3id.org/security/v2",
            "id": "did:hid:devnet:z6Mko5PWRZ8nERBjrFLigcsHWTtXcjXLUvrrgtgK5kwZ5e84",
            "type": "Ed25519VerificationKey2020",
            "publicKeyMultibase": "z6Mko5PWRZ8nERBjrFLigcsHWTtXcjXLUvrrgtgK5kwZ5e84"
        },
        "privateKeyMultibase": "zrv3kE9qXR66oD7Aui9wjB9xKvLeiRnP8EvMEijD7JJqMtL8WXENfLnftjGyAV2Tvni6Cnm6WP8mxSUwb2GSjmtmitC",
        "verificationMethodId": ""
    },
    "schemaId": "sch:hid:devnet:z6Mkw8Qd5scLNPp2ckZY1xtZzmdoBMPTnjq9q4bPNLffLGsu:1.0",
    "networkUrl": "http://127.0.0.1:26657/",
    "networkRestUrl": "http://127.0.0.1:1317/",
    "mail": {
        "host": "",
        "port": 465,
        "user": "",
        "pass": "",
        "name": ""
    },
    "jwt": {
        "secret": "00c2c433-a077-4e68-b19c-1234f014a510",
        "expiryTime": 259200
    },
    "appCredential": {
        "credentialSubject": {
            "name": "Hypersign Auth Server",
            "did": "did:hid:testnet:z8uyZoEA2JTCMWfadrSPaqyWmwzwc3qAwAM4snVrfLKue",
            "owner": "did:hid:testnet:z8uyZoEA2JTCMWfadrSPaqyWmwzwc3qAwAM4snVrfLKue",
            "schemaId": "sch:hid:devnet:z6Mkw8Qd5scLNPp2ckZY1xtZzmdoBMPTnjq9q4bPNLffLGsu:1.0",
            "serviceEp": "http://localhost:8001",
            "subscriptionId": "dummy_id",
            "planId": "dummy_id",
            "planName": "dummy_id",
            "id": "did:hid:testnet:z8uyZoEA2JTCMWfadrSPaqyWmwzwc3qAwAM4snVrfLKue",
            "verifyResourcePath": ""
        },
    },
    "isSubcriptionEnabled": false,
    "namespace": "testnet",
    "socketConnTimeOut":180000
}

function setupEnvVar() {
    console.log('   Setting up environment variable...')
    // Enviroment  variable
    ////////////////////////
    if(!process.env.NODE_ENV){
        throw Error("Environment type ( development | production ) must be passed as NODE_ENV")
    }
    const envPath = path.resolve(
      __dirname,
      "../",
      process.env.NODE_ENV + ".env"
    );

    if (fs.existsSync(envPath)) {
      dotenv.config({
        path: envPath,
      });
    } else {
      dotenv.config();
    }

     walletOptions = {
        hidNodeRPCUrl: process.env.HIDNODE_RPC_URL,
        hidNodeRestUrl: process.env.HIDNODE_REST_URL,
        namespace: process.env.NAMESPACE || 'testnet'
    }

     mnemonic = process.env.HID_WALLET_MNEMONIC; 

}

async function getOfflineSigner(){
    console.log('   Getting getOfflineSigner...')
    const hidWalletInstance = new HIDWallet(walletOptions);
    await hidWalletInstance.generateWallet({ mnemonic  })
    hidWalletInstance.offlineSigner.getAccounts().then(console.log)
    return hidWalletInstance.offlineSigner
}

async function getHypersignSSISDK() {
    console.log('   Getting getHypersignSSISDK...')
    hsJsonTemplate.networkRestUrl = walletOptions.hidNodeRestUrl
    hsJsonTemplate.networkUrl = walletOptions.hidNodeRPCUrl
    hsJsonTemplate.namespace = walletOptions.namespace
    

    const hsSDK = new HypersignSSISdk({
        offlineSigner: await getOfflineSigner(),
        nodeRpcEndpoint: walletOptions.hidNodeRPCUrl,
        nodeRestEndpoint: walletOptions.hidNodeRestUrl,
        namespace: walletOptions.namespace
    })

    await hsSDK.init()
    return hsSDK
}

async function generateKeys(){
    console.log('   Generating keys()...')
    const hypersignSDK = await getHypersignSSISDK()
    const keys = await hypersignSDK.did.generateKeys({})

    hsJsonTemplate.keys.publicKey.publicKeyMultibase = keys.publicKeyMultibase
    hsJsonTemplate.keys.privateKeyMultibase = keys.privateKeyMultibase 
}

async function createAndRegisterIssuerDID(){
    
    const hypersignSDK = await getHypersignSSISDK()
    console.log('   Generating Issuer DID document...')
    const didDocument = await hypersignSDK.did.generate({ publicKeyMultibase: hsJsonTemplate.keys.publicKey.publicKeyMultibase })

    console.log('   Registering Issuer DID document...')
    hsJsonTemplate.keys.verificationMethodId = didDocument.verificationMethod[0].id
    await hypersignSDK.did.register({ didDocument, privateKeyMultibase: hsJsonTemplate.keys.privateKeyMultibase, verificationMethodId : hsJsonTemplate.keys.verificationMethodId});
    
    hsJsonTemplate.keys.publicKey.id = didDocument.id;
    hsJsonTemplate.appCredential.credentialSubject.did = hsJsonTemplate.keys.publicKey.id
    hsJsonTemplate.appCredential.credentialSubject.owner = hsJsonTemplate.keys.publicKey.id
}

async function generateAndRegisterSchema(){
    const hypersignSDK = await getHypersignSSISDK()
    console.log('   Generating HypersignEmailCredential Schema...')
    const schema = await hypersignSDK.schema.generate({
        name: "HypersignEmailCredential",
        description: "Schema for email credential",
        author: hsJsonTemplate.keys.publicKey.id,
        fields: [{
            name: 'name',
            type: 'string',
            isRequired: true
        },
        {
            name: 'email',
            type: 'string',
            isRequired: true
        }],
        additionalProperties:  false
    })

    // sign a schema 
    console.log('   Signing HypersignEmailCredential Schema...')
    const signedSchema = await hypersignSDK.schema.sign({
        privateKeyMultibase: hsJsonTemplate.keys.privateKeyMultibase,
        schema,
        verificationMethodId: hsJsonTemplate.keys.verificationMethodId
    })
    

    // register a schema
    console.log('   Registering HypersignEmailCredential Schema...')
    await hypersignSDK.schema.register({
        schema: signedSchema,
    })

    hsJsonTemplate.schemaId = signedSchema.id;
    hsJsonTemplate.appCredential.credentialSubject.schemaId = hsJsonTemplate.schemaId
    hsJsonTemplate.appCredential.credentialSubject.serviceEp = process.env.SERVICE_END_POINT

}

async function saveHypersignJSONfile(){
    console.log('Boostrap started...')
    setupEnvVar()

    await generateKeys()

    await createAndRegisterIssuerDID()

    await generateAndRegisterSchema()
    
    console.log('   Storing hypersign.json file...')
    
    const hypersignFilePath = path.join(__dirname + "/../" + "/hypersign.json")
    await store(hsJsonTemplate, hypersignFilePath);
    console.log('Boostrap completed successfully!')

}

saveHypersignJSONfile()







