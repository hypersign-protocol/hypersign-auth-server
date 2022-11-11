import { Router } from "express";
import hsJson from '../../hypersign.json';
import { verifyAccessTokenForThridPartyAuth } from '../middleware/auth';
import { registerSchemaBody } from "../middleware/registerSchema";
import { validateRequestSchema } from "../middleware/validateRequestSchema";
import queue from '../services'


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

function addExpirationDateMiddleware(req, res, next) {
  const now = new Date();
  // valid for 1 year
  const expirationDate = new Date(now.setFullYear(now.getFullYear() + 1)).toString()
  req.body.expirationDate = expirationDate
  next();
}

export = (hypersign: IHypersignAuth) => {
  const router = Router();

  router.get('/test', (req, res) => {
    res.send("Hello")
  })
  // Implement /register API:
  // Analogous to register user but not yet activated
  router.post("/register", /*verifyAccessTokenForThridPartyAuth,*/ addExpirationDateMiddleware, hypersign.register.bind(hypersign), async (req, res) => {
    try {
      console.log("Register success");
      // You can store userdata (req.body) but this user is not yet activated since he has not
      // validated his email.

      if (req.body.hypersign.data.signedVC !== undefined) {
        const vcIdarr = req.body.hypersign.data.signedVC.id.split(':')
        const vcId = vcIdarr[vcIdarr.length - 1]
        if (vcId.length === 45) {
          await queue.addJob({ data: { proof: req.body.hypersign.data.proof, credentialStatus: req.body.hypersign.data.credentialStatus } })

        } else {
          return res.send({
            status: 400,
            message: null,
            error: "Invalid VC",
          })
        }
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
