import express from "express";

import dotenv from 'dotenv'
dotenv.config()

import {Session} from '../model.js'

export default (web3, bot) => {

    var router = express.Router();

    router.post('/session-data', (req, res) => {
        // Session.find({}).then(user => {
        //     if (user) {
        //         return res.status(200).send(user);
        //     }
        // });

        Session.aggregate([
            {
              $lookup: {
                from: "users",
                let: { adminId: "$adminid" },
                pipeline: [
                  { $match:
                    { $expr:
                      { $and:
                        [
                          { $eq: ["$chatid", "$$adminId"] },
                        ]
                      }
                    }
                  },
                  { $project:
                    {
                      "_id": 0,
                      "referred_by": 1
                    }
                  }
                ],
                as: "referrers"
              }
            },
            {
              $project: {
                "_id": 0,
                "chatid": 1,
                "username": 1,
                "type": 1,
                "referral_link": 1,
                "adminid": 1,
                "bullet_img": 1,
                "referral_of_owner": { $ifNull: [ { $arrayElemAt: [ "$referrers.referred_by", 0 ] }, null ] }
              }
            }
        ]).then(user => {
            if (user) {
                return res.status(200).send(user);
            }
        });
          
    });
    
    router.post('/session-delete', (req, res) => {
        Session.deleteOne({ _id: req.body._id}).then(user => {
            if (user) {
                return res.status(200).json({message: 'Session deleted successfully. Refreshing data...', success: true})
            }
        });
    });

    return router;
}
