
import userModel, { IUserModel } from '../models/userModel';

/**
 * @class userServices
 * @description User Services
 * @exports userServices
 * @version 1.0.0
 * @since 1.0.0
 * @example
 * import userServices from './services/userServices';
 * const userServices = new userServices();
 * userServices.createUser(user);
 * userServices.getUserByDbId(id);
 * userServices.getUserByUserId(userId);
 * userServices.updateUser(userId, user);
 * userServices.updateUserByDbId(_id, user);
 * userServices.userExists(userId);
 * 
*/
export default class userServices {
    
    /**
     * 
     * @param user : IUserModel
     * @description Create User
     * @returns Promise<IUserModel>
     * @example
     * const userServices = new userServices();
     * userServices.createUser(user);
     *  
     * 
     */
    public async createUser(user: IUserModel) {
        const newUser = new userModel(user);
        return await newUser.save();
    }

    /**
     * 
     * @param id : string
     * @description Get User By Db Id
     * @returns Promise<IUserModel>
     * @example
     * const userServices = new userServices();
     * userServices.getUserByDbId(id);
     * 
     *  
     */
    public async getUserByDbId(id: string) {
        return await userModel
            .findById(id)
            .exec();

    }
    /**
     * 
     * @param userId : string
     * @description Get User By User Id
     * @returns Promise<IUserModel>
     * @example
     * const userServices = new userServices();
     * userServices.getUserByUserId(userId);
     */
    public async getUserByUserId(userId: string) {
        return await userModel
            .findOne({ userId: userId })
            .exec();

    }
    /**
     * 
     * @param userId : string
     * @param user : IUserModel
     * @returns Promise<IUserModel>
     * @description Update User By User Id and User Model
     * @example 
     * const userServices = new userServices();
     * userServices.updateUser(userId, user);
     * 
     */
    public async updateUser(userId: string, user: IUserModel) {
        const { _id } = await this.getUserByUserId(userId);
        return await userModel
            .findByIdAndUpdate(_id, user, { new: true })
            .exec();
    }
    /**
     * 
     * @param _id : string
     * @param user : IUserModel
     * @returns Promise<IUserModel>
     * @description Update User By Db Id and User Model
     * @example
     * const userServices = new userServices();
     * userServices.updateUserByDbId(_id, user);
     */
    public async updateUserByDbId(_id: string, user: IUserModel) {
        return await userModel
            .findById(_id, user, { new: true })
            .exec();        

    }
    /**
     * 
     * @param userId : string
     * @returns Promise<{exists:boolean, user:IUserModel}>
     * @description Check if User Exists
     * @example
     * const userServices = new userServices();
     * userServices.userExists(userId);
     */
    public async userExists(userId: string) {
        const user = await this.getUserByUserId(userId);
        return {exists:user !== null , user};
    }
}