import express from "express";

import * as database from '../db.js'
import * as utils from '../utils.js'
import * as bot from '../bot.js'
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import dotenv from 'dotenv'
dotenv.config()

import {User} from '../model.js'

export default (web3, database, bot) => {
    var router = express.Router();

    router.post('/dashboard-data', async (req, res) => {

        let result = {}

        try {

            result.userCount = await User.countDocuments({})

        } catch (err) {

            result.userCount = 0
        }

        return res.status(200).json(result)
    });

    return router;
}

