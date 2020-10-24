import IUser  from '../models/IUser';
import { DBService, SchemaType } from './db.service';
import { hypersignSDK } from '../config';

import { logger, nodeServer, bootstrapConfig } from '../config';
import path  from 'path'
import { retrive } from '../utils/file'
const  {keysfilePath, schemafilePath} =  bootstrapConfig;
export class User implements IUser{
    id: string;
    fname: string;
    lname: string;
    phoneNumber: string;
    username: string;
    password: string;
    email: string;
    publicKey: string;
    privateKey: string;
    dbSerice: DBService;
    hash: string;
    birthdate: string;
    jobTitle: string;
    prefix: string;
    isActive: string;
    constructor({ id = " ", fname = "", lname = "", username ="", phoneNumber = "", password ="", email = "", publicKey, privateKey = "", hash ="", birthdate ="", jobTitle=""}: IUser){
        this.id = id; // new uuid
        this.fname = fname;
        this.lname = lname;
        this.phoneNumber = phoneNumber;
        this.username = username;
        this.password = password; // HASH it first 
        this.email = email;
        this.publicKey = publicKey;
        this.privateKey = privateKey;
        this.hash = hash;
        this.birthdate = birthdate;
        this.jobTitle = jobTitle;
        this.dbSerice = new DBService();
        this.prefix = 'usr_';
        this.isActive = "0"
    }

    toString(user: IUser){
        return JSON.stringify(user);
    }

    private getId(){
        const uuid = this.prefix + hypersignSDK.did.getChallange()
        return uuid.substring(0, 20)
    }
    async create(){
        this.id = this.getId();
        console.log(`User server : Creat Method::`)
        const newUser:IUser = await this.dbSerice.add<IUser>(SchemaType.User, this);
        return this.toString(newUser)
    }

    private async getCredentials() {
        const SCHEMA = JSON.parse(await retrive(schemafilePath));
        const schemaUrl = `${nodeServer.baseURl}${nodeServer.schemaGetEp}/${SCHEMA.id}`;
        const issuerKeys = JSON.parse(await retrive(keysfilePath));

        // TODO: need to do this in better way..more dynamic way.
        // make use of SCHEMA.attributes
        const attributesMap = {
            "Name": this.fname,
            "Email": this.email
        }
        const credential = await hypersignSDK.credential.generateCredential(schemaUrl, {
          subjectDid: this.publicKey,
          issuerDid: issuerKeys.publicKey.id,
          expirationDate: new Date().toISOString(),
          attributesMap,
        })

        const signedCredential = await hypersignSDK.credential.signCredential(credential, issuerKeys.publicKey.id, issuerKeys.privateKeyBase58)
        return signedCredential
    }

    async generateCredential() { 
        // try{
            const verifiableCredential = await this.getCredentials();
            // const url = `${this.$config.studioServer.BASE_URL}${this.$config.studioServer.CRED_ISSUE_EP}`;
            // const headers = {
            //     "Content-Type": "application/json",
            //     "x-auth-token": this.authToken,
            // };
            // const body = {
            //     subject: this.subjectDid,
            //     schemaId: this.selected,
            //     dataHash: signedVerifiableCredential,
            //     appId: "appI123",
            // };       
            return verifiableCredential; 
        // } catch(e){
        //     logger.info(`Error: ${e.message}`)
        // }
    }
    

    async fetch(obj = {}){    
        if(Object.keys(obj).length === 0){
            obj = {email: this.email}
        }
        let user:IUser = await this.dbSerice.getOne(SchemaType.User, obj);
        return this.toString(user)
    }

    async update(){
        return await this.dbSerice.update(SchemaType.User, {
            isActive: "1",
        }, {
            email: this.email,
            publicKey: this.publicKey
        })
    }

}