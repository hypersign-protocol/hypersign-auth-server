import { Router } from 'express';

import hsJson from '../../hypersign.json';

import userServices from '../services/userServices';
import { IUserModel } from '../models/userModel';

export = (hypersign) => {
    const router = Router();
    const userService = new userServices()
    router.post('/sync',/** middle were for wallet verification*/ async (req, res) => {
        try {
            const { user, documnet } = req.body
            const userData: IUserModel = user as IUserModel

            let response;
            let status = 201;
            const record = await userService.userExists(userData.userId)
            if (record.exists) {

                // reencrypt and update to edv
                
                //incase of sequence number change
                response=await userService.updateUser(user.userId,user)
                status = 200
            } else {
                // reencrypt and add document to edv
                response = await userService.createUser(user)
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