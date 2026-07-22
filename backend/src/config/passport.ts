import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { UserService } from '../services/user.service';

export function configurePassport() {
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID as string,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
                callbackURL: process.env.CALL_BACK_URL,
            },
            async (accessToken: string, refreshToken: string, profile: any, done: any) => {
                try {
                    const userService = UserService.getInstance();
                    const user = await userService.createUser(profile, { accessToken, refreshToken });
                    return done(null, user);
                } catch (error) {
                    return done(error, null);
                }
            }
        )
    );

    passport.serializeUser((user: any, done) => {
        done(null, user);
    });

    passport.deserializeUser(async (obj: any, done) => {
        try {
            done(null, obj);
        } catch (error) {
            done(error, null);
        }
    });
}
