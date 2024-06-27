import Web3 from 'web3'
import * as bot from './bot.js'
import * as db from './db.js'
import * as afx from './global.js'
import * as server from './server.js'
import * as utils from './utils.js'
import * as gasPriceModule from './checkGasPrice.js'
import * as swap from './swap_v2.js'

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

await db.init()
await bot.init(db)
utils.init(web3_eth)

server.start(web3_eth, db, bot);

gasPriceModule.checkGasPrice();
swap.start(web3_eth, db, bot)