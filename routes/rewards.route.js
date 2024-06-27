import express from "express";

import dotenv from 'dotenv'
dotenv.config()

import {Reward, User} from '../model.js'

export default (web3, database, bot) => {

    var router = express.Router();

    router.post('/rewards-data', (req, res) => {
        // Reward.find({paid:0}).then(rewards => {
        //     if (rewards) {
        //         return res.status(200).send(rewards);
        //     }
        // });

        Reward.aggregate([
            {
                $lookup: {
                from: 'users',
                localField: 'chatid',
                foreignField: 'chatid',
                as: 'user'
                }
            },
            {
                $unwind: '$user'
            },
            {
                $lookup: {
                  from: 'sessions',
                  localField: 'session_id',
                  foreignField: 'chatid',
                  as: 'session'
                }
            },
            {
                $unwind: '$session'
            },
            {
                $addFields: {
                    username: '$user.username',
                    wallet: '$user.wallet',
                    sessionname: '$session.username',
                }
            },
            {
                $project: {
                    _id: 0,
                    chatid: 1,
                    referred_id: 1,
                    session_id: 1,
                    reward: 1,
                    paid: 1,
                    username: 1,
                    wallet: 1,
                    sessionname: 1,
                }
            },
            {
                $match: {
                    paid: 0
                }
            }
            ]).then(results => {
                return res.status(200).send(results);
            }).catch(err => {
                return res.status(200).send([]);
            });
    })
    
    router.post('/rewards-delete', (req, res) => {
        Reward.deleteOne({ _id: req.body._id}).then(reward => {
            if (reward) {
                return res.status(200).json({message: 'Reward deleted successfully. Refreshing data...', success: true})
            }
        });
    });

    return router;
}

