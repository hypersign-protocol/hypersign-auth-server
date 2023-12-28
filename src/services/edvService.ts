
//@ts-ignore
import { HypersignEdvClient, HypersignCipher } from 'hypersign-edv-client';
import { HypersignEdvClientEd25519VerificationKey2020 } from 'hypersign-edv-client';

import { X25519KeyAgreementKey2020 } from '@digitalbazaar/x25519-key-agreement-key-2020';
import { Ed25519VerificationKey2020 } from '@digitalbazaar/ed25519-verification-key-2020';
import {
    IResponse,
    IEncryptionRecipents,
  } from 'hypersign-edv-client/build/Types';
import { EDV_DID_FILE_PATH, EDV_KEY_FILE_PATH, logger } from '../config'
import fs from 'fs'
interface IEd25519VerificationKey2020KeyPair {
    privateKeyMultibase: string
    publicKeyMultibase: string;

}


type EDVDocType = {
    document: object;
    documentId?: string;
    sequence?: number;
    metadata?: object;
    edvId: string;
    recipients?: Array<IEncryptionRecipents>;
    indexs?: Array<{ index: string; unique: boolean }>;
  };

export default class EncryptedDataVaultService {
  
    private edvClient: any;
    private cipher: HypersignCipher;
    private edvId: string;
    private edvKey: string;
    private edvUrl: string;
    private edvKeyAgreementKey: X25519KeyAgreementKey2020;
    private edvHmac: any;
    private edvAuthnticationKey: Ed25519VerificationKey2020;
    private edvVerificationKey: Ed25519VerificationKey2020;
    private edvCapability: string;
    private edvCapabilityInvocationKey: string;
    private edvCapabilityInvocationKeyID: string;
    private edvCapabilityInvocationKeyController: string;

    private edvCapabilityInvocationKeyPublicKeyMultibase: string;
    private edvCapabilityInvocationKeyPrivateKeyMultibase: string;
    private edvCapabilityInvocationKeyPublicKeyJwk: string;
    private edvCapabilityInvocationKeyPrivateKeyJwk: string;
    private x25519Signer: X25519KeyAgreementKey2020

    private recipient: any;


    public async setAuthenticationKey(Ed25519VerificationKey2020KeyPair: IEd25519VerificationKey2020KeyPair, authenticationKeyId: string, controller: string) {
        const key = {
            id: authenticationKeyId.split('#')[0] + '#' + Ed25519VerificationKey2020KeyPair.publicKeyMultibase,
            controller: controller,
            publicKeyMultibase: Ed25519VerificationKey2020KeyPair.publicKeyMultibase,
            privateKeyMultibase: Ed25519VerificationKey2020KeyPair.privateKeyMultibase
        }

        const authenticationKey = {
            '@context': 'https://w3id.org/security/suites/x25519-2020/v1',
            ...key,
        }
        this.edvAuthnticationKey = await Ed25519VerificationKey2020.generate({ ...authenticationKey });
        this.edvCapabilityInvocationKeyPublicKeyMultibase = Ed25519VerificationKey2020KeyPair.publicKeyMultibase;
        this.edvCapabilityInvocationKeyPrivateKeyMultibase = Ed25519VerificationKey2020KeyPair.privateKeyMultibase;
        this.edvCapabilityInvocationKeyController = controller;
        this.edvCapabilityInvocationKeyID = key.id;
    }


    constructor(edvURL, edvId) {
        this.edvUrl = edvURL;
        this.edvId = edvId;
    }


    public async hypersignDIDKeyResolverForEd25519KeyPair({ id }) {


        /* some how this setup does not work 
        const authenticationKey = {
            '@context': 'https://w3id.org/security/suites/x25519-2020/v1',
            id: id.split('#')[0] + '#' + this.edvCapabilityInvocationKeyPublicKeyMultibase,
            controller: this.edvCapabilityInvocationKeyController,
            publicKeyMultibase: this.edvCapabilityInvocationKeyPublicKeyMultibase,
            privateKeyMultibase: ''
        }*/

        let authserverDid: any = fs.readFileSync(EDV_DID_FILE_PATH).toString()
        authserverDid = JSON.parse(authserverDid)
        let authserverKey: any = fs.readFileSync(EDV_KEY_FILE_PATH).toString()
        authserverKey = JSON.parse(authserverKey) as IEd25519VerificationKey2020KeyPair

        const authenticationKey = {
            '@context': 'https://w3id.org/security/suites/x25519-2020/v1',
            id: id.split('#')[0] + '#' + authserverKey.publicKeyMultibase,
            controller: authserverDid.id,
            publicKeyMultibase: authserverKey.publicKeyMultibase,
            privateKeyMultibase: ''


        }


        const ed25519KeyPair: Ed25519VerificationKey2020 = await Ed25519VerificationKey2020.generate({ ...authenticationKey });
        return ed25519KeyPair;
    }



    public async init() {
        const config = {
            controller: this.edvCapabilityInvocationKeyController,
            keyAgreementKey: {
                id: this.edvCapabilityInvocationKeyID,
                type: 'X25519KeyAgreementKey2020',
            },
            hmac: {
                id: this.edvCapabilityInvocationKeyID,
                type: 'Sha256HmacKey2020',
            },
            edvId: this.edvId,

        }

        

        this.x25519Signer = await X25519KeyAgreementKey2020.fromEd25519VerificationKey2020({
        keyPair: {
          publicKeyMultibase: this.edvAuthnticationKey.publicKeyMultibase,
          privateKeyMultibase: this.edvAuthnticationKey.privateKeyMultibase,
        },
      });

      this.recipient = [
        {
          ...config.keyAgreementKey,
          publicKeyMultibase: this.x25519Signer.publicKeyMultibase,
        },
      ];

        const client = new HypersignEdvClientEd25519VerificationKey2020({
            keyResolver: this.hypersignDIDKeyResolverForEd25519KeyPair,
            url: this.edvUrl,
            ed25519VerificationKey2020: this.edvAuthnticationKey,
            x25519KeyAgreementKey2020: this.x25519Signer,
        });
      
        // new HypersignEdvClient({
        //     keyResolver: this.hypersignDIDKeyResolverForEd25519KeyPair,
        //     url: this.edvUrl,
        //     ed25519VerificationKey2020: this.edvAuthnticationKey,
        // })


        const config1 = {
            url: this.edvUrl,
            keyAgreementKey: config.keyAgreementKey,
            controller: config.controller,
            edvId: this.edvId,
          };
        const data = await client.registerEdv(config1);
        this.edvClient = client;

        logger.info('EDV Service Initialized')
    }


    get EdvClient(){
        return this.edvClient
    }

    public prepareEdvDocument(
        content: object,
        indexes?: Array<{ index: string; unique: boolean }>,
        recipients?: Array<IEncryptionRecipents>,
      ): EDVDocType {
        const document: any = {
          document: { content },
          edvId: this.edvId,
          indexs: indexes,
          recipients: recipients ? recipients : this.recipient,
        };
        return document;
    }

    public async createDocument(doc: EDVDocType): Promise<{ id: string }>{
        console.log('EDVClient:  createDocument () ..')
        const { edvClient } = this;
        console.log(this.recipient)
        doc['recipients'] = this.recipient;
        if (doc['recipients'].length == 0) {    
            console.log('EDVClient:   doc.recipients' +  doc['recipients'])
        }
        const resp: IResponse = await edvClient.insertDoc({ ...doc });
        return {
            id: resp.document.id,
        };
    }

    public async updateDocument(doc: EDVDocType, id: string) {
        const { edvClient, edvId } = this;
        return await edvClient.updateDoc({ document: doc, edvId, documentId: id });
    }

    public async getDocument(id: string):  Promise<IResponse> {
        const { edvClient, edvId } = this;
        // return await edvClient.fetchDoc({ edvId, documentId: id });

        const resp: IResponse = await edvClient.fetchDoc({
            edvId: edvId,
            documentId: id,
        });
        return resp;
    }

    public async getDecryptedDocument(id: string) : Promise<any>{
        const { edvClient, edvId } = this;
        // const doc = await edvClient.fetchDoc({ edvId, documentId: id });
        const doc: IResponse = await this.getDocument(id);
        if (!doc.document) {
          throw new Error(doc.message);
        }

        const { content } = await  edvClient.decryptObject({
            keyAgreementKey: this.x25519Signer,
            jwe: doc.document.jwe,
        });
        return content;
        // const decryptedDoc = await edvClient.hsCipher.decryptObject({ jwe: JSON.parse(doc[0].encData) })
        // return decryptedDoc
    }

}










