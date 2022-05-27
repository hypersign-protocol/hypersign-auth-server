import { Router } from "express";
import  hsJson  from '../../hypersign.json';
import {registerSchemaBody}from "../middleware/registerSchema";
import { validateRequestSchema } from "../middleware/validateRequestSchema";

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


export = (hypersign: IHypersignAuth) => {
  console.log(hypersign);
  const router = Router();

  router.get('/test', (req, res)=>{
    res.send("Hello")
  } )
  // Implement /register API:
  // Analogous to register user but not yet activated
   router.post("/register", hypersign.register.bind(hypersign), (req, res) => {
    try {
      console.log("Register success");
      console.log(req.body)
      // You can store userdata (req.body) but this user is not yet activated since he has not
      // validated his email.
      if(req.body.hypersign.data){
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
    try{
      const { keys } = hsJson as any;
      if(!keys){
        res.statusMessage = "Keys is null or empty in hypersign.json file";
        return res.status(400).end();
      }
  
      if(!keys.publicKey){
        res.statusMessage = "PublicKey is null or empty in hypersign.json file";
        return res.status(400).end();
      }
  
      
      if(!keys.publicKey.id){
        res.statusMessage = "PublicKey Id is null or empty in hypersign.json file";
        return res.status(400).end();
      }
  
      res.status(200).send({ status: 200, message: keys.publicKey.id.split("#")[0], error: null })
    }catch(e){
      res.statusMessage = e.message
      res.status(500).end();
    }
  })


  ///// Wordpress authentcation server related
  ////////////////////////////

  // Generate new challenge or session
  router.post('/newsession', hypersign.challenge.bind(hypersign), (req, res) => {
    try{
      const { qrData } = req.body
      res.status(200).send(qrData);
    }catch(e){
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
