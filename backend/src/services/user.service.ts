import { GoogleUserType } from '../types/user-types';
import { User } from '../model/UserSchema';

export class UserService {
    private static instance: UserService;

    static getInstance(): UserService {
        if (!UserService.instance) {
            UserService.instance = new UserService();
        }
        return UserService.instance;
    }

    async createUser(userProps: GoogleUserType, token: { accessToken: string; refreshToken: string }) {
        const { sub: id, name, picture, email } = userProps?._json;
        const existingUser = await User.findOne({ email: email });
        
        if (!existingUser) {
            const user = new User({
                name: name,
                email: email,
                image: picture,
                googleAccessToken: token?.accessToken,
                googleRefreshToken: token?.refreshToken,
                googleId: id
            });
            const newUser = await user.save();
            return {
                authData: {
                    ...newUser.toObject(),
                }
            };
        } else {
            const user = await User.findByIdAndUpdate(
                existingUser?._id,
                {
                    googleAccessToken: token?.accessToken,
                    googleRefreshToken: token?.refreshToken,
                },
                { new: true, runValidators: true }
            );
            const updateUser = user?.toObject();
            return {
                authData: {
                    ...updateUser,
                }
            };
        }
    }
}
