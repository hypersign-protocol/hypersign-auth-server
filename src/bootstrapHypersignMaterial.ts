import path from "path";
import HypersignSsiSDK from "hs-ssi-sdk";
import { store } from './utils/file';
import dotenv from "dotenv";
import fs from 'fs';
import HIDWallet from 'hid-hd-wallet';
import { Bip39, EnglishMnemonic } from '@cosmjs/crypto'



 const walletOptions = {
        hidNodeRPCUrl: process.env.HIDNODE_RPC_URL,
        hidNodeRestUrl: process.env.HIDNODE_REST_URL
      };



class HypersignWallet {
  private walletInstance:any;
  offlineSigner:any;
  private menemonic:string
  constructor(mnemonic:string){
    this.walletInstance = new HIDWallet(walletOptions);
    this.menemonic = mnemonic;
    this.offlineSigner = null;
  }

  async init(){
    await this.walletInstance.generateWallet({ mnemonic: this.menemonic })
    this.offlineSigner = this.walletInstance.offlineSigner;
  }

  async getAccounts(){
    if(!this.offlineSigner){
      throw new Error('HIDWallet is not initialized')
    }
    return await this.offlineSigner.getAccounts();
  }
}


interface IKeys {
  privateKeyMultibase: string;
  publicKeyMultibase:string;
  
}


// {
//   "publicKey": {
//       "@context": "https://w3id.org/security/v2",
//       "id": "did:hid:testnet:z8uyZoEA2JTCMWfadrSPaqyWmwzwc3qAwAM4snVrfLKue",
//       "type": "Ed25519VerificationKey2018",
//       "publicKeyBase58": "z6MkqKwdcpajzu3dyANeRDhHNEEMKZHbVsx1mc9hsn8DuFie"
//   },
//   "privateKeyBase58": "zrv3aFJvb6YKMXE24VjoZBr9viRhpGW9BmCW8VJrZs1VWqVu9jMFU2Qd2Mx3EPrEnCzNvaqz8xUpjQPcTJ5k3mgh5AW"
// }
interface IDidRegister {
  did: string;
  didDocument: object;
  txresult: object;
}

interface ISchemaProof {
  type: string;
  verificationMethod: string;
  proofPurpose: string;
  proofValue: string;
  created: string;
}

interface IDID{
  did: string;
  didDocument: object;
  verificationMethodId: string;
}


class BootStrap{
    public hypersignSdk: any;
    public CREDENTIAL_DIR: string;
    public bootstrapConfig: any;
    public hs_schema: any;
    public hs_app_schema: any;
    public networkUrl: string;
    public serviceEndpoint: string;
    public authServerSchemaId: string;
    public appSchemaId: string;
    public hsCryptoMaterial: IKeys;
    public appCredentialExpiresInDays: number;
    public NODE_ENV: string;
    public authServerName: string;

    public issuerDID: IDID;
    
    constructor(){
      this.issuerDID = {} as IDID;
        this.setupEnvVar();
        this.setupHypersignConfig();
        
    }


    private setupEnvVar() {
        // Enviroment  variable
        ////////////////////////

        if(!process.env.NODE_ENV){
            throw Error("Environment type ( development | production ) must be passed as NODE_ENV")
        }

        this.NODE_ENV = process.env.NODE_ENV;
        const envPath = path.resolve(
          __dirname,
          "../",
          process.env.NODE_ENV + ".env"
        );
    
        console.log(envPath);
    
        if (fs.existsSync(envPath)) {
          dotenv.config({
            path: envPath,
          });
        } else {
          dotenv.config();
        }
      }


  private async setupHypersignConfig() {

    const hidWallet = new HypersignWallet(process.env.HID_WALLET_MNEMONIC)
    await hidWallet.init();
    this.hypersignSdk = new HypersignSsiSDK(hidWallet.offlineSigner, process.env.HIDNODE_RPC_URL, process.env.HIDNODE_REST_URL, 'testnet')
    await this.hypersignSdk.init();

    this.serviceEndpoint = process.env.SERVICE_END_POINT;
    this.bootstrapConfig = {
      hypersignFilePath:  path.join(__dirname + "/../" + "/hypersign.json"),
    }



    const mnemonic_EnglishMnemonic: EnglishMnemonic = process.env.HID_WALLET_MNEMONIC as unknown as EnglishMnemonic
    const seedEntropy = Bip39.decode(mnemonic_EnglishMnemonic)


    this.hsCryptoMaterial = await this.hypersignSdk.did.generateKeys({ seed: seedEntropy} )
    const  result: IDidRegister = await this.registerDid();
    this.issuerDID.did = result.did;
    this.issuerDID.didDocument = result.didDocument;
    this.issuerDID.verificationMethodId = result.didDocument['verificationMethod'][0].id

    this.authServerName = process.env.AUTH_SERVER_NAME || "Hypersign Auth Credential"


    //// Schema for Auth Server
    this.hs_schema = {
      APP_NAME: this.authServerName,
      ATTRIBUTES: process.env.AUTH_SCEHMA_ATTRIBUTES || [
        "name",
        "email"
      ],
      DESCRIPTION:
        process.env.AUTH_SCEHMA_DESCRIPTION ||
        "Crdential for authenticating a user to an application by Hypersign",
    };

    let schemaData = {
      name: this.hs_schema.APP_NAME,
      author: this.issuerDID.did,
      description: this.hs_schema.DESCRIPTION,
      attributes: this.hs_schema.ATTRIBUTES as Array<string>,
      storeSchema: false
    }

    this.authServerSchemaId = await this.registerSchema({ ...schemaData })
    ///////////////////////////////


    ///// Schema for Developer Credential
    this.hs_app_schema = {
      APP_NAME: process.env.APP_NAME || "Hypersign Developer",
      ATTRIBUTES: process.env.APP_SCEHMA_ATTRIBUTES || [
        "name",
        "did",
        "owner",
        "schemaId",
        "serviceEp",
        "subscriptionId",
        "planId",
        "planName",
        "verifyResourcePath"
      ],
      DESCRIPTION:
        process.env.APP_SCEHMA_DESCRIPTION ||
        "Credential to access Hypersign Authentication APIs"
    };
    
    const appSchemaData = {
      name: this.hs_app_schema.APP_NAME,
      author: this.issuerDID.did,
      description: this.hs_app_schema.DESCRIPTION,
      attributes: this.hs_app_schema.ATTRIBUTES as Array<string>,
      storeSchema: false
    }

    this.appSchemaId = await this.registerSchema({ ...appSchemaData })
    console.log({
        appSchemaId: this.appSchemaId ,
        authServerSchemaId: this.authServerSchemaId
    })
    ///////////////////////////////

    this.appCredentialExpiresInDays =  process.env.APP_CREDENTIAL_EXPIRATION_DAYS ? parseInt(process.env.APP_CREDENTIAL_EXPIRATION_DAYS) : 60 ;

    console.log('BEfore calling bootstrap()');
    await this.bootstrap();


  }


  async registerSchema({ name, description, author, attributes, storeSchema = false }:
    { name: string, description: string, author: string, attributes: Array<string>, storeSchema: boolean }) {
    console.log("Registering schema start....")
    const schemaData = {
      name,
      author,
      description,
      fields: []
    };

    if (!attributes || attributes.length <= 0) {
      throw new Error("Please set schema attribtues in config before proceeding");
    }

    (attributes as Array<string>).forEach(element => {
      schemaData.fields.push({
        name: element,
        type: 'string',
        isRequired: true
      })
    });

    const schemaGenerated = await this.hypersignSdk.schema.getSchema(schemaData);
    console.log(schemaGenerated)


    const resolvedSchema = await this.hypersignSdk.schema.resolve({ schemaId: schemaGenerated.id })
    if(resolvedSchema){
      console.log(resolvedSchema)
      console.log('Schema id ' + schemaGenerated.id +  ' is already created')
      return schemaGenerated.id;
    }


    const signature =await this.hypersignSdk.schema.signSchema({ privateKey: this.hsCryptoMaterial.privateKeyMultibase, schema: schemaGenerated })
    console.log(signature)


    
    
    const proof: ISchemaProof = {
      proofValue: signature,
      created: schemaGenerated.authored,
      type: "Ed25519Signature2020",
      verificationMethod : this.issuerDID.verificationMethodId,
      proofPurpose: "assertion"
    }
    const r = await this.hypersignSdk.schema.registerSchema({ schema: schemaGenerated, proof });

    console.log(r)
    return schemaGenerated.id;
  }

  // Register DID
  private async registerDid():  Promise<IDidRegister> {
    console.log("Register did...inside")



    const didDocument = await this.hypersignSdk.did.generate({ publicKeyMultibase: this.hsCryptoMaterial.publicKeyMultibase })
    didDocument.keyAgreement = []
    

    const didResolved = await this.hypersignSdk.did.resolve({ did: didDocument.id, ed25519verificationkey2020: true})
    if(didResolved){
      console.log(didResolved.didDocument)
      console.log('Did was already created')
      return {
        did: didDocument.id,
        didDocument: didResolved.didDocument, 
        txresult: null
      }
    } 

    const result = await this.hypersignSdk.did.register({ didDocument: didDocument , privateKeyMultibase: this.hsCryptoMaterial.privateKeyMultibase, verificationMethodId: didDocument['verificationMethod'][0].id  })
    
    console.log(result)
    
    console.log("Regiter finished")

    return {
      did: didDocument.id,
      didDocument: didDocument, 
      txresult: result
    };
  }

  async bootstrap() {
   
    const config = {
      basic: {
        name: this.hs_schema.APP_NAME,
        description: this.hs_schema.DESCRIPTION,
        serviceEndpoint: this.serviceEndpoint,
        did: this.issuerDID.did,
        logoUrl: ""
      },
      advance: {}
    }

    console.log('Inside bootstratp ...')
    console.log(config)
    console.log('-----------before calling generateHypersignJson -----------------------')
    await this.generateHypersignJson(config.basic, config.advance, true);
    console.log('Done')

  }

  async generateHypersignJson(basic = {}, advance = {}, storeHypersign = false) {

    console.log('Inside generateHypersignJson ...')
    const ownerDid = this.issuerDID.did;


    const tempApp = {
      name: this.hs_schema.APP_NAME,
      serviceEndpoint: "",
      owner: ""
    }

    console.log(tempApp)

    // {
//   "publicKey": {
//       "@context": "https://w3id.org/security/v2",
//       "id": "did:hid:testnet:z8uyZoEA2JTCMWfadrSPaqyWmwzwc3qAwAM4snVrfLKue",
//       "type": "Ed25519VerificationKey2018",
//       "publicKeyBase58": "z6MkqKwdcpajzu3dyANeRDhHNEEMKZHbVsx1mc9hsn8DuFie"
//   },
//   "privateKeyBase58": "zrv3aFJvb6YKMXE24VjoZBr9viRhpGW9BmCW8VJrZs1VWqVu9jMFU2Qd2Mx3EPrEnCzNvaqz8xUpjQPcTJ5k3mgh5AW"
// }



    let hypersignJSON = {
      keys: {
          "publicKey": {
              "@context": "https://w3id.org/security/v2",
              "id": this.issuerDID.did,
              "type": "Ed25519VerificationKey2018",
              "publicKeyBase58": this.hsCryptoMaterial.publicKeyMultibase
          },
        "privateKeyBase58": this.hsCryptoMaterial.privateKeyMultibase
      },
      schemaId: this.authServerSchemaId,
      networkUrl: process.env.HIDNODE_RPC_URL,
      networkRestUrl: process.env.HIDNODE_REST_URL,
      mail: {
        host: process.env.MAIL_HOST || "hypermine.in",
        port: process.env.MAIL_PORT? parseInt(process.env.MAIL_PORT) : 465,
        user: process.env.MAIL_USER || "someuser",
        pass: process.env.MAIL_PASS || "",
        name: process.env.MAIL_NAME || "somename"
      },
      jwt: {
        secret: "",
        expiryTime: 0,
      },
      appCredential: {},
      namespace: process.env.NAMESPACE || "testnet"
    }

    Object.assign(hypersignJSON, advance);
    Object.assign(tempApp, { ...basic });
    tempApp["owner"] = ownerDid;
    tempApp["did"] = ownerDid;


    console.log(tempApp)

    // In case jwt configuration is not set by developer.
    if (hypersignJSON.jwt.secret == "") hypersignJSON.jwt.secret = 'VeryBadSecret1@###!@#!@#!@#!';
    if (hypersignJSON.jwt.expiryTime == 0) hypersignJSON.jwt.expiryTime = 120000

    // step2: Store app realated configuration in db
    const app = {
      name: tempApp.name,
      did: tempApp["did"],
      owner: tempApp["owner"],
      schemaId: hypersignJSON.schemaId,
      serviceEp: tempApp.serviceEndpoint
    }
    console.log(app)

    console.log('-----------before calling  getCredentials ------------------')
    const signedCredential = await this.getCredentials(app);

    Object.assign(hypersignJSON.appCredential, signedCredential);

    hypersignJSON["isSubcriptionEnabled"] = false;
    console.log(hypersignJSON)
    
    await store(hypersignJSON, this.bootstrapConfig.hypersignFilePath);
  }

  private addDays(date, days) {
    let result = new Date(date);
    result.setDate(result.getDate() + days);
    return result.toISOString();
  }


  private async getCredentials(app) {
    
    console.log('inside getCreandeit l ----------------- ')
    console.log(app)
    console.log('inside getCreandeit l ----------------- ')




    // TODO: need to do this in better way..more dynamic way.
    // make use of SCHEMA.attributes
    const attributesMap = {
      name: app.name,
      did: app.did,
      owner: app.owner,
      schemaId: app.schemaId,
      serviceEp: app.serviceEp,
      subscriptionId: "dummy_id",
      planId: "dummy_id",
      planName: "dummy_id",
      verifyResourcePath: ""
    };

    console.log({attributesMap: attributesMap})

        console.log('------------------- befoe calling  generateCredential ---------------------')

       const credential =  await this.hypersignSdk.vc.getCredential({
          schemaId: this.appSchemaId,
          subjectDid: this.issuerDID.did,
          issuerDid: this.issuerDID.did,
          expirationDate: this.addDays(new Date(), this.appCredentialExpiresInDays),
          fields: attributesMap
        })
    

    console.log({credential})

    
    return credential;
  }
}



new BootStrap();