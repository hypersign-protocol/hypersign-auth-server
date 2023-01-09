import { Router } from "express";
import hsJson from '../../hypersign.json';
import { verifyAccessTokenForThridPartyAuth } from '../middleware/auth';
import { registerSchemaBody } from "../middleware/registerSchema";
import { validateRequestSchema } from "../middleware/validateRequestSchema";
import { IUserModel } from '../models/userModel';
import userServices from "../services/userServices";
import { HIDNODE_REST_URL, REDIS_HOST,REDIS_PASSWORD,REDIS_PORT } from '../config'
let c = 0

import Redis from 'ioredis';

const redis = new Redis({
  port: parseInt( REDIS_PORT),
  host: REDIS_HOST ,
  password: REDIS_PASSWORD

})

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


async function userExistsMiddleWare(req,res,next){
    const userService=new userServices()
    
    
    const {user,isisThridPartyAuth,thridPartyAuthProvider}=req.body
    const userData:IUserModel={
      userId:user.email,
      sequence:0,
      docId:''
    } as IUserModel
    const record=await userService.userExists(userData.userId)

    
    if(record.exists){
      const docId=record.user.docId

      // User already exists
      // get from edv 
      const docData=await this.getDecryptedDocument(docId)

      // decrypt
      return res.status(403).send({
        status: 403,
        message: "User already exists",
        error: null,
        data: {
          docId:record.user.docId,
          sequence:record.user.sequence,
          userId:record.user.userId

          } as IUserModel,
          
        },
      );
    } 
    next()
  
}

function addExpirationDateMiddleware(req, res, next) {
  const now = new Date();
  // valid for 1 year
  const expirationDate = new Date(now.setFullYear(now.getFullYear() + 1)).toString()
  req.body.expirationDate = expirationDate
  next();
}

export = (hypersign: IHypersignAuth,edvClient) => {
  const router = Router();

  router.get('/test', (req, res) => {
    res.send("Hello")
  })

  // Implement /vcId status check

  router.get('/vcstatus/:vcId', async (req, res) => {
    try {
      const { vcId } = req.params;
      interface Ivc {
        credStatus: {
          claim: {
            currentStatus: string
          }
        }
      }
      // const vc = await redis.addListener(vcId)
      const vc = await fetch(`${HIDNODE_REST_URL}hypersign-protocol/hidnode/ssi/credential/${vcId}`)

      const vcData: Ivc = await vc.json()


      if (vcData.credStatus.claim === null) {
        let result = await redis.call('ft.search', 'idx:vc-txn-err', vcId.split(":")[3])
        
        const key= result[1]
        result = result[0]

        const error=await redis.hget(key, 'error')

        console.log(error);
        
        if (result === 0) {
          return res.status(404).send({ status: 404, message: "VC not found", error: null, vc: null });
        }
        if (result === 1) {
          return res.status(404).send({ status: 404, message: "VC not Found", error , vc: null });

        }
      } else if (vcData.credStatus.claim.currentStatus === 'Live') {
        return res.status(200).send({ status: 200, message: "VC found", error: "", vc: vcData });
      } else {
        return res.status(404).send({ status: 404, message: "VC not found", error: "", vc: null });
      }
    } catch (error) {

      console.log(error);


      return res.status(404).send({ status: 404, message: "VC not found", error: error, vc: null });

    }
  })

  // Implement /register API:
  // Analogous to register user but not yet activated
  router.post("/register", verifyAccessTokenForThridPartyAuth, userExistsMiddleWare.bind(edvClient),addExpirationDateMiddleware, hypersign.register.bind(hypersign), async (req, res) => {
    try {
      console.log("Register success");
      // You can store userdata (req.body) but this user is not yet activated since he has not
      // validated his email.
      

      if (req.body.hypersign.data.signedVC !== undefined) {        
          //  await queue.addJob({ data: { credentialStatus: req.body.hypersign.data.credentialStatus, proof: req.body.hypersign.data.proof } })
          //  await redis.rpush('vc-txn', JSON.stringify( {
          //     proof: req.body.hypersign.data.proof,
          //     credentialStatus: req.body.hypersign.data.credentialStatus,
          //  }))
          await redis.rpush('vc-txn', JSON.stringify({ txn: req.body.hypersign.data.txn, vcId: req.body.hypersign.data.signedVC.id }))

       
        // push to the queue for further processing
        // await queue.addBulkJob([{name:"credential", data:{proof: req.body.hypersign.data.proof, credentialStatus: req.body.hypersign.data.credentialStatus}}])
        //



        return res
          .status(200)
          .send({
            status: 200,
            message: req.body.hypersign.data.signedVC,
            error: null,
          });
      }

      if (req.body.hypersign.data) {
        return res
          .status(200)
          .send({
            status: 200,
            message: req.body.hypersign.data,
            error: null,
          });
      }
      return res.status(200).send({ status: 200, message: "A QR code has been sent to emailId you provided. Kindly scan the QR code with Hypersign Identity Wallet to receive Hypersign Auth Credential.", error: null });

    } catch (e) {
      res.status(500).send({ status: 500, message: null, error: e.message });
    }
  });

  // Implement /credential API:
  // Analogous to activate user
  router.get("/credential", hypersign.issueCredential.bind(hypersign), (req, res) => {
    try {
      console.log("Credential success");
      // Now you can make this user active
      res
        .status(200)
        .send({
          status: 200,
          message: req.body.verifiableCredential,
          error: null,
        });
    } catch (e) {
      res.status(500).send({ status: 500, message: null, error: e.message });
    }
  }
  );

  router.get('/authdid', (req, res) => {
    try {
      const { keys } = hsJson as any;
      if (!keys) {
        res.statusMessage = "Keys is null or empty in hypersign.json file";
        return res.status(400).end();
      }

      if (!keys.publicKey) {
        res.statusMessage = "PublicKey is null or empty in hypersign.json file";
        return res.status(400).end();
      }


      if (!keys.publicKey.id) {
        res.statusMessage = "PublicKey Id is null or empty in hypersign.json file";
        return res.status(400).end();
      }

      res.status(200).send({ status: 200, message: keys.publicKey.id.split("#")[0], error: null })
    } catch (e) {
      res.statusMessage = e.message
      res.status(500).end();
    }
  })


  ///// Wordpress authentcation server related
  ////////////////////////////

  // Generate new challenge or session
  router.post('/newsession', hypersign.challenge.bind(hypersign), (req, res) => {
    try {
      const { qrData } = req.body
      res.status(200).send(qrData);
    } catch (e) {
      res.statusMessage = e.message
      res.status(500).end();
    }
  });


  // Verify the presentation
  router.post('/auth', hypersign.authenticate.bind(hypersign), (req, res) => {
    try {
      const user = req.body.hsUserData;
      console.log(user)
      // Do something with the user data.
      // The hsUserData contains userdata and authorizationToken
      res.status(200).send({ status: 200, message: user, error: null });
    } catch (e) {
      res.statusMessage = e.message
      res.status(500).end();
    }
  })

  return router;
};
