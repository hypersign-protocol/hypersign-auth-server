import { Router } from "express";

export = (hidWalletInstance) => {
  const router = Router();

  router.get("/faucet/:receipientWalletAddress", async (req, res) => {
    try {
      const {receipientWalletAddress} = req.params;
      if (!receipientWalletAddress) {
        return res
          .status(400)
          .send({
            status: 400,
            message: "",
            error: "Recepient's wallet address must be passed in params",
          });
      }

      /// NOTE sending only enough for users to created DID
      const amount = [
        {
          denom: "uhid",
          amount: "100000",
        },
      ];
      console.log({ recipient: receipientWalletAddress, amount })

      const result = await hidWalletInstance.sendTokens({
        recipient: receipientWalletAddress,
        amount,
      });
      
      if (result.transactionHash != '') {
        return res
          .status(200)
          .send({ status: 200, message: result.transactionHash, error: "" });
      } else{
          throw new Error(result.error)
      }
    } catch (e) {
      console.error(e)
      return res
        .status(500)
        .send({ status: 500, message: "", error: e.message });
    }
  });

  return router;
};
