import express  from 'express';
import authRoutes from './routes/auth';
import { PORT, baseUrl, whitelistedUrls } from './config';
import xss from 'xss-clean';
import cors from 'cors';
import HypersignAuth from 'hypersign-auth-node-sdk';
import http from 'http';
import { createHIDWallet } from 'hypersign-wallet-sdk';


const app = express();

const server =  http.createServer(app);

function corsOptionsDelegate (req, callback) {
  let corsOptions;
  if (whitelistedUrls.indexOf(req.header('Origin')) !== -1) {
    corsOptions = { origin: true } // reflect (enable) the requested origin in the CORS response
  } else {
    corsOptions = { origin: false } // disable CORS for this request
  }
  callback(null, corsOptions) // callback expects two parameters: error and options
}


app.use(xss());
// app.use(cors(corsOptionsDelegate)); 
app.use(express.json({ limit: '10kb' }));
app.use(express.static('public'))


interface IHypersignAuth{

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

const mnemonic = "retreat seek south invite fall eager engage endorse inquiry sample salad evidence express actor hidden fence anchor crowd two now convince convince park bag"
createHIDWallet(mnemonic).then(async(offlineSigner) => {

  const hypersign: IHypersignAuth = (new HypersignAuth(server, offlineSigner)) as IHypersignAuth
  await hypersign.init();

  app.use('/hs/api/v2', authRoutes(hypersign));
})
.catch(e => {
        console.error(e)
    })

app.listen(PORT, () => console.log('Server is running @ ' + baseUrl));
