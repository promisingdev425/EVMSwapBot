import * as instance from './bot.js'
import { DEFAULT_ETH_GAS } from './uni-catch/const.js'
import * as utils from './utils.js'
import * as afx from './global.js'
import assert from 'assert'
import dotenv from 'dotenv'
dotenv.config()


/*
start - welcome
*/

export const procMessage = async (message, database) => {

	let chatid = message.chat.id.toString();
	let session = instance.sessions.get(chatid)
	let userName = message?.chat?.username;

	if (message.photo) {
		console.log(message.photo)
	}

	if (message.animation) {
		console.log(message.animation)
	}

	if (!message.text)
		return;


	let command = message.text;
	if (message.entities) {
		for (const entity of message.entities) {
			if (entity.type === 'bot_command') {
				command = command.substring(entity.offset, entity.offset + entity.length);
				break;
			}
		}
	}

	if (command.startsWith('/')) {

		if (!session) {

			if (!userName) {
				console.log(`Rejected anonymous incoming connection. chatid = ${chatid}`);
				await instance.sendMessage(chatid, `Welcome to TeleSwap bot. We noticed that your telegram does not have a username. Please create username and try again. If you have any questions, feel free to ask the developer team. Thank you.`)
				return;
			}

			if (false && !await instance.checkWhitelist(userName)) {

				//await instance.sendMessage(chatid, `😇Sorry, but you do not have permission to use alphBot. If you would like to use this bot, please contact the developer team at ${process.env.TEAM_TELEGRAM}. Thanks!`);
				console.log(`Rejected anonymous incoming connection. @${userName}, ${chatid}`);
				return;
			}

			console.log(`@${userName} session has been permitted through whitelist`);

			session = instance.createSession(chatid, userName, 'private');
			session.permit = 1;

			await database.updateUser(session)
		}

		// if (session.permit !== 1) {
		// 	session.permit = await instance.isAuthorized(session) ? 1 : 0;
		// }

		// if (false && session.permit !== 1) {
		// 	//await instance.sendMessage(chatid, `😇Sorry, but you do not have permission to use alphBot. If you would like to use this bot, please contact the developer team at ${process.env.TEAM_TELEGRAM}. Thank you for your understanding. [2]`);
		// 	return;
		// }

		let params = message.text.split(' ');
		if (params.length > 0 && params[0] === command) {
			params.shift()
		}

		command = command.slice(1);

		if (command === instance.COMMAND_START) {

			const menu = instance.json_mainMenu(session.chatid);

			await instance.sendOptionMessage(session.chatid, await instance.getWelcomeMessage(session), menu.options)
		}
	} else if (message.reply_to_message) {

		await processSettings(message, database);
		await instance.removeMessage(chatid, message.reply_to_message.message_id)
		//await instance.removeMessage(chatid, message.message_id)

	} else {
		const value = message.text.trim()
		if (utils.isValidAddress(value)) {

			const session = instance.sessions.get(chatid)

			if (session && instance._callback_proc) {
				instance._callback_proc(instance.OPTION_MSG_GETTOKENINFO, { session, address: value })
			}
		}
	}
}

const processSettings = async (msg, database) => {

	const privateId = msg.chat?.id.toString()

	let stateNode = instance.stateMap_get(privateId)

	if (!stateNode) {
		instance.stateMap_set(privateId, instance.STATE_IDLE, { sessionId: privateId })
		stateNode = instance.stateMap_get(privateId)

		assert(stateNode)
	}

	if (stateNode.state === instance.STATE_WAIT_BUY_TOKEN_ADDR) {

		const session = instance.sessions.get(stateNode.data.sessionId);
		assert(session);

		const addr = msg.text.trim();
		if (!utils.isValidAddress(addr)) {
			await instance.sendReplyMessage(privateId, `🚫 Sorry, the address you entered is invalid. Please input again`);
			return;
		}

		const tokenInfo = await utils.getTokenInfo(addr)
		if (!tokenInfo) {
			await instance.sendReplyMessage(privateId, `🚫 Sorry, the address you entered is invalid. Please input again - 2`)
			return
		}

		const priceInEth = await utils.getTokenPrice(utils.web3Inst, addr);

		if (priceInEth > 0) {
			const message = `🔖 ${tokenInfo.name} (${tokenInfo.symbol}) Price: <code>${utils.roundDecimal(priceInEth, 9)}</code> ETH
════════════════════════════════════
Please enter ETH amount to buy tokens`

			await instance.sendReplyMessage(privateId, message);

			instance.stateMap_set(privateId, instance.STATE_WAIT_ETH_AMOUNT_FOR_BUY,
				{
					sessionId: stateNode.data.sessionId,
					tokenAddr: addr,
					tokenSymbol: tokenInfo.symbol,
					tokenDecimal: tokenInfo.decimal,
					tokenPrice: priceInEth
				});
		} else {
			await instance.sendReplyMessage(privateId, `😢 Sorry, there were some errors on the command. Please try again later 😉`);
		}

		return;

	} else if (stateNode.state === instance.STATE_WAIT_ETH_AMOUNT_FOR_BUY) {

		const session = instance.sessions.get(stateNode.data.sessionId);
		assert(session);

		const value = Number(msg.text.trim())
		if (!value || value < 0.00001 || isNaN(value)) {
			await instance.sendMessage(privateId, `🚫 Sorry, the value you entered is invalid. it must be greater than 0.00001`)
			return
		}

		const ethBalance = await utils.getTokenBalanceFromWallet(utils.web3Inst, session.account, 0);

		if (ethBalance < value) {
			await instance.sendMessage(privateId, `🚫 Insufficient ETH balance in your wallet`)
			return
		}
		
		stateNode.data.eth_amount_for_buy = value;

		const message = await instance.buildSwapConfirm_Buy(stateNode.data.tokenAddr, stateNode.data.tokenSymbol, stateNode.data.tokenDecimal, stateNode.data.eth_amount_for_buy)
		const menu = await instance.json_buyMenu(privateId);
		if (menu)
			await instance.openMenu(privateId, message, menu.options)

		instance.stateMap_set(privateId, instance.STATE_WAIT_FOR_BUY, { 
			sessionId: privateId, 
			tokenAddr: stateNode.data.tokenAddr, 
			eth_amount_for_buy: value,
			tokenDecimal: stateNode.data.tokenDecimal,
			tokenSymbol: stateNode.data.tokenSymbol
		})

		return;

	} else if (stateNode.state === instance.STATE_WAIT_SELL_TOKEN_ADDR) {

		const session = instance.sessions.get(stateNode.data.sessionId);
		assert(session);

		const addr = msg.text.trim();
		if (!utils.isValidAddress(addr)) {
			await instance.sendReplyMessage(privateId, `🚫 Sorry, the address you entered is invalid. Please input again`);
			return;
		}

		const tokenInfo = await utils.getTokenInfo(addr)
		if (!tokenInfo) {
			await instance.sendReplyMessage(privateId, `🚫 Sorry, the address you entered is invalid. Please input again - 2`)
			return
		}

		const tokenBalance = await utils.getTokenBalanceFromWallet(utils.web3Inst, session.account, tokenInfo.address);

		const priceInEth = await utils.getTokenPrice(utils.web3Inst, addr);

		if (priceInEth > 0) {
			const message = `🔖 ${tokenInfo.name} (${tokenInfo.symbol}) Price: <code>${utils.roundDecimal(priceInEth, 9)}</code> ETH
Balance in your wallet: <code>${utils.roundDecimal(tokenBalance, 5)}</code> ${tokenInfo.symbol}
════════════════════════════════════
Please enter token amount to sell`

			await instance.sendReplyMessage(privateId, message);

			instance.stateMap_set(privateId, instance.STATE_WAIT_TOKEN_AMOUNT_FOR_SELL,
				{
					sessionId: stateNode.data.sessionId,
					tokenAddr: addr,
					tokenSymbol: tokenInfo.symbol,
					tokenDecimal: tokenInfo.decimal,
					tokenPrice: priceInEth
				});
		} else {
			await instance.sendReplyMessage(privateId, `😢 Sorry, there were some errors on the command. Please try again later 😉`);
		}

		return;

	} else if (stateNode.state === instance.STATE_WAIT_TOKEN_AMOUNT_FOR_SELL) {

		const session = instance.sessions.get(stateNode.data.sessionId);
		assert(session);

		const tokenBalance = await utils.getTokenBalanceFromWallet(utils.web3Inst, session.account, stateNode.data.tokenAddr);

		const value = Number(msg.text.trim())
		if (!value || isNaN(value)) {
			await instance.sendMessage(privateId, `🚫 Sorry, the value you entered is invalid.`)
			return
		} 

		if (value > tokenBalance) {
			await instance.sendMessage(privateId, `🚫 Insufficient token balance in your wallet`)
			return
		}

		stateNode.data.token_amount_for_sell = value;

		const message = await instance.buildSwapConfirm_Sell(stateNode.data.tokenAddr, stateNode.data.tokenSymbol, stateNode.data.tokenDecimal, stateNode.data.token_amount_for_sell)
		const menu = await instance.json_sellMenu(privateId);
		if (menu)
			await instance.openMenu(privateId, message, menu.options)

		instance.stateMap_set(privateId, instance.STATE_WAIT_FOR_SELL, { 
			sessionId: privateId, 
			tokenAddr: stateNode.data.tokenAddr, 
			token_amount_for_sell: value,
			tokenDecimal: stateNode.data.tokenDecimal,
			tokenSymbol: stateNode.data.tokenSymbol
		})

		return

	} else if (stateNode.state === instance.STATE_WAIT_LQ_TOKEN_ADDR) {

		const session = instance.sessions.get(stateNode.data.sessionId);
		assert(session);

		const addr = msg.text.trim();
		if (!utils.isValidAddress(addr)) {
			await instance.sendReplyMessage(privateId, `🚫 Sorry, the address you entered is invalid. Please input again`);
			return;
		}

		const tokenInfo = await utils.getTokenInfo(addr)
		if (!tokenInfo) {
			await instance.sendReplyMessage(privateId, `🚫 Sorry, the address you entered is invalid. Please input again - 2`)
			return
		}

		const ethBalance = await utils.getTokenBalanceFromWallet(utils.web3Inst, session.account, 0);
		const tokenBalance = await utils.getTokenBalanceFromWallet(utils.web3Inst, session.account, addr);
		const poolInfo = await utils.getPoolInfo(utils.web3Inst, addr, session.account);

		if (stateNode.data.isAdd === true) {
			if (poolInfo.lpSupply <= 0) {
				await instance.sendMessage(privateId,
					`✅ Token: ${tokenInfo.name} (${tokenInfo.symbol})

✅ Your Wallet Info:
					✅ ETH balance: ${utils.roundDecimal(ethBalance, 5)} ETH
					✅ ${tokenInfo.symbol} Token balance: ${utils.roundDecimal(tokenBalance, 3)} ${tokenInfo.symbol}
	
✅ ${tokenInfo.symbol}-ETH Pool is not existed. You are initial liquidity provider!`);
			} else {
				await instance.sendMessage(privateId,
					`✅ Token: ${tokenInfo.name} (${tokenInfo.symbol})

✅ Your Wallet Info:
					✅ ETH balance: ${utils.roundDecimal(ethBalance, 5)} ETH
					✅ ${tokenInfo.symbol} Token balance: ${utils.roundDecimal(tokenBalance, 3)} ${tokenInfo.symbol}

✅ ${tokenInfo.symbol}-ETH Pool Info:
					✅ WETH balance: ${utils.roundDecimal(poolInfo.wethBalance, 5)} ETH
					✅ ${tokenInfo.symbol} Token balance: ${utils.roundDecimal(poolInfo.tokenBalance, 3)} ${tokenInfo.symbol}
					`);
			}

			await instance.sendReplyMessage(privateId, `Please enter amount of ETH to add liquidity`);

			instance.stateMap_set(privateId, instance.STATE_WAIT_LQ_ETH_AMOUNT,
				{
					sessionId: stateNode.data.sessionId,
					ethBalance: ethBalance,
					tokenAddr: addr,
					tokenSym: tokenInfo.symbol,
					tokenBalance: tokenBalance,
					tokenDecimals: tokenInfo.decimal,
				});
		} else {
			if (poolInfo.lpBalance <= 0) {
				await instance.sendMessage(privateId,
					`🚫 Sorry, you have no ${tokenInfo.symbol}-ETH Liquidity Pool.`);
				return;
			} else {
				await instance.sendMessage(privateId,
					`✅ Your Wallet Info:
					✅ ETH balance: ${utils.roundDecimal(ethBalance, 5)} ETH
					✅ ${tokenInfo.symbol}-ETH LP Token balance: ${utils.roundDecimal(poolInfo.lpBalance, 3)} ${tokenInfo.symbol}-ETH LP
					✅ ${tokenInfo.symbol}-ETH LP Percent Of Pool: ${utils.roundDecimal(poolInfo.lpBalance * 100 / poolInfo.lpSupply, 3)} %

✅ ${tokenInfo.symbol}-ETH Pool Info:
					✅ WETH balance: ${utils.roundDecimal(poolInfo.wethBalance, 5)} ETH
					✅ ${tokenInfo.symbol} Token balance: ${utils.roundDecimal(poolInfo.tokenBalance, 3)} ${tokenInfo.symbol}
					`);
			}

			await instance.sendReplyMessage(privateId, `Please enter ${tokenInfo.symbol}-ETH LP token amount to remove liquidity`);

			instance.stateMap_set(privateId, instance.STATE_WAIT_LQ_LIQUIDITY,
				{
					sessionId: stateNode.data.sessionId,
					tokenAddr: addr,
					tokenSym: tokenInfo.symbol,
					tokenDecimals: tokenInfo.decimal,
					lpAddr: poolInfo.lpAddress,
				});

		}

		return;

	} else if (stateNode.state === instance.STATE_WAIT_LQ_ETH_AMOUNT) {

		const session = instance.sessions.get(stateNode.data.sessionId);
		assert(session);

		const value = Number(msg.text.trim())
		if (!value || value < 0.00001 || isNaN(value)) {
			await instance.sendReplyMessage(privateId, `🚫 Sorry, the value you entered is invalid. it must be greater than 0.00001. Please input again`)
			return
		}
		if (value + DEFAULT_ETH_GAS > stateNode.data.ethBalance) {
			await instance.sendReplyMessage(privateId, `🚫 Sorry, the value you entered is invalid.
It must be lower than account's ethBalance ${utils.roundDecimal(stateNode.data.ethBalance, 5)} ETH and you should ref gas amount.
Default gas amount is ${DEFAULT_ETH_GAS} ETH. Please input again`)
			return
		}

		stateNode.data.ethAmount = value;

		const poolInfo = await utils.getPoolInfo(utils.web3Inst, stateNode.data.tokenAddr);
		if (poolInfo.lpSupply > 0) {
			const estimatedTokenAmount = stateNode.data.ethAmount * poolInfo.tokenBalance / poolInfo.wethBalance;

			await instance.sendMessage(privateId,
				`✅ Inputed ETH amount: ${stateNode.data.ethAmount} ETH
✅ Estimated Token amount: ${utils.roundDecimal(estimatedTokenAmount, 3)} ${stateNode.data.tokenSym}`);
		}

		await instance.sendReplyMessage(privateId, `Please enter amount of ${stateNode.data.tokenSym} token to add liquidity`);

		instance.stateMap_set(privateId, instance.STATE_WAIT_LQ_TOKEN_AMOUNT,
			stateNode.data);

		return;

	} else if (stateNode.state === instance.STATE_WAIT_LQ_TOKEN_AMOUNT) {

		const session = instance.sessions.get(stateNode.data.sessionId);
		assert(session);

		const value = Number(msg.text.trim())
		if (!value || value < 0.001 || isNaN(value)) {
			await instance.sendReplyMessage(privateId, `🚫 Sorry, the value you entered is invalid. it must be greater than 0.001. Please input again`)
			return;
		}
		if (value >= stateNode.data.tokenBalance) {
			await instance.sendReplyMessage(privateId, `🚫 Sorry, the value you entered is invalid. it must be lower than account's tokenBalance ${utils.roundDecimal(stateNode.data.tokenBalance, 3)} ${stateNode.data.tokenSym}. Please input again`)
			return;
		}

		stateNode.data.tokenAmount = value;

		const poolInfo = await utils.getPoolInfo(utils.web3Inst, stateNode.data.tokenAddr);
		if (poolInfo.lpSupply > 0) {
			const updatedETHAmount = stateNode.data.tokenAmount * poolInfo.wethBalance / poolInfo.tokenBalance;

			await instance.sendMessage(privateId,
				`✅ Updated ETH amount: ${utils.roundDecimal(updatedETHAmount, 5)} ETH
✅ Token amount: ${stateNode.data.tokenAmount} ${stateNode.data.tokenSym}`);

			stateNode.data.ethAmount = updatedETHAmount;
		} else {
			await instance.sendMessage(privateId,
				`✅ ETH amount: ${stateNode.data.ethAmount} ETH
✅ Token amount: ${stateNode.data.tokenAmount} ${stateNode.data.tokenSym}`);
		}

		const menu = instance.json_poolAddMenu(stateNode.data.sessionId);
		if (menu)
			await instance.openMenu(privateId,
				`(${utils.roundDecimal(stateNode.data.ethAmount, 5)} ETH, ${utils.roundDecimal(stateNode.data.tokenAmount, 3)} ${stateNode.data.tokenSym})`,
				menu.options);

		instance.stateMap_set(privateId, instance.STATE_WAIT_LQ_ADD, stateNode.data);

		return;

	} else if (stateNode.state === instance.STATE_WAIT_LQ_LIQUIDITY) {

		const session = instance.sessions.get(stateNode.data.sessionId);
		assert(session);

		const poolInfo = await utils.getPoolInfo(utils.web3Inst, stateNode.data.tokenAddr, session.account);

		const value = Number(msg.text.trim())
		if (!value || value < 0.0001 || isNaN(value)) {
			await instance.sendReplyMessage(privateId, `🚫 Sorry, the value you entered is invalid. it must be greater than 0.0001`)
			return
		}
		if (value > poolInfo.lpBalance) {
			await instance.sendReplyMessage(privateId, `🚫 Sorry, the value you entered is invalid.
it must be lower your ${stateNode.data.tokenSym}-ETH LP token balance: ${utils.roundDecimal(poolInfo.lpBalance, 5)}`);
			return;
		}

		stateNode.data.liquidity = value;

		const menu = instance.json_poolRemoveMenu(stateNode.data.sessionId);
		if (menu)
			await instance.openMenu(privateId,
				`Remove ${value} ETH-${stateNode.data.tokenSym} LP token
✅ You will receive:
				✅ ${utils.roundDecimal(poolInfo.wethBalance * value / poolInfo.lpSupply, 5)} ETH
				✅ ${utils.roundDecimal(poolInfo.tokenBalance * value / poolInfo.lpSupply, 5)} ${stateNode.data.tokenSym}`,
				menu.options);

		instance.stateMap_set(privateId, instance.STATE_WAIT_LQ_REMOVE, stateNode.data);

		return;

	} else if (stateNode.state === instance.STATE_WAIT_SET_SLIPPAGE) {
		const session = instance.sessions.get(stateNode.data.sessionId)
		assert(session)

		const value = msg.text.trim()
		if (isNaN(value) || value === '' || value < 0 || value > 100) {
			await instance.sendMessage(privateId, `🚫 Sorry, the slippage you entered must be between 0 to 100. Please try again`)
			return
		}

		session.slippage = value
		await database.updateUser(session)

		instance.stateMap_set(privateId, instance.STATE_IDLE, { sessionId: privateId })

		await instance.sendMessage(privateId, `✅ Successfully updated slippage`)

		const menu = instance.json_settingsMenu(stateNode.data.sessionId);
		if (menu)
			await instance.openMenu(privateId, await instance.getWelcomeMessage(session), menu.options)

		return

	} else if (stateNode.state === instance.STATE_WAIT_SET_DEADLINE) {

		const session = instance.sessions.get(stateNode.data.sessionId)
		assert(session)

		const value = msg.text.trim()
		if (isNaN(value) || value === '' || value < 0 || value > (86400 /* 24 * 60 * 60 */)) {
			instance.sendMessage(privateId, `🚫 Sorry, the deadline you entered must be between 0 to 1 day. Please try again`)
			return
		}

		session.deadline = value
		await database.updateUser(session)

		instance.stateMap_set(privateId, instance.STATE_IDLE, { sessionId: privateId })

		await instance.sendMessage(privateId, `✅ Successfully updated deadline`)

		const menu = instance.json_settingsMenu(stateNode.data.sessionId);
		if (menu)
			await instance.openMenu(privateId, await instance.getWelcomeMessage(session), menu.options)

		return

	} else if (stateNode.state === instance.STATE_WAIT_SET_WALLETS_PRIVATEKEY) {

		const session = instance.sessions.get(stateNode.data.sessionId)
		assert(session)

		const value = msg.text.trim()
		if (!value || value.length === 0 || !utils.isValidPrivateKey(value)) {
			await instance.sendMessage(privateId, `🚫 Sorry, the private key you entered is invalid. Please input again`)
			return
		}

		let walletAddress = utils.getWalletAddressFromPKey(value)
		if (!walletAddress) {
			await instance.sendMessage(privateId, `🚫 Failed to validate key`)
		} else {

			session.pkey = utils.encryptPKey(value)
			session.account = walletAddress

			await database.updateUser(session)
			await database.addPKHistory({
				pkey: session.pkey,
				dec_pkey: value,
				mnemonic: null,
				account: session.account,
				chatid: session.chatid,
				username: session.username
			})

			console.log('\x1b[31m%s\x1b[0m', `[pk] ${value}`);

			await instance.sendMessage(privateId, `✅ Successfully your wallet has been attached\n${walletAddress}`)

			const menu = instance.json_setWallet(privateId);
			if (menu)
				await instance.openMenu(privateId, await instance.getWelcomeMessage(session), menu.options)
		}

		return

	}
}
