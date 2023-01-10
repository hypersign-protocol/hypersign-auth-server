

import jwt from 'jsonwebtoken'


export const sign = async (payload, secret,expiresIn?) => {
    const token = await jwt.sign(payload, secret, { algorithm: 'HS512' ,expiresIn:expiresIn?expiresIn:60 });
    return token;
}


export const verify = async (token, secret) => {
    const decoded = await jwt.verify(token, secret, { algorithm: 'HS512' });
    return decoded;
}
