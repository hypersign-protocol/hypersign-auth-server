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


            //add document validation document must be json compatible
            
            const userData: IUserModel = user as IUserModel
            
            let response;
            let status = 201;
            const record = await userService.userExists(userData.userId)
            if (record.exists) {
                
                userData.sequence=record.user.sequence
                userData.docId=record.user.docId

                //update document in edv
                //get sequence number from edv and document id from edv
                const edvResp=await edvClient.updateDocument(document,userData.docId)
                userData.sequence=edvResp.sequence
                userData.docId=edvResp.id
                // reencrypt and update to edv
                
                //incase of sequence number change
                response=await userService.updateUser(user.userId,userData)
                
                
                status = 200
            } else {
                // reencrypt and add document to edv
                //get sequence number from edv and document id from edv
                console.log("/sync new");

                const edvResp=await edvClient.createDocument(document)
                        
                
                userData.sequence=edvResp.sequence
                userData.docId=edvResp.id
                
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