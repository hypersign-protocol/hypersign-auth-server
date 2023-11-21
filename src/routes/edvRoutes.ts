import { Router } from 'express';

import hsJson from '../../hypersign.json';

import userServices from '../services/userServices';
import { IUserModel } from '../models/userModel';
import { verifyJWT } from '../middleware/auth';

export = (hypersign, edvClient) => {
    const router = Router();
    const userService = new userServices()
    // console.log(await edv.createDocument({'data':'Pratap'}))
  // console.log(await edv.updateDocument({'data':'Pratap Mridha '},'3e58715b-6563-4e97-868d-eea8e9515d80'))
  // console.log(await  edv.getDocument('3e58715b-6563-4e97-868d-eea8e9515d80'));
  // console.log(await edv.getDecryptedDocument('3e58715b-6563-4e97-868d-eea8e9515d80'));
  
  
  

    router.post('/sync',verifyJWT, async (req, res) => {
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
                const edvDocument = edvClient.prepareEdvDocument(document)
                const edvResp=await edvClient.updateDocument(edvDocument, userData.docId)
                userData.sequence=edvResp.sequence
                userData.docId=edvResp.id
                // reencrypt and update to edv
                
                //incase of sequence number change
                response=await userService.updateUser(user.userId,userData)
                
                
                status = 200
            } else {
                // reencrypt and add document to edv
                //get sequence number from edv and document id from edv

                const edvDocument = edvClient.prepareEdvDocument(document)
                const edvResp=await edvClient.createDocument(edvDocument)
                        
                
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





    router.get('/sync/:userId',verifyJWT,async (req, res) => {
        try {

            const {userId}=req.params
    
            const record = await userService.userExists(userId)
            let userData={} as IUserModel
            

            if(record.exists){
                
                userData.sequence=record.user.sequence
                userData.docId=record.user.docId
    
                const edvResp=await edvClient.getDecryptedDocument(userData.docId)
    
                res.status(200).json(
                    edvResp
                )
    
    
            }else{
                res.status(500).json({
                    message:"User not found."
                })
            }
        } catch (error) {
            res.status(500).json({
                error
            })
        }
       


    })


    router.post('/sync/verifytoken',verifyJWT,async(req,res)=>{
        res.status(200).json({
            verified:true
        })
    })



    return router;
}