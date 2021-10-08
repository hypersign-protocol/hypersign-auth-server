import { body, param, query } from 'express-validator';


export const registerSchemaBody=[
    body('name').exists({ checkFalsy: true }).trim().withMessage('Name can not be null or empty'),
    body('name').isAlpha().trim().withMessage('Name Cannot be anything other than text'),
    body('email').exists({ checkFalsy: true }).trim().withMessage('email can not be null or empty'),
    body('email').isEmail().trim().withMessage('Email is not valid'),
]
    
