import express from "express";

import * as database from '../db.js'
import * as utils from '../utils.js'
import * as bot from '../bot.js'
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import dotenv from 'dotenv'
dotenv.config()

import {Admin} from '../model.js'
import * as validator from './validator.js'

export default (web3, bot) => {

    var router = express.Router();

    router.post("/admin-add", async (req, res) => {
    
        const { errors, isValid } = validator.validateRegisterInput(req.body);
        if (!isValid) {
            return res.status(400).json(errors);
        }

        Admin.findOne({ email: req.body.email }).then(user => {
            if (user) {
                return res.status(400).json({ email: 'ID already exists' });
            } else {
                const newUser = new User({
                    name: req.body.name,
                    email: req.body.email,
                    password: req.body.password
                });
                bcrypt.genSalt(10, (err, salt) => {
                    bcrypt.hash(newUser.password, salt, (err, hash) => {
                        if (err) throw err;
                        newUser.password = hash;
                        newUser
                            .save()
                            .then(user => {
                                return res.status(200).json({message: 'User added successfully. Refreshing data...'})
                            }).catch(err => console.log(err));
                    });
                });
            }
        });
    });

    router.post('/admin-data', (req, res) => {
        Admin.find({}).select(['-password']).then(user => {
            if (user) {
                return res.status(200).send(user);
            }
        });
    });
    
    router.post('/admin-delete', (req, res) => {
        Admin.deleteOne({ _id: req.body._id}).then(user => {
            if (user) {
                return res.status(200).json({message: 'User deleted successfully. Refreshing data...', success: true})
            }
        });
    });

    router.post('/admin-update', (req, res) => {
        const { errors, isValid } = validator.validateUpdateUserInput(req.body);
        if (!isValid) {
            return res.status(400).json(errors);
        }
        const _id = req.body._id;
        Admin.findOne({ _id }).then(user => {
            if (user) {
                if (req.body.password !== '') {
                    let salt = bcrypt.genSaltSync(10);
                    let hash = bcrypt.hashSync(req.body.password, salt);
                    user.password = hash;
                } 

                let update = {'name': req.body.name, 'email': req.body.email, 'password': user.password};
                User.update({ _id: _id}, {$set: update}, function(err, result) {
                    if (err) {
                        return res.status(400).json({ message: 'Unable to update user.' });
                    } else {
                        return res.status(200).json({ message: 'User updated successfully. Refreshing data...', success: true });
                    }
                });
            } else {
                return res.status(400).json({ message: 'Now user found to update.' });
            }
        });
    });

    router.post('/login', (req, res) => {

        const { errors, isValid } = validator.validateLoginInput(req.body);
        if (!isValid) {
        console.log('fail', errors)

            return res.status(400).json(errors);

        }

        const email = req.body.email;
        const password = req.body.password;
        Admin.findOne({ email }).then(user => {
            if (!user) {
                return res.status(404).json({ email: 'ID not found' });
            }
            
            bcrypt.compare(password, user.password).then(isMatch => {
                if (isMatch) {
                    const payload = {
                        id: user.id,
                        name: user.name,
                        permission: user.permission 
                    };

                    const secretOrKey = process.env.PASSPORT_SECRET_KEY
                    jwt.sign(
                        payload,
                        secretOrKey,
                        {
                            expiresIn: 31556926 // 1 year in seconds
                        },
                        (err, token) => {
                            res.json({
                                success: true,
                                token: 'Bearer ' + token
                            });
                        }
                    );
                } else {
                    return res
                        .status(400)
                        .json({ password: 'Password incorrect' });
                }
            });
        });
    });


    return router;
}

