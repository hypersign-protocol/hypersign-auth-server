import { Router } from 'express';
import { IUserModel } from '../models/userModel';
import { verifyJWT } from '../middleware/auth';
import userServices from '../services/userServices';

export = (hypersign, edvClient) => {
    const router = Router();
    const userService = new userServices()
    
    function getUserData(docId, userData){
        return {
            userId: userData.userId,
            sequence: 0,
            docId: docId               
        } as IUserModel
    }

    async function  getUserDocIdIfUserExists(userId){
        const equals : { [key: string]: string } = {
            ['content.userId']: userId
        }
        const userDataInEdv: Array<any>  = await edvClient.query(equals)
        if(!(Array.isArray(userDataInEdv))){
            if(userDataInEdv['statusCode'] === 500){
                throw new Error('Error: '  + JSON.stringify(userDataInEdv['message']))
            }
            throw new Error('Error: Could not query vault for this user id ' + userId)
        }  

        if(userDataInEdv.length > 1){
            // This error should not come when bug in edv is fixed related to unique index one. 
            throw new Error('More than one entry found for this user in the edv, id' +  userId)
        }

        const userDocId =  userDataInEdv[0] ? userDataInEdv[0]['id'] : undefined ;
        return {
            success: true,
            userDocId
        }
    }


    router.post('/sync',verifyJWT, async (req, res) => {
        try {
            const { user, document } = req.body            
            const userData: IUserModel = user as IUserModel
            
            let response: IUserModel;
            let status = 201;
            console.log('edvRoutest:: sync(): BEfore checking if user exists with id '+ userData.userId)
            const equals : { [key: string]: string } = {
                ['content.userId']: userData.userId
            }
            const userDataInEdv: Array<any>  = await edvClient.query(equals)
            console.log('User data in edv ' + JSON.stringify(userDataInEdv))

            const userDocInEdv  = await getUserDocIdIfUserExists(userData.userId)
            const { userDocId } = userDocInEdv;
            console.log('edvRoutest:: sync(): After checking if user exists with doc id ' + userDocInEdv.userDocId)
            if (userDocInEdv.success && userDocId) {
                console.log('edvRoutest:: sync(): User already exists in the db ')
                const userEdvDoc = {
                    encryptedMessage: document.encryptedMessage,
                    userId: userData.userId
                }
                console.log('edvRoutest:: sync(): Preparing documet to insert in edv, doc ')
                const edvDocument = edvClient.prepareEdvDocument(userEdvDoc, [{ index: 'content.userId', unique: true }])
                console.log('edvRoutest:: sync(): Before updating the db with docid  ' + userDocId)
                const edvResp = await edvClient.updateDocument(edvDocument, userDocId)
                console.log('edvRoutest:: sync(): After updating the db with docid  ' + userDocId)
                response = getUserData(edvResp.id, userData)
                status = 200
            } else {
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


            const userDocInEdv  = await getUserDocIdIfUserExists(userId)
            const { userDocId } = userDocInEdv;

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