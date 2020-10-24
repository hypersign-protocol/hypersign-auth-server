import { Router, Request, Response } from 'express';
import authCtrl from '../controllers/auth';
import verifyAuth from '../middleware/auth'
import path  from 'path'
import { retrive } from '../utils/file'

const filePath = path.join(__dirname + "/../" + "keys.json")
const router = Router();

router.post('/register', authCtrl.register)

router.post('/verify', verifyAuth , (req, res) => {
    res.status(200).send({
        status: 200,
        message: { 
            m: "The token is verified",
            user: res.locals.data
        },
        error: null
    })
})
router.get('/did', async (req, res) => {
    const keys = JSON.parse(await retrive(filePath))
    if(!keys){
        res.status(400).send({ status: 400, message: null, error: "Keys are not present. Kindly bootstrape first"})
    }

    res.status(200).send({
        status: 200,
        message: keys.publicKey.id.split('#')[0],
        error: null
    })
})

router.get('/credential', authCtrl.getCredential)

export default router;