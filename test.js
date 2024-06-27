import Web3 from 'web3'
import * as bot from './bot.js'
import * as db from './db.js'
import * as utils from './utils.js'

import * as afx from './global.js'

import dotenv from 'dotenv'
dotenv.config()


const options = {
	reconnect: {
		auto: true,
		delay: 5000, // ms
		maxAttempts: 5,
		onTimeout: false
	}
};

export const web3_eth = new Web3(afx.get_ethereum_rpc_http_url())
//await db.init()
//utils.init(web3_eth)

//gasPriceModule.checkGasPrice();

//console.log(await utils.getTokenPrice(web3_eth, '0xB48a0135ed5199Bfc7F3DB926370A24874f6Fe1b'))
let session = 
{
	chatid: '6368601263',
   //chatid: '6095890276', //Apollo: '6368601263',
   username: 'Sparkleye',
   init_eth: 1,
   init_usd: 1000,
   block_threshold: 10,
   max_fresh_transaction_count: 50,
   min_fresh_wallet_count: 0,
   min_whale_balance: 0,
   min_whale_wallet_count: 0,
   min_kyc_wallet_count: 0,
   min_dormant_wallet_count: 0,
   min_dormant_duration: 0,
   min_sniper_count: 25,
   lp_lock: 0,
   contract_age: 0,
   honeypot: 0,
   wallet: null,
   type: 'private',
   permit: 0,
   slippage: 21,
   account: '0xa286407326247bF36750dDD98cd8Fa8065317866',
   pkey: '5cemwzKzmdTp3oO9oQhQKsf78AOv4tnTTvDkXEYc+80QzvYlLLsjj/n3Barz7eXWPE6N2pmVRnjN87sFzY4++1ZqZu6GB4BODMsmAkH16dA=',
   autobuy: 0,
   autosell: 0,
   autosell_hi: 100,
   autosell_lo: -101,
   autosell_hi_amount: 100,
   autosell_lo_amount: 100,
   autobuy_amount: 0,
   __v: 0,
   vip: 1,
   fee: 0,
   antimev: 0,
   antirug: 0,
   gas: 0
 }

// await swap.buyToken(web3_eth, db, session,
// 	'0xB48a0135ed5199Bfc7F3DB926370A24874f6Fe1b', 0.01, 'v2', (msg) => {
// 		console.log(msg)
// 	}
// );

// await swap.buyToken(web3_eth, db, session,
// 	'0xB48a0135ed5199Bfc7F3DB926370A24874f6Fe1b', 0.01, 'v2', (msg) => {
// 		console.log(msg)
// 	}
// );

// await swap.buyToken(web3_eth, db, session,
// 	'0xB48a0135ed5199Bfc7F3DB926370A24874f6Fe1b', 0.01, 'v2', (msg) => {
// 		console.log(msg)
// 	}
// );

// await swap.buyToken(web3_eth, db, session,
// 	'0xB48a0135ed5199Bfc7F3DB926370A24874f6Fe1b', 0.01, 'v2', (msg) => {
// 		console.log(msg)
// 	}
// );

// await swap.sellToken(web3_eth, db, session,
// 	'0xB48a0135ed5199Bfc7F3DB926370A24874f6Fe1b', 1000000, 'v2', (msg) => {
// 		console.log(msg)
// 	}
// );

// await swap.sellToken(web3_eth, db, session,
// 	'0xB48a0135ed5199Bfc7F3DB926370A24874f6Fe1b', 1000100, 'v2', (msg) => {
// 		console.log(msg)
// 	}
// );

// await swap.sellToken(web3_eth, db, session,
// 	'0xB48a0135ed5199Bfc7F3DB926370A24874f6Fe1b', 1000200, 'v2', (msg) => {
// 		console.log(msg)
// 	}
// );

// console.log('fee: ', session.fee)

import * as rwalletReporter from './rwallet_reporter.js'

await db.init()
rwalletReporter.start(web3_eth, db, null)

// console.log('rawEthAmount - 1', web3_eth.utils.toBN(10 ** 18).toString())
// console.log('rawEthAmount - 2', web3_eth.utils.toBN(web3_eth.utils.toWei("2.021", 'ether')))
// console.log('rawEthAmount - 2', web3_eth.utils.formatUnits("2.021", 18))
