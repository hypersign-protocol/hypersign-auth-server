import { Router } from 'express';

import hsJson from '../../hypersign.json';

import userServices from '../services/userServices';
import { IUserModel } from '../models/userModel';

export = (hypersign,edvClient) => {
    const router = Router();
    const userService = new userServices()
    // console.log(await edv.createDocument({'data':'Pratap'}))
  // console.log(await edv.updateDocument({'data':'Pratap Mridha '},'3e58715b-6563-4e97-868d-eea8e9515d80'))
  // console.log(await  edv.getDocument('3e58715b-6563-4e97-868d-eea8e9515d80'));
  // console.log(await edv.getDecryptedDocument('3e58715b-6563-4e97-868d-eea8e9515d80'));
  
  
  

    router.post('/sync',/** middle were for wallet verification*/ async (req, res) => {
        try {
            const { user, document } = req.body
            delete user.document
            user.docId=document
            const userData: IUserModel = user as IUserModel
            userData.docId = document
            let response;
            let status = 201;
            const record = await userService.userExists(userData.userId)
            if (record.exists) {

                // reencrypt and update to edv
                
                //incase of sequence number change
                response=await userService.updateUser(user.userId,userData)
                status = 200
            } else {
                // reencrypt and add document to edv
                //get sequence number from edv and document id from edv
                
                
                const sequenceNo=1
                userData.docId=document
                userData.sequenceNo=sequenceNo
                
                response = await userService.createUser(userData)
            }

            res.status(status).json(response)
        } catch (error) {
            res.status(500).json(
                error.message
            )
        }
    })


    return router;
}