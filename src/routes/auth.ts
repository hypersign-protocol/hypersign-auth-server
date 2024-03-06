import { Router } from "express";
import hsJson from "../../hypersign.json";
import {
  issueJWT,
  verifyAccessTokenForThridPartyAuth,
} from "../middleware/auth";
import { registerSchemaBody } from "../middleware/registerSchema";
import { validateRequestSchema } from "../middleware/validateRequestSchema";
import { IUserModel } from "../models/userModel";
import {
  HIDNODE_REST_URL,
  REDIS_HOST,
  REDIS_PASSWORD,
  REDIS_PORT,
} from "../config";
let c = 0;

import Redis from "ioredis";

const redis = new Redis({
  port: parseInt(REDIS_PORT),
  host: REDIS_HOST,
  password: REDIS_PASSWORD,
});

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
  const expirationDate = new Date(
    now.setFullYear(now.getFullYear() + 1)
  ).toString();
  req.body.expirationDate = expirationDate;
  next();
}

export = (hypersign: IHypersignAuth, edvClient) => {
  const router = Router();

  async function getUserDocIdIfUserExists(userId, nameSpace = "default") {
    try {
      console.log("authRoutes:: getUserDocIdIfUserExists(): starts");
      const equals: { [key: string]: string } = {
        ["content.userId"]: userId,
        ["content.nameSpace"]: nameSpace,
      };
      console.log(
        "authRoutes:: getUserDocIdIfUserExists(): Before quering edvClient for userID " +
          userId
      );
      const userDataInEdv: Array<any> = await edvClient.query(equals);
      if (!Array.isArray(userDataInEdv)) {
        if (userDataInEdv["statusCode"] === 500) {
          console.log(JSON.stringify(userDataInEdv["message"]));
          throw new Error("Error: something went wrong");
        }
        throw new Error(
          "Error: Could not query vault for this user id " + userId
        );
      }

      if (userDataInEdv.length === 0) {
        throw new Error("No record found for user, id" + userId);
      }

      if (userDataInEdv.length > 1) {
        // This error should not come when bug in edv is fixed related to unique index one.
        throw new Error(
          "More than one entry found for this user in the edv, id" + userId
        );
      }

      const userDocId = userDataInEdv[0] ? userDataInEdv[0]["id"] : undefined;
      return {
        success: true,
        userDocId,
      };
    } catch (e) {
      console.log(e);
      return {
        success: false,
      };
    }
  }

  async function userExistsMiddleWare(req, res, next) {
    const {
      user,
      isisThridPartyAuth,
      thridPartyAuthProvider,
      authToken,
      forgetPassword,
    } = req.body;
    const userData: IUserModel = {
      userId: user.email,
      sequence: 0,
      docId: "",
    } as IUserModel;

    console.log(
      "auth:: userExistsMiddleWare() : BEfore checking if user already exists"
    );
    const userDocInEdv = await getUserDocIdIfUserExists(userData.userId);

    console.log(
      "auth:: userExistsMiddleWare() : After checking if user already exists, status " +
        userDocInEdv.success
    );
    if (userDocInEdv.success && forgetPassword !== "true") {
      const docId = userDocInEdv.userDocId;
      // decrypt
      return res.status(403).send({
        status: 403,
        message: "User already exists",
        error: null,
        data: {
          docId: docId,
          sequence: 0,
          userId: userData.userId,
        } as IUserModel,
        authToken,
      });
    }
    next();
  }

  router.get("/test", (req, res) => {
    res.send("Hello");
  });

  // Implement /vcId status check

  router.get("/vcstatus/:vcId", async (req, res) => {
    try {
      const { vcId } = req.params;
      interface Ivc {
        credStatus: {
          claim: {
            currentStatus: string;
          };
        };
      }
      // const vc = await redis.addListener(vcId)
      const vc = await fetch(
        `${HIDNODE_REST_URL}hypersign-protocol/hidnode/ssi/credential/${vcId}`
      );

      const vcData = await vc.json();

      console.log(vcData);

      if (
        vcData.message?.includes(`credential status document ${vcId} not found`)
      ) {
        let result = await redis.call(
          "ft.search",
          "idx:vc-txn-err",
          vcId.split(":")[3]
        );

        const key = result[1];
        result = result[0];

        const error = await redis.hget(key, "error");

        console.log(error);

        if (result === 0) {
          return res.status(404).send({
            status: 404,
            message: "VC not found",
            error: null,
            vc: null,
          });
        }
        if (result === 1) {
          return res
            .status(404)
            .send({ status: 404, message: "VC not Found", error, vc: null });
        }
      } else if (
        vcData.credentialStatus.credentialStatusDocument.revoked === false &&
        vcData.credentialStatus.credentialStatusDocument.suspended === false
      ) {
        return res
          .status(200)
          .send({ status: 200, message: "VC found", error: "", vc: vcData });
      } else {
        return res
          .status(404)
          .send({ status: 404, message: "VC not found", error: "", vc: null });
      }
    } catch (error) {
      console.log(error);

      return res
        .status(404)
        .send({ status: 404, message: "VC not found", error: error, vc: null });
    }
  });

  // Implement /register API:
  // Analogous to register user but not yet activated
  router.post(
    "/register",
    verifyAccessTokenForThridPartyAuth,
    issueJWT,
    userExistsMiddleWare.bind(edvClient),
    addExpirationDateMiddleware,
    hypersign.register.bind(hypersign),
    async (req, res) => {
      try {
        console.log("Register success");
        // You can store userdata (req.body) but this user is not yet activated since he has not
        // validated his email.

        const { authToken } = req.body;
        console.log(
          "Inside /register :: Before calling if(req.body.hypersign.data.signedCredential"
        );
        if (req.body.hypersign.data.signedCredential !== undefined) {
          console.log("Inside /register :: Before pushing into redis...vc-txn");
          await redis.rpush(
            "vc-txn",
            JSON.stringify({
              txn: req.body.hypersign.data.txn,
              vcId: req.body.hypersign.data.signedCredential.id,
            })
          );
          console.log("Inside /register :: After pushing into redis...vc-txn");

          return res.status(200).send({
            status: 200,
            message: req.body.hypersign.data.signedCredential,
            error: null,
            authToken,
          });
        }

        if (req.body.hypersign.data) {
          return res.status(200).send({
            status: 200,
            message: req.body.hypersign.data,
            error: null,
            authToken,
          });
        }
        return res.status(200).send({
          status: 200,
          message:
            "A QR code has been sent to emailId you provided. Kindly scan the QR code with Hypersign Identity Wallet to receive Hypersign Auth Credential.",
          error: null,
        });
      } catch (e) {
        res.status(500).send({ status: 500, message: null, error: e.message });
      }
    }
  );

  // Implement /credential API:
  // Analogous to activate user
  router.get(
    "/credential",
    hypersign.issueCredential.bind(hypersign),
    (req, res) => {
      try {
        console.log("Credential success");
        // Now you can make this user active
        res.status(200).send({
          status: 200,
          message: req.body.verifiableCredential,
          error: null,
        });
      } catch (e) {
        res.status(500).send({ status: 500, message: null, error: e.message });
      }
    }
  );

  router.get("/authdid", (req, res) => {
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
        res.statusMessage =
          "PublicKey Id is null or empty in hypersign.json file";
        return res.status(400).end();
      }

      res.status(200).send({
        status: 200,
        message: keys.publicKey.id.split("#")[0],
        error: null,
      });
    } catch (e) {
      res.statusMessage = e.message;
      res.status(500).end();
    }
  });

  ///// Wordpress authentcation server related
  ////////////////////////////

  // Generate new challenge or session
  router.post(
    "/newsession",
    hypersign.challenge.bind(hypersign),
    (req, res) => {
      try {
        const { qrData } = req.body;
        res.status(200).send(qrData);
      } catch (e) {
        res.statusMessage = e.message;
        res.status(500).end();
      }
    }
  );

  // Verify the presentation
  router.post("/auth", hypersign.authenticate.bind(hypersign), (req, res) => {
    try {
      const user = req.body.hsUserData;
      console.log(user);
      // Do something with the user data.
      // The hsUserData contains userdata and authorizationToken
      res.status(200).send({ status: 200, message: user, error: null });
    } catch (e) {
      res.statusMessage = e.message;
      res.status(500).end();
    }
  });

  return router;
};
