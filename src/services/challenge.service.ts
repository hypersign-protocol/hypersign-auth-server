import IChallenge  from '../models/IChallenge';
import { DBService, SchemaType } from './db.service';
import { hypersignSDK, challengeExpTime } from '../config';
import { logger, nodeServer, bootstrapConfig } from '../config';

export class Challenge implements IChallenge{
    id: string;
    challenge: string;
    browser: string;
    createdAt: string;
    expireAt: string;
    isVerified: string;
    tabId: string;
    vp: string;
    dbSerice: DBService;
    prefix: string;
    constructor({ id = "", challenge= "", browser = "", createdAt= "", isVerified= "", expireAt ="" , tabId = "", vp = ""}: IChallenge){
        this.id = id; 
        this.challenge = challenge;
        this.browser = browser;
        this.createdAt = createdAt;
        this.expireAt = expireAt;
        this.isVerified = isVerified;
        this.tabId = tabId,
        this.vp = vp;
        this.dbSerice = new DBService();
        this.prefix = 'ch_';
    }

    toString(user: IChallenge){
        return JSON.stringify(user);
    }

    private getId(){
        const uuid = this.prefix + hypersignSDK.did.getChallange()
        return uuid.substring(0, 20)
    }
    async create(){
        this.id = this.getId();
        this.challenge = hypersignSDK.did.getChallange();
        this.createdAt = Date.now().toString();
        this.expireAt = (parseInt(this.createdAt) + new Date(challengeExpTime * 60 * 1000).getTime()).toString();
        this.isVerified = "false";
    }

}