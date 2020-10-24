import { Request, Response } from 'express';
import { User } from '../services/user.service';
import { Challenge } from '../services/challenge.service';
import IUser from '../models/IUser'
import { logger, jwtSecret, jwtExpiryInMilli, mail, port, host } from '../config'
import jwt from 'jsonwebtoken';
import { hypersignSDK } from '../config';
import { retrive, store } from '../utils/file'
import path from 'path'
import fs from 'fs'
import regMailTemplate from '../mailTemplates/registration';
import { MailService } from '../services/mail.service'
import QRCode from 'qrcode';
import IChallenge from '../models/IChallenge';

const TEMP_CREDENTIAL_DIR = path.join(__dirname + "/../" + "temp/")

const ChallengeStore = new Map<string, Challenge>();

const check = (req: Request, res: Response) => {
    const param = {
        chJWT: "chJWT",
        challenge: "challenge",
        domain: "pkiAuth.com",
        redirect_uri: "redirect_uri"
    }

    let query = "?";
    Object.keys(param).forEach((k) => {
        query += `${k}=${param[k]}&`
    })
    query = query.slice(0, query.length - 1)
    res.redirect(`http://localhost:8080/login${query}`)
}

const register_old = async (req: Request, res: Response) => {
    try {
        logger.debug(req.body)
        const body: IUser = req.body
        const user = new User({ ...body })
        // if(user.publicKey == "") throw new Error("PublicKey field can not be null")
        const userindbstr = await user.fetch()
        if (userindbstr) throw new Error(`User ${user.publicKey} already exists`)
        const createdU = await user.create();
        res.status(200).send({ status: 200, message: createdU, error: null })
    } catch (e) {
        res.status(500).send({ status: 500, message: null, error: e.message })
    }
}

const generateVCQRcode = async (data) => {
    return await QRCode.toDataURL(data);
}   

const register = async (req: Request, res: Response) => {
    try {
        console.log(req.body)
        logger.debug(req.body)
        const body: IUser = req.body
        const user = new User({ ...body })
        const userindbstr = await user.fetch({
            email: user.email,
            publicKey: user.publicKey
        })
        if (userindbstr) throw new Error(`User ${user.email} already exists. Please login with Hypersign Credential`)

        // will use the publicKey field for storing did
        // Generate Verifiable credential for this 
        const createdU = await user.create();
        const userData = JSON.parse(createdU);

        Object.keys(userData).forEach(k => {
            if(userData[k] == undefined || userData[k] == null || userData[k] == "") delete userData[k]
        })

        jwt.sign(
            userData,
            jwtSecret,
            { expiresIn: jwtExpiryInMilli },
            async (err, token) => {
                if (err) throw new Error(err)
                let link = `http://${host}:${port}/api/auth/credential?token=${token}`
                const mailService = new MailService({ ...mail });
                let mailTemplate = regMailTemplate;
                mailTemplate = mailTemplate.replace('@@RECEIVERNAME@@', user.fname)
                mailTemplate = mailTemplate.replace('@@LINK@@', link)

                // Send link as QR as well
                link = `${link}&fromQR=true`;
                const QRUrl = await generateVCQRcode(link);
                mailTemplate = mailTemplate.replace("@@QRURL@@", QRUrl);

                try {
                    //TODO: Send email
                    logger.debug('Before sending the mail')
                    const info = await mailService.sendEmail(user.email, mailTemplate, "Account Registration | Hypersign Studio")
                    logger.debug('Mail is sent ' + info.messageId)
                    res.status(200).send({
                        status: 200,
                        message: info,
                        error: null
                    })
                } catch (e) {
                    throw new Error(`Could not send email to ${user.email}. Please check the email address properly.`)
                }
            })
    } catch (e) {
        res.status(500).send({ status: 500, message: null, error: e.message })
    }
}

const getCredential = (req, res) => {
    try {
        const token = req.query.token;
        const fromQR = req.query.fromQR;
        console.log(token)
        if (!token) {
            throw new Error("Token is not passed")
        }
        jwt.verify(token, jwtSecret, async (err, data) => {
            if (err) res.status(403).send({ status: 403, message: "Unauthorized.", error: null })
            const user = new User({ ...data })
            const userindbstr = await user.fetch({
                email: user.email,
                publicKey: user.publicKey
            })
            if (!userindbstr) throw new Error(`User ${user.email} invalid`)
            const vc = await user.generateCredential();

            // create temporary dir
            const vcDir = TEMP_CREDENTIAL_DIR
            if (!fs.existsSync(vcDir)) {
                fs.mkdirSync(vcDir);
            }

            // create 
            const filePath = path.join(vcDir + vc['id'] + ".json");
            await store(vc, filePath);
            // activate this user
            await user.update();

            // send vc to download.
            if(fromQR){
                res.status(200).send({ status: 200, message: vc, error: null })
            }else{
                res.download(filePath);
            }
        })
    } catch (e) {
        res.status(500).send({ status: 500, message: null, error: e.message })
    }

}

async function verifyVP(vp, challenge) {
    if (!vp) throw new Error('vp is null')
    const vc = vp.verifiableCredential[0]
    const isVerified = await hypersignSDK.credential.verifyPresentation({
        presentation: vp,
        challenge,
        issuerDid: vc.issuer,
        holderDid: vc.credentialSubject.id
    }) as any;
    console.log(isVerified)
    if (isVerified.verified) {
        return true
    } else {
        return false
    }
}

const login = async (req: Request, res: Response) => {
    try {
        const challengeExtractedFromChToken = res.locals.data ? res.locals.data.challenge : "";
        let { proof } = req.body;

        if (!proof) res.status(400).send({ status: 400, message: "", error: "Proof property must be passed in the request"})

        // First check is user exist (make sure to check if he is active too)
        let userObj = new User({ ...req.body })
        let userindb = await userObj.fetch({
            email: userObj.email,
            publicKey: userObj.publicKey,
            isActive: "1"
        })
        if (!userindb) res.status(400).send({status: 400, message: null, error: "User does not exists or has not been validated his email."}); 

        // verify the verifiable presentation
        logger.debug(`Before verifying the proof, ch = ${challengeExtractedFromChToken}`)
        if (await verifyVP(JSON.parse(proof), challengeExtractedFromChToken)) {
            userindb = JSON.parse(userindb)
            userindb['id'] = userindb['publicKey'] // TODO: handle it with better way:  add another property (i.e. did)in the model (may be) that will help
            jwt.sign(
                userindb,
                jwtSecret,
                { expiresIn: jwtExpiryInMilli },
                (err, token) => {
                    if (err) throw new Error(err)
                    res.status(200).send({
                        status: 200, message: {
                            m: "Sussfully loggedIn",
                            jwtToken: token,
                            user: userindb
                        }, error: null
                    })
                })
        } else {
            logger.debug('Proof could not verified')
            res.status(401).send({status: 401, message: null, error: "Presentation cannot be verified"});
        }
    } catch (e) {
        res.status(500).send({ status: 500, message: null, error: e.message })
    }
}


const recover = (req: Request, res: Response) => {
    logger.debug('Recover ap called')
    res.send('Recover ap called!')
}

const getNewChallenge = (req: Request, res: Response) => {
    console.log('In the challenge api')
    const challenge = hypersignSDK.did.getChallange();
    jwt.sign(
        { challenge },
        jwtSecret,
        { expiresIn: jwtExpiryInMilli },
        (err, token) => {
            if (err) throw new Error(err)
            res.status(200).send({
                status: 200, message: {
                    JWTChallenge: token,
                    challenge
                }, error: null
            })

        })
    // res.status(200).send({ status: 200, message: getChallange() });
}

// Generate Challenge
const getChallenge = async (req: Request, res: Response) => {
    console.log('In the getSession api')
    try{    
        // browser, tabId, 
        const body: IChallenge = req.body
        const user = new Challenge({ ...body })
        await user.create();
        const challenge =  user.challenge;
        ChallengeStore[user.challenge] = user;
        jwt.sign(
            { challenge },
            jwtSecret,
            { expiresIn: jwtExpiryInMilli },
            (err, token) => {
                if (err) throw new Error(err)
        res.status(200).send({
            status: 200, message: {
                        JWTChallenge: token,
                        challenge,
                        pollChallengeApi: `/api/auth/pollchallenge?challenge=${challenge}`,
                verifyChallengeApi: "/api/auth/verifychallenge"
            }, error: null
        })
            })
        // res.status(200).send({
        //     status: 200, message: {
        //         challenge: sessionData.challenge,
        //         pollChallengeApi: `/api/auth/pollchallenge?challenge=${sessionData.challenge}`,
        //         verifyChallengeApi: "/api/auth/verifychallenge"
        //     }, error: null
        // })

    }catch(e){
        res.status(500).send({ status: 500, message: null, error: e.message })
    }
}

// Poll Challenge
const pollChallenge = async (req: Request, res: Response) => {
    try{
        const challenge =  req.query.challenge;
        
        if (!challenge || challenge ==" ")  res.status(400).send({ status: 400, message: "", error: "challenge is null or empty"})    

        const ch = { challenge } as IChallenge;
        
        const chInDb = ChallengeStore[ch.challenge]
        
        if(!chInDb) res.status(404).send({status: 404, message: null, error: "Challenge not found"}); 
    
        const now = Date.now();
        const expTime = new Date(parseInt(chInDb.expireAt)).getTime();
        if(now > expTime){
            // since the challenge expired
            delete ChallengeStore[ch.challenge]
            // delete this row and stop polling.
            res.status(200).send({ status: 200, message: {
                status: false,
                m: "Challenge expired. Reload the QR to generate new challenge."
            }, error: null})
        }

        if(chInDb.isVerified == "false"){
            res.status(200).send({ status: 200, message: { status:  false, m: "Challenge not yet verified!"}, error: null})
        }else{
            const jwtVp = chInDb.vp
            jwt.verify(jwtVp, jwtSecret, (err, data) => {
                delete ChallengeStore[ch.challenge]
                res.status(200).send({ status: 200, message: {
                    status: true,
                    m: "Sussfully loggedIn",
                    jwtToken: jwtVp,
                    user: data
                }})    
            })            
        }
        // delete the row now.
    }catch(e){
        res.status(500).send({ status: 500, message: null, error: e.message })
    }
}

// Verify Challenge
const verifyChallenge = async (req: Request, res: Response) => {
    try{
        const {challenge, vp } =  req.body;
        if (!vp || !challenge) res.status(400).send({status: 400, message: null, error: "Verifiable Presentation or challenge string is not passed in the request"}); 

        const vpObj = JSON.parse(vp);
        const subject = vpObj['verifiableCredential'][0]['credentialSubject'];

        // First check is user exist (make sure to check if he is active too)
        let userObj = new User({ } as IUser)
        let userindb = await userObj.fetch({
            email: subject['Email'], // get email from vp
            publicKey: subject['id'], // get did from vp
            isActive: "1"
        })
        if (!userindb) throw new Error(`User ${subject['id']} does exists or has not been varified`)

        // Check if challege is expired.
        const chIndb:IChallenge = ChallengeStore[challenge]

        if(!chIndb) res.status(404).send({status: 404, message: null, error: "Challenge not found"}); 

        const now = Date.now();
        const expTime = new Date(parseInt(chIndb.expireAt)).getTime();
        if(now > expTime) throw new Error("Challenge has expired. Rescan the new challenge.")
            

        if (await verifyVP(vpObj, challenge)) {
            userindb = JSON.parse(userindb)
            userindb['id'] = userindb['publicKey'] // TODO: handle it with better way:  add another property (i.e. did)in the model (may be) that will help
            jwt.sign(
                userindb,
                jwtSecret,
                { expiresIn: jwtExpiryInMilli },
                (err, token) => {
                    if (err) throw new Error(err)
                    // token
                    // update the jwt in vp col
                    // update the isVerified=true in db
                    chIndb.isVerified = "true";
                    chIndb.vp = token;
                    ChallengeStore[challenge] = chIndb;
                    res.status(200).send({ status: 200, message: "Success", error: null});
                })
        }else{
            logger.debug('Presentation cannot be verified')
            res.status(401).send({status: 401, message: null, error: "Presentation cannot be verified"});
        }
    }catch(e){
        res.status(500).send({ status: 500, message: null, error: e.message })
    }
}

export default {
    check,
    register,
    login,
    recover,
    getNewChallenge,
    getCredential,
    getChallenge,
    pollChallenge,
    verifyChallenge

}