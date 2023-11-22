import { HypersignEdvClientEd25519VerificationKey2020 } from 'hypersign-edv-client';
import {
  IResponse,
  IEncryptionRecipents,
} from 'hypersign-edv-client/build/Types';
import { VaultWallet } from './vaultWalletManager';
type EDVDocType = {
  document: object;
  documentId?: string;
  sequence?: number;
  metadata?: object;
  edvId: string;
  recipients?: Array<IEncryptionRecipents>;
  indexs?: Array<{ index: string; unique: boolean }>;
};

export interface IEdvClientManager {
  didDocument: object;
  edvId?: string;
  initate(): Promise<IEdvClientManager>;
  createDocument(doc: EDVDocType): any;
  updateDocument(doc: EDVDocType, id: string): Promise<{ id: string }>;
  deleteDocument(): any;
  getDecryptedDocument(id: string): Promise<any>;
  getDocument(id: string): Promise<IResponse>;
  prepareEdvDocument(
    content: object,
    indexes: Array<{ index: string; unique: boolean }>,
    recipients?: Array<IEncryptionRecipents>,
  ): EDVDocType;
  query(equals: { [key: string]: string }): Promise<any>;
}

export class EdvClientManger implements IEdvClientManager {
  didDocument: any;
  edvId?: string;
  private keyResolver: any;
  private vault: any;
  private recipient: any;
  private vaultWallet: VaultWallet;
  private edvUrl: string;
  constructor(vaultWallet: VaultWallet, edvId?: string, edvUrl?: string) {
    this.vaultWallet = vaultWallet;
    this.edvId = edvId;
    this.didDocument = this.vaultWallet.didDocument;
    this.keyResolver = this.vaultWallet.keyResolver;
    this.edvUrl = edvUrl;
  }

  async initate(): Promise<IEdvClientManager> {
    const ed25519 = this.vaultWallet.ed25519Signer;
    const x25519 = this.vaultWallet.ed25519Signer;
    const keyAgreementKey = this.vaultWallet.keyAgreementKey;

    this.recipient = [
      {
        ...keyAgreementKey,
        publicKeyMultibase: x25519.publicKeyMultibase,
      },
    ];

    const EDV_BASE_URL = this.edvUrl;
    this.vault = new HypersignEdvClientEd25519VerificationKey2020({
      keyResolver: this.keyResolver,
      url: EDV_BASE_URL,
      ed25519VerificationKey2020: ed25519,
      x25519KeyAgreementKey2020: x25519,
    });

    const config = {
      url: EDV_BASE_URL,
      keyAgreementKey,
      controller: this.vaultWallet.authenticationKey.id,
      edvId: this.edvId
        ? this.edvId
        : 'urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66',
    };

    const res = await this.vault.registerEdv(config);
    return this;
  }

  prepareEdvDocument(
    content: object,
    indexes: Array<{ index: string; unique: boolean }>,
    recipients?: Array<IEncryptionRecipents>,
  ): EDVDocType {
    console.log('edvClientManager:: prepareEdvDocument() ')
    const document: any = {
      document: { content },
      edvId: this.edvId,
      indexs: indexes,
      recipients: recipients ? recipients : this.recipient,
    };
    return document;
  }

  async createDocument(doc: EDVDocType): Promise<{ id: string }> {
    
    console.log('edvClientManager:: createDocument() ')
    if (doc['recipients'].length == 0) {
      doc['recipients'] = this.recipient;
    } 

    const resp: IResponse = await this.vault.insertDoc({ ...doc });
    // if(resp && resp.statusCode === 400){

    // }

    return {
      id: resp.document.id,
    };
  }

  async updateDocument(doc: EDVDocType, id: string): Promise<{ id: string }> {
    const { edvId } = this;
    const resp: IResponse = await this.vault.updateDoc({ document: doc, edvId, documentId: id })
    return {
      id: resp.document.id
    }
  }
  
  deleteDocument(): any {
    throw new Error('not implemented');
  }

  async getDocument(id: string): Promise<IResponse> {
    const resp: IResponse = await this.vault.fetchDoc({
      edvId: this.edvId,
      documentId: id,
    });
    return resp;
  }

  async getDecryptedDocument(id: string): Promise<any> {
    const doc: IResponse = await this.getDocument(id);
    if (!doc.document) {
      throw new Error(doc.message);
    }
    const { content } = await this.vault.decryptObject({
      keyAgreementKey: this.vaultWallet.x25519Signer,
      jwe: doc.document.jwe,
    });
    return content;
  }

  async query(equals: { [key: string]: string }): Promise<any>{
    const resp = await this.vault.Query({
      edvId: this.edvId,
      equals
    });
    return resp;
  }
}
