import fetch from 'node-fetch';
import { sign, verify } from '../services/authTokenService';
import { jwt } from '../config'

import { auth0Tenant, logger } from '../config';
// TODO move this in hypersign auth js node sdk
export async function verifyAccessTokenForThridPartyAuth(req, res, next) {
    logger.info('Inside verifyAccessTokenForThridPartyAuth method')
    const { isThridPartyAuth } = req.body;
    if (isThridPartyAuth === true) {
        const { thridPartyAuthProvider, accessToken } = req.body;
        if (thridPartyAuthProvider) {
            switch (thridPartyAuthProvider) {
                case 'Google': {
                    const { user } = req.body;
                    try {
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

                        if ((userFromProvider.email === user.email) && userFromProvider.email_verified == true) {
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
                    } catch (e) {
                        logger.error('Error =  ' + e.message)
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



export async function verifyJWT(req, res, next) {
    try {
        const token = req.headers.authorization.split(' ')[1]

        await verify(token, jwt.secret)


        next()
    } catch (error) {
        res.status(401).send(error)
    }


}


export async function issueJWT(req, res, next) {

    const { user } = req.body

    const payload = {
        name: user.name,
        email: user.email

    }
    const token = await sign(payload, jwt.secret, jwt.expiryTime)
    req.body.authToken = token
    next()


}