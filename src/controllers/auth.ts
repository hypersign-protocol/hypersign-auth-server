import { Request, Response } from 'express';
import { User } from '../services/user.service';
import IUser from '../models/IUser';
import { logger, jwtSecret, jwtExpiryInMilli, mail, hs_schema, hostnameurl } from '../config';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import regMailTemplate from '../mailTemplates/registration';
import { MailService } from '../services/mail.service';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import {TEMP_CREDENTIAL_DIR} from '../config'

const generateVCQRcode = async (data) => {
    
    const filename = `QR_${uuidv4()}.png`;
    console.log('Iside generateQR code filename = ', filename);
    await QRCode.toFile(TEMP_CREDENTIAL_DIR+filename, data)
    return filename;
}   

const register = async (req: Request, res: Response) => {
    try {        
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
                if (err) throw new Error(err);
                let link = `${hostnameurl}/api/auth/credential?token=${token}`;
                
                console.log(link);

                const mailService = new MailService({ ...mail });
                let mailTemplate = regMailTemplate;
                mailTemplate = mailTemplate.replace(/@@APPNAME@@/g, hs_schema.APP_NAME);
                mailTemplate = mailTemplate.replace('@@RECEIVERNAME@@', user.fname);
                mailTemplate = mailTemplate.replace('@@LINK@@', link);

                // Send link as QR as well
                // link = `${link}&fromQR=true`;
                const filename = await generateVCQRcode(link);
                console.log('After generate QR filename =', filename);
                // mailTemplate = mailTemplate.replace("@@QRURL@@", QRUrl);
                // console.log(QRUrl)

                try {
                    //TODO: Send email
                    logger.debug('Before sending the mail')
                    const info = await mailService.sendEmail(user.email, mailTemplate, hs_schema.APP_NAME + " Issuance" , filename)
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

            // create 
            // const filePath = path.join(TEMP_CREDENTIAL_DIR + vc['id'] + ".json");
            // await store(vc, filePath);
            // activate this user
            await user.update();

            // 
            const body = { 
                subject: vc.credentialSubject.id, 
                schemaId: vc["@context"][1].hsscheme.split('/get/')[1], 
                dataHash: "", 
                appId: "", 
                issuer: vc.issuer,
                issueDate: vc.issuanceDate,
                expDate: vc.expirationDate
            } 

            console.log(body)
            // // I thought that while issuing a new credential , the sp would be able to see them in studio app. but not required for now.
            // try{
            //     const vc_issue_url = process.env.STUDIO_SERVER_VC_EP
            //     console.log(vc_issue_url)
            //     const resp = await fetch(vc_issue_url, {
            //         method: 'POST',
            //         body: JSON.stringify(body),
            //         headers: { 'Content-Type': 'application/json' },
            //     })
    
            //     const json =  await resp.json()
            //     console.log(json)
                
            // }catch(e){
            //     console.log(e)
            // }
            
            // send vc to download.
            res.status(200).send({ status: 200, message: vc, error: null })
            // if(fromQR){
                
            // // }else{
            // //     res.download(filePath);
            // // }
        })
    } catch (e) {
        res.status(500).send({ status: 500, message: null, error: e.message })
    }

}

export default {
    register,
    getCredential
}