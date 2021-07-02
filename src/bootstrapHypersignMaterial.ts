import path from "path";
import HypersignSsiSDK from "hs-ssi-sdk";
import { store } from './utils/file';
import dotenv from "dotenv";
import fs from 'fs';

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
    public hsCryptoMaterial: any;
    public appCredentialExpiresInDays: number;
    public NODE_ENV: string;
    public authServerName: string;

    constructor(){
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
    this.networkUrl = process.env.NODE_SERVER_BASE_URL || "https://ssi.hypermine.in/core/";
    this.hypersignSdk = new HypersignSsiSDK({ nodeUrl: this.networkUrl });

    

    this.serviceEndpoint = process.env.SERVICE_END_POINT;
    this.bootstrapConfig = {
      hypersignFilePath:  path.join(__dirname + "/../" + "/hypersign.json"),
    }


    console.log({
        nodeEnv: this.NODE_ENV,
        networkURl: this.networkUrl,
        spEp: this.serviceEndpoint,
        bootConfig : this.bootstrapConfig
    })


    this.hsCryptoMaterial = await this.registerDid();
    this.authServerName = process.env.AUTH_SERVER_NAME || "Hypersign Auth"


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
      author: this.hsCryptoMaterial.did,
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
      ],
      DESCRIPTION:
        process.env.APP_SCEHMA_DESCRIPTION ||
        "Credential to access Hypersign Authentication APIs"
    };
    
    const appSchemaData = {
      name: this.hs_app_schema.APP_NAME,
      author: this.hsCryptoMaterial.did,
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

    await this.bootstrap();


  }


  async registerSchema({ name, description, author, attributes, storeSchema = false }:
    { name: string, description: string, author: string, attributes: Array<string>, storeSchema: boolean }) {
    console.log("Registering schema start....")
    const schemaData = {
      name,
      author,
      description,
      properties: {}
    };

    if (!attributes || attributes.length <= 0) {
      throw new Error("Please set schema attribtues in config before proceeding");
    }

    (attributes as Array<string>).forEach(element => {
      schemaData.properties[element] = ""
    });

    const schemaGenerated = await this.hypersignSdk.schema.generateSchema(schemaData);
    console.log(schemaGenerated)
    const r = await this.hypersignSdk.schema.registerSchema(schemaGenerated);

    return r["schemaId"];
  }

  // Register DID
  private async registerDid() {
    console.log("Register did...inside")

    const resp = await this.hypersignSdk.did.getDid({
      user: {
        name: this.authServerName
      }
    });

    const { did, keys, didDoc } = resp;
    await this.hypersignSdk.did.register(didDoc);

    console.log("Regiter finished")

    return {
      did,
      keys
    };
  }

  async bootstrap() {
   
    const config = {
      basic: {
        name: this.hs_schema.APP_NAME,
        description: this.hs_schema.DESCRIPTION,
        serviceEndpoint: this.serviceEndpoint,
        did: this.hsCryptoMaterial.did,
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
    const {did: ownerDid, keys}  =  this.hsCryptoMaterial;

    console.log(this.hsCryptoMaterial)

    const tempApp = {
      name: this.hs_schema.APP_NAME,
      serviceEndpoint: "",
      owner: ""
    }

    console.log(tempApp)

    let hypersignJSON = {
      keys: {},
      schemaId: this.authServerSchemaId,
      networkUrl: this.networkUrl,
      mail: {
        host: "",
        port: 0,
        user: "",
        pass: "",
        name: ""
      },
      jwt: {
        secret: "",
        expiryTime: 0,
      },
      appCredential: {}
    }

    Object.assign(hypersignJSON, advance);
    Object.assign(tempApp, { ...basic });
    tempApp["owner"] = ownerDid;

    Object.assign(hypersignJSON.keys, keys);
    tempApp["did"] = ownerDid;


    console.log(tempApp)

    // In case jwt configuration is not set by developer.
    if (hypersignJSON.jwt.secret == "") hypersignJSON.jwt.secret = this.hypersignSdk.did.getChallange();
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
    const schemaUrl = `${this.networkUrl}api/v1/schema/${this.appSchemaId}`;
    console.log({schemaUrl: schemaUrl})
    const {keys: issuerKeys} = this.hsCryptoMaterial;

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
    };

    console.log({attributesMap: attributesMap})
    console.log( schemaUrl,
        {
          subjectDid: app.did,
          issuerDid: issuerKeys.publicKey.id,
          expirationDate: this.addDays(new Date(), this.appCredentialExpiresInDays), 
          attributesMap,
        })

        console.log('------------------- befoe calling  generateCredential ---------------------')
    const credential = await this.hypersignSdk.credential.generateCredential(
      schemaUrl,
      {
        subjectDid: app.did,
        issuerDid: issuerKeys.publicKey.id,
        expirationDate: this.addDays(new Date(), this.appCredentialExpiresInDays), 
        attributesMap,
      }
    );

    console.log({credential})

    console.log('------------------- befoe calling  signCredential ---------------------')

    const signedCredential = await this.hypersignSdk.credential.signCredential(
      credential,
      issuerKeys.publicKey.id,
      issuerKeys.privateKeyBase58
    );

    console.log({signedCredential})
    return signedCredential;
  }
}



new BootStrap();