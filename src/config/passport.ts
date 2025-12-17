import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import config from './index';
import User from '../models/User';

passport.use(
  new GoogleStrategy(
    {
      clientID: config.googleClientId,
      clientSecret: config.googleClientSecret,
      callbackURL: config.googleCallbackUrl,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists by Google ID
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // Check if user exists by email
          const email = profile.emails?.[0]?.value;
          if (email) {
            user = await User.findOne({ email });
            if (user) {
              // Link Google account to existing user
              user.googleId = profile.id;
              await user.save();
            }
          }
        }

        if (!user) {
          // Create new user
          user = await User.create({
            name: profile.displayName || profile.name?.givenName || 'User',
            email: profile.emails?.[0]?.value,
            googleId: profile.id,
            role: 'user',
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error as Error, undefined);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
