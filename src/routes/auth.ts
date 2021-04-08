import { Router } from "express";

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

  return router;
};
