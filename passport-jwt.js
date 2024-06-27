
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { Admin } from "./model.js";
import dotenv from 'dotenv'
dotenv.config()

const opts = {};

opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken()
opts.secretOrKey = process.env.PASSPORT_SECRET_KEY

export default function(passport) {
    passport.use(
        new JwtStrategy(opts, (jwt_payload, done) => {
            Admin.findById(jwt_payload.id)
                .then(user => {
                    if (user) {
                        return done(null, user);
                    }
                    return done(null, false);
                })
                .catch(err => console.log(err));
        })
    );
}
