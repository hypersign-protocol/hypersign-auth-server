import express  from 'express';
import routes from './routes';
import swaggerJsDoc = require('./swagger.json');
import swaggerUi from 'swagger-ui-express';
import { PORT, baseUrl, logger, db, whitelistedUrls } from './config';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import xss from 'xss-clean';
import cors from 'cors';
import HypersignAuth from 'hypersign-auth-js-sdk';
import http from 'http';



const app = express();


const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 20, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from your ip' // message to send
  });

const server =  http.createServer(app);
const hypersign = new HypersignAuth(server);

// app.use(helmet());
// app.use(limiter);
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
app.use(cors(corsOptionsDelegate)); 
app.use(express.json({ limit: '10kb' }));
app.use(express.static('public'))


app.use('/hs/api/v2/', routes.auth(hypersign));

app.listen(PORT, () => console.log('Server is running @ ' + baseUrl));
