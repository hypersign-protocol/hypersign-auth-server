import express from 'express';
import {auth as authRoutes ,edvRoutes} from './routes';
import walletRoutes from './routes/wallet';
import { PORT, baseUrl, whitelistedUrls, HIDNODE_RPC_URL, HIDNODE_REST_URL, HID_WALLET_MNEMONIC, EDV_DID_FILE_PATH, EDV_KEY_FILE_PATH, EDV_CONFIG_DIR, EDV_ID, EDV_BASE_URL } from './config';
import xss from 'xss-clean';
import cors from 'cors';
import HypersignAuth from 'hypersign-auth-node-sdk';
import http from 'http';
import HIDWallet from 'hid-hd-wallet';
import { HypersignSSISdk } from 'hs-ssi-sdk';
import vpschema from './models/vp';
import userServices from './services/userServices';
import { IUserModel } from './models/userModel';
import { Bip39, EnglishMnemonic } from '@cosmjs/crypto'
import { existDir, store, createDir } from './utils/file';
import EncryptedDataVaultService from './services/edvService';
import  mongoose  from 'mongoose';
import { EdvClientKeysManager } from './services/edv/edv.singleton';
import { VaultWalletManager } from './services/edv/vaultWalletManager';
mongoose.set('useCreateIndex', true);

const app = express();


/*
const limiter= rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 20, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from your ip' // message to send
  });
*/

const server = http.createServer(app);

function corsOptionsDelegate(req, callback) {
  let corsOptions;
  if (whitelistedUrls.indexOf(req.header('Origin')) !== -1) {
    corsOptions = { origin: true } // reflect (enable) the requested origin in the CORS response
  } else {
    corsOptions = { origin: false } // disable CORS for this request
  }
  callback(null, corsOptions) // callback expects two parameters: error and options
}


app.use(xss());
app.use(cors(corsOptionsDelegate));
app.use(express.json({ limit: '5mb' }));
app.use(express.static('public'))

// TODO:  this should go into hypersisgn auth sdk
interface IHypersignAuth {

  init(): Promise<void>;

  authenticate(req, res, next): Promise<any>;
  refresh(req, res, next): Promise<any>;

  logout(req, res, next): Promise<any>;

  authorize(req, res, next): Promise<any>;
  register(req, res, next): Promise<any>;
  issueCredential(req, res, next): Promise<any>;
  challenge(req, res, next): Promise<any>;

  poll(req, res, next): Promise<any>;

}

const walletOptions = {
  hidNodeRPCUrl: HIDNODE_RPC_URL,
  hidNodeRestUrl: HIDNODE_REST_URL,
};

const hidWalletInstance = new HIDWallet(walletOptions);
hidWalletInstance.generateWallet({ mnemonic: HID_WALLET_MNEMONIC }).then(async () => {
  hidWalletInstance.offlineSigner.getAccounts().then(console.log)

  const hypersign: IHypersignAuth = (new HypersignAuth(server, hidWalletInstance.offlineSigner)) as IHypersignAuth
  // const hsSSIdkInstance = new hsSSIdk(hidWalletInstance.offlineSigner, HIDNODE_RPC_URL, HIDNODE_REST_URL, 'testnet')

  const hsSSIdkInstance = new HypersignSSISdk({
    offlineSigner: hidWalletInstance.offlineSigner,
    nodeRpcEndpoint: HIDNODE_RPC_URL,
    nodeRestEndpoint: HIDNODE_REST_URL,
    namespace: 'testnet',
  });

  await hsSSIdkInstance.init();
  await hypersign.init();
  
  const mnemonic_EnglishMnemonic: EnglishMnemonic = HID_WALLET_MNEMONIC as unknown as EnglishMnemonic;
  const seedEntropy = Bip39.decode(mnemonic_EnglishMnemonic)
  const keys = await hsSSIdkInstance.did.generateKeys({ seed: seedEntropy })
  const edvDid = await hsSSIdkInstance.did.generate({ publicKeyMultibase: keys.publicKeyMultibase })

  if (!existDir(EDV_CONFIG_DIR)) {
    createDir(EDV_CONFIG_DIR)
  }
  if (!existDir(EDV_DID_FILE_PATH)) {
    store(edvDid, EDV_DID_FILE_PATH)
  }
  if (!existDir(EDV_KEY_FILE_PATH)) {
    store(keys, EDV_KEY_FILE_PATH)
  }
  
  
  
  const kmsVaultWallet = await VaultWalletManager.getWallet(
    mnemonic_EnglishMnemonic,
    hsSSIdkInstance
  );
  const kmsVaultManager = new EdvClientKeysManager();
  const kmsVault = await kmsVaultManager.createVault(kmsVaultWallet, EDV_ID, EDV_BASE_URL);
  
  // const edv = new EncryptedDataVaultService(EDV_BASE_URL,EDV_ID)
  // await edv.setAuthenticationKey(keys,edvDid.authentication[0],edvDid.controller[0])
  // await edv.init()

  
  app.use('/hs/api/v2', authRoutes(hypersign, kmsVault));
  app.use('/hs/api/v2', walletRoutes(hidWalletInstance));
  app.use('/hs/api/v2', edvRoutes(hypersign, kmsVault))
  app.get('/shared/vp/:id', async (req, res) => {
    try {

      const id = req.params.id;
      const vp = await vpschema.findOne({ _id: id }).exec();

      res.status(200).json(vp);

    } catch (error) {
      res.status(500).json({ error: error.message })
    }


  })


  app.post('/share', async (req, res) => {
    try {
      const { vp } = req.body;
      const issuerDid = vp.verifiableCredential[0].issuer
      const holderDid = vp.verifiableCredential[0].credentialSubject.id
      // console.log(holderDid);
      const challenge = vp.proof.challenge
      // console.log(challenge);
      const issuerVerificationMethodId = vp.verifiableCredential[0].proof.verificationMethod
      const holderVerificationMethodId = vp.proof.verificationMethod
      type vpResult = {verified: boolean, results: Array<any>} 
      const result: vpResult = await hsSSIdkInstance.vp.verify({
        signedPresentation: vp,
        challenge,
        issuerDid,
        holderDid,
        holderVerificationMethodId,
        issuerVerificationMethodId

      }) as vpResult;
      if (result.verified) {

        const record = await vpschema.create({ vp });

        res.status(200).json({
          status: 'success',

          record,
          verified: result.verified,


        })
      } else {
        throw new Error('vp not verified')
      }
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      })
    }



  })


  // app.post('/user',async (req,res)=>{
  //   try {

  // const userData:IUserModel = {
  //   userId: 'test',
  //     sequence: 1,
  //     docId: 'testabc'    

  // } as IUserModel;
  //     const userService = new userServices();
  //     // const records = await userService.createUser(userData);
  //     const records = await userService.updateUser('test',userData)

  //     const record = await userService.userExists('test');
  //      res.status(200).json({
  //         record
  //       })
  //   } catch (error) {
  //     res.status(500).json({
  //       status:'error',
  //       message:error.message
  //     })
  //   }

  // })

})
  .catch(e => {
    console.error(e)
  })





app.listen(PORT, () => console.log('Server is running @ ' + baseUrl));
