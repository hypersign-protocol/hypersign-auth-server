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
  
    function getUserData(docId, userData, fromEdv?: false){

        if(fromEdv){
            // get the doc  from vaut


            // decrypt the data from vault

        }



        return {
            userId: userData.userId,
            sequence: 0,
            docId: docId               
        } as IUserModel
    }


    router.post('/sync',verifyJWT, async (req, res) => {
        try {
            const { user, document } = req.body


            //add document validation document must be json compatible
            
            const userData: IUserModel = user as IUserModel
            
            let response: IUserModel;
            let status = 201;
            console.log('edvRoutest:: sync(): BEfore checking if user exists with id '+ userData.userId)
            //const record = await userService.userExists(userData.userId)
            
            
            const equals : { [key: string]: string } = {
                ['content.userId']: userData.userId
            }
            // type QueryResponseErr = { statusCode: number, timestamp: string, path: string, message: Array<any> }
            // type UserDataInEDVType = QueryResponseErr | Array<any> 
            const userDataInEdv: Array<any>  = await edvClient.query(equals)
            console.log('User data in edv ' + JSON.stringify(userDataInEdv))

            if(!(Array.isArray(userDataInEdv))){
                if(userDataInEdv['statusCode'] === 500){
                    throw new Error('Error: '  + JSON.stringify(userDataInEdv['message']))
                }
                throw new Error('Error: Could not query vault for this user id ' + userData.userId)
            }   
            
            if(userDataInEdv.length > 1){
                // This error should not come when bug in edv is fixed related to unique index one. 
                throw new Error('More than one entry found for this user in the edv, id' +  userData.userId)
            }

            const userDocId =  userDataInEdv[0]['id'] ;

            console.log('edvRoutest:: sync(): After checking if user exists with doc id ' + userDocId)
            
            if (userDocId) {
                console.log('edvRoutest:: sync(): User already exists in the db ')
                const userEdvDoc = {
                    encryptedMessage: document.encryptedMessage,
                    userId: userData.userId
                }
                console.log('edvRoutest:: sync(): Preparing documet to insert in edv, doc ' + JSON.stringify(userEdvDoc))
                const edvDocument = edvClient.prepareEdvDocument(userEdvDoc, [{ index: 'content.userId', unique: true }])
                console.log('edvRoutest:: sync(): Before updating the db with docid  ' + userDocId)
                const edvResp = await edvClient.updateDocument(edvDocument, userDocId)
                console.log('edvRoutest:: sync(): After updating the db with docid  ' + userDocId)
                
                // 
                response = getUserData(edvResp.id, userData)
                status = 200
            } else {
                // reencrypt and add document to edv
                //get sequence number from edv and document id from edv
                console.log('edvRoutest:: sync(): User does not exists in the db ')
                const userEdvDoc = {
                    encryptedMessage: document.encryptedMessage,
                    userId: userData.userId
                }
                const edvDocument = edvClient.prepareEdvDocument(userEdvDoc,  [{ index: 'content.userId', unique: true }])
                console.log('edvRoutest:: sync(): Before creaing the db with docid  ')
                const edvResp=await edvClient.createDocument(edvDocument)
                console.log('edvRoutest:: sync(): After creaing the db with docid  ' + edvResp.id)
                
                response = getUserData(edvResp.id, userData)
                // await userService.createUser(userData)
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