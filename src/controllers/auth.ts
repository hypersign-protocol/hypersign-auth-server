import { Request, Response } from 'express';
import { User } from '../services/user.service';
import IUser from '../models/IUser'
import { logger, jwtSecret, jwtExpiryInMilli, mail, port, host } from '../config'
import jwt from 'jsonwebtoken';
import { retrive, store } from '../utils/file'
import path from 'path'
import fs from 'fs'
import regMailTemplate from '../mailTemplates/registration';
import { MailService } from '../services/mail.service'
import QRCode from 'qrcode';


const TEMP_CREDENTIAL_DIR = path.join(__dirname + "/../" + "temp/")

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

export default {
    register,
    getCredential
}