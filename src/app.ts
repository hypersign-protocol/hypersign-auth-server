import express from 'express';
import authRoutes from './routes/auth';
import walletRoutes from './routes/wallet';
import { PORT, baseUrl, whitelistedUrls, HIDNODE_RPC_URL, HIDNODE_REST_URL, HID_WALLET_MNEMONIC } from './config';
import xss from 'xss-clean';
import cors from 'cors';
import HypersignAuth from 'hypersign-auth-node-sdk';
import http from 'http';
import HIDWallet from 'hid-hd-wallet';
import hsSSIdk from 'hs-ssi-sdk'
import vpschema from './models/vp';
import userServices from './services/userServices';
import { IUserModel } from './models/userModel';
import edvRoutes from './routes/edvRoutes';


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
app.use(express.json({ limit: '10kb' }));
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
  const hsSSIdkInstance = new hsSSIdk(hidWalletInstance.offlineSigner, HIDNODE_RPC_URL, HIDNODE_REST_URL, 'testnet')
  await hsSSIdkInstance.init();
  await hypersign.init();

  app.use('/hs/api/v2', authRoutes(hypersign));
  app.use('/hs/api/v2', walletRoutes(hidWalletInstance));
  app.use('hs/api/v2',edvRoutes(hypersign))
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
      const result = await hsSSIdkInstance.vp.verifyPresentation({
        signedPresentation: vp,
        challenge,
        issuerDid,
        holderDid,
        holderVerificationMethodId,
        issuerVerificationMethodId

      });
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
//     sequenceNo: 1,
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
