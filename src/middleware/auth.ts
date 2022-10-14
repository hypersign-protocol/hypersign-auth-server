import fetch from 'node-fetch';

import { auth0Tenant, logger } from '../config';
// TODO move this in hypersign auth js node sdk
export async function verifyAccessTokenForThridPartyAuth(req, res, next){
    logger.info('Inside verifyAccessTokenForThridPartyAuth method')
    const { isThridPartyAuth } = req.body;
    if(isThridPartyAuth === true){
        const { thridPartyAuthProvider, accessToken } = req.body;
        if(thridPartyAuthProvider){
            switch(thridPartyAuthProvider){
                case 'Google': {
                    const { user } = req.body;
                    try{
                        const options = {
                            method: 'GET',
                            url: auth0Tenant + 'userinfo',
                            headers: { authorization: 'Bearer ' + accessToken }
                        };
                        
                        const response = await fetch(options.url, {
                            method: options.method,
                            headers: options.headers
                        })
                        const userFromProvider = await response.json();

                        if((userFromProvider.email === user.email) && userFromProvider.email_verified == true){
                            logger.info('Auth token successfully verified')
                            next();
                        } else {
                            logger.info('Auth token is not verified')
                            return res.status(401).send({
                                status: 401,
                                message: null,
                                error: 'Invalid accessToken',
                            })
                        }
                    }catch(e){
                        logger.error('Error =  '+ e.message)
                        return res.status(401).send({
                            status: 401,
                            message: null,
                            error: e.message,
                        })
                    }
                    break;
                }
                default: {
                    logger.info('Auth provider not supported')
                    return res.status(400).send({
                        status: 400,
                        message: null,
                        error: 'Auth provider not supported',
                    })
                }
            }
        } else {
            logger.info('thridPartyAuthProvider is required if isThridPartyAuth set to true')
            return res.status(400).send({
                status: 400,
                message: null,
                error: 'thridPartyAuthProvider is required if isThridPartyAuth set to true',
            })
        }
    } else {
        logger.info('No isThridPartyAuth, going ahead')
        next()
    }
}