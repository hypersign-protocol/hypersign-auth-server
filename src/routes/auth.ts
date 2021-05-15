import { Router } from "express";
import { keys } from '../../hypersign.json';

export = (hypersign) => {
  const router = Router();

  // Implement /register API:
  // Analogous to register user but not yet activated
  router.post("/register", hypersign.register.bind(hypersign), (req, res) => {
    try {
      console.log("Register success");
      // You can store userdata (req.body) but this user is not yet activated since he has not
      // validated his email.
      res.status(200).send({ status: 200, message: "A QR code has been sent to emailId you provided. Kindly scan the QR code with Hypersign Identity Wallet to receive Hypersign Auth Credential.", error: null });
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
  router.post('/newsession', hypersign.newSession.bind(hypersign), (req, res) => {
    try{
      const { qrData } = req.body
      qrData["challenge"] = qrData["serviceEndpoint"].split("challenge=")[1];
      res.status(200).send({ status: 200, message: qrData, error: null });
    }catch(e){
      res.statusMessage = e.message
      res.status(500).end();
    }
  });


  // Verify the presentation
  router.post('/auth', hypersign.authenticate.bind(hypersign), (req, res) => {
    try {
        const user = req.body.hsUserData;
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
