import express  from 'express';
import routes from './routes';
import swaggerJsDoc = require('./swagger.json');
import swaggerUi from 'swagger-ui-express';
import { PORT, baseUrl, logger, db } from './config';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import xss from 'xss-clean';
import cors from 'cors';
import HypersignAuth from 'hypersign-auth-js-sdk';
import http from 'http';



const app = express();


// const limiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: 100, // limit each IP to 100 requests per windowMs
//     message: 'Too many requests' // message to send
//   });

const server =  http.createServer(app);
const hypersign = new HypersignAuth(server);

// app.use(helmet());
// app.use(limiter);


var whitelist = ['https://wallet.hypermine.in', 'https://dashboard.hypermine.in',  'https://whitelist.hypermine.in']
var corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}

app.use(xss());
app.use(cors(corsOptions));
app.use(express.json({ limit: '10kb' }));
app.use(express.static('public'))


app.use('/hs/api/v2/', routes.auth(hypersign));

app.listen(PORT, () => console.log('Server is running @ ' + baseUrl));
