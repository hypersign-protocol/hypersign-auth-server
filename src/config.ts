import dotenv from "dotenv";
import path from "path";
import winston from "winston";
import fs from "fs";
import { homedir } from "os";
import mongoose from 'mongoose';

class Configuration {
  private static instace: Configuration;
  public db: any;
  public NODE_ENV: string;
  public HOST: string;
  public PORT: string;
  public baseUrl: string;
  public logger: winston.Logger;
  private LOG_LEVEL: string;
  public dataDIR: string;
  private dbConnUrl: string;
  public whitelistedUrls: any;
  public auth0Tenant: string;
  public jwt:{
    "secret":'',
    "expiryTime": 0

  };

  public HIDNODE_RPC_URL: string;
  public HIDNODE_REST_URL: string;
  public HID_WALLET_MNEMONIC: string;

  private constructor() { }

  public static getInstance(): Configuration {
    if (!Configuration.instace) {
      Configuration.instace = new Configuration();
      Configuration.instace.setupEnvVar();
      Configuration.instace.setup();
      Configuration.instace.setupLogger();
      Configuration.instace.setupDb();
      Configuration.instace.setupHypersign();
    }
    return Configuration.instace;
  }

  private setup() {
    this.HOST = process.env.HOST ? process.env.HOST : "localhost";
    this.PORT = process.env.PORT ? process.env.PORT : "3003";
    this.LOG_LEVEL = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : "info";
    this.NODE_ENV = process.env.NODE_ENV ? process.env.NODE_ENV : "development";
    this.dbConnUrl = process.env.DB_URL && process.env.DB_URL != "" ? process.env.DB_URL : null;
    this.baseUrl = "http://" + this.HOST + ":" + this.PORT;
    this.whitelistedUrls = process.env.WHITELISTED_CORS ? process.env.WHITELISTED_CORS : ['*'];

    this.auth0Tenant = process.env.AUTH0TENANT ? process.env.AUTH0TENANT : "https://fidato.us.auth0.com/";
    this.HIDNODE_RPC_URL = process.env.HIDNODE_RPC_URL ? process.env.HIDNODE_RPC_URL : "http://localhost:26657";
    this.HIDNODE_REST_URL = process.env.HIDNODE_REST_URL ? process.env.HIDNODE_REST_URL : "http://localhost:1317";

    this.HID_WALLET_MNEMONIC = process.env.HID_WALLET_MNEMONIC;


    if (!this.HID_WALLET_MNEMONIC) {
      throw new Error('HS-AUTH-SERVER: Error: mnemonic must be set in ENV for hid wallet creation')
    }

    this.dataDIR = process.env.DATA_DIR
      ? process.env.DATA_DIR
      : path.join(homedir(), "boilerplate");
    if (!fs.existsSync(this.dataDIR)) fs.mkdirSync(this.dataDIR);
  }

  private setupEnvVar() {
    // Enviroment  variable
    ////////////////////////
    const envPath = path.resolve(
      __dirname,
      "../",
      process.env.NODE_ENV + ".env"
    );

    console.log(envPath);

    if (fs.existsSync(envPath)) {
      dotenv.config({
        path: envPath,
      });
    } else {
      dotenv.config();
    }
  }
  private setupHypersign(){
  const hypersignPath=path.resolve(__dirname,"../","hypersign"+".json")
  
  if(fs.existsSync(hypersignPath)){
    const data=fs.readFileSync(hypersignPath)
    const jwt=JSON.parse(data.toString()).jwt
    this.jwt=jwt
    
        
  }
}

  private setupLogger() {
    const logDIR = path.join(this.dataDIR, "./log");
    if (!fs.existsSync(logDIR)) fs.mkdirSync(logDIR);

    const { combine, timestamp, printf } = winston.format;
    const customLogFormat = printf(({ level, message, timestamp }) => {
      return `${timestamp} [${level}] ${message}`;
    });
    const logFilePath = path.join(logDIR, "boilerplate.log");
    this.logger = winston.createLogger({
      level: this.LOG_LEVEL || "info",
      format: combine(timestamp(), customLogFormat),
      transports: [
        new winston.transports.File({
          filename: path.join(logDIR, "boilerplate-error.log"),
          level: "error",
        }),
        new winston.transports.File({ filename: logFilePath }),
      ],
    });
    if (this.NODE_ENV !== "production") {
      this.logger.add(
        new winston.transports.Console({
          format: winston.format.simple(),
        })
      );
    }

    this.logger.info(`Log filepath is set to ${logFilePath}`);
  }

  private async setupDb() {
    if (this.dbConnUrl) {
      await mongoose.connect(this.dbConnUrl,
        { useNewUrlParser: true, useUnifiedTopology: true })
      this.db = mongoose.connection;
    }
  }

}

const {
  db,
  NODE_ENV,
  HOST,
  PORT,
  baseUrl,
  logger,
  whitelistedUrls,
  auth0Tenant,
  HIDNODE_RPC_URL,
  HIDNODE_REST_URL,
  HID_WALLET_MNEMONIC, 
  jwt
  
} = Configuration.getInstance();

const MAX_BATCH_SIZE=process.env.MAX_BATCH_SIZE ? parseInt(process.env.MAX_BATCH_SIZE) : 500;
const MINIMUM_DELAY=process.env.MINIMUM_DELAY ? parseInt(process.env.MINIMUM_DELAY) : 1000;
const MAXIMUM_DELAY=process.env.MAXIMUM_DELAY ? parseInt(process.env.MAXIMUM_DELAY) : 60000;

const REDIS_HOST= process.env.REDIS_HOST || 'localhost'
const REDIS_PORT=process.env.REDIS_PORT || '6379'
const REDIS_PASSWORD=process.env.REDIS_PASSWORD || ''

const EDV_DID_FILE_PATH=process.env.EDV_DID_FILE_PATH || 'edv/did.json'
const EDV_KEY_FILE_PATH=process.env.EDV_KEY_FILE_PATH || 'edv/key.json'
const EDV_CONFIG_DIR=process.env.EDV_CONFIG_DIR || 'edv'
const EDV_ID=process.env.EDV_ID || 'did:example:123456789abcdefghi'
const EDV_BASE_URL=process.env.EDV_BASE_URL || 'http://localhost:7777/encrypted-data-vaults'
export {EDV_BASE_URL,EDV_ID,EDV_CONFIG_DIR,EDV_DID_FILE_PATH,EDV_KEY_FILE_PATH,REDIS_HOST,REDIS_PORT,REDIS_PASSWORD, MAXIMUM_DELAY,MINIMUM_DELAY, MAX_BATCH_SIZE, db, NODE_ENV, HOST, PORT, baseUrl, logger, whitelistedUrls, auth0Tenant, HIDNODE_RPC_URL, HIDNODE_REST_URL, HID_WALLET_MNEMONIC,jwt }
