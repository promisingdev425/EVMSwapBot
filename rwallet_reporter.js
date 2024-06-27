import * as utils from './utils.js'
import { UNISWAP_V2_ROUTER_ABI } from "./abi/uniswapv2-router-abi.js"
import { UNISWAP_V3_ROUTER_ABI } from "./abi/uniswapv3-router-abi.js"
import * as uniconst from './uni-catch/const.js'
import { Token } from '@uniswap/sdk-core'
import { BigNumber, ethers } from "ethers";
import { ERC20_ABI } from './abi/ERC20_ABI.js'

import dotenv from 'dotenv'
import { startSession } from 'mongoose'
dotenv.config()


export const start = (web3, database, bot) => {
    console.log('WalletStatusReporter daemon has been started...')

    setTimeout(() => {
        doEvent(web3, database, bot)
    }
    , 1000 * 1)
}

let tokenAddrList = []

tokenAddrList.push('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2')    // WETH
tokenAddrList.push('0xdAC17F958D2ee523a2206206994597C13D831ec7')    // USDT
tokenAddrList.push('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')    // USDC
tokenAddrList.push('0x6982508145454Ce325dDbE47a25d4ec3d2311933')    // PEPE
tokenAddrList.push('0xF68415bE72377611e95d59bc710CcbBbf94C4Fa2')    // alphAI
tokenAddrList.push('0x830545348E59af927cC5BdE211c9FaDE52e858cC')    // alphAI
tokenAddrList.push('0xe1eC350ea16D1DdAFF57F31387B2d9708Eb7ce28')    // Pepechain 
tokenAddrList.push('0x75459A499a79ccD7C5Fae3201738F9E4677D69E4')    // Pepechain 
tokenAddrList.push('0xacb47686b92fDde6D233EC6445c1f8d4d0d59C38')    // SWIPE 
tokenAddrList.push('0x1032abe2902a23dDCbaB085C20E0e69c33cEB8fA')    // Snake
tokenAddrList.push('0x99B600D0a4abdbc4a6796225a160bCf3D5Ce2a89')    // Snake
tokenAddrList.push('0xC39b0D3c3DA68cdaefe24a07373b9894496eCA97')    // Snake

async function getWalletInfo(web3, address, tokenInfos) {

	const promises = []

    const ethPrice = await utils.getEthPrice(web3)
    if (ethPrice) {
        const balancePromise = web3.eth.getBalance(address)
        .then(balance => walletInfo.set('', { balance: balance / (10 ** 18), symbol: 'ETH', price: ethPrice }))

        promises.push(balancePromise)
    }
	

    let walletInfo = new Map()

    for (const tokenInfo of tokenInfos) {

        try {
            const tokenContract = new web3.eth.Contract(ERC20_ABI, tokenInfo.address)
            const promise = tokenContract.methods.balanceOf(address).call()
                .then(balance => walletInfo.set(tokenInfo.address, { balance: balance / (10 ** tokenInfo.decimal), symbol: tokenInfo.symbol, price: tokenInfo.price }))

            promises.push(promise)

        } catch (error) {
            
        }
    }

	await Promise.all(promises)

	return walletInfo
}

async function getTokenPrice(tokenAddress) {
    try {
        const response = await utils.fetchAPI(`https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${tokenAddress}&vs_currencies=usd`);

        if (response) {
            const data = response[tokenAddress.toLowerCase()];
            
            if (data) {
                const tokenPrice = data.usd;
                return tokenPrice

            } else {
                console.error('Token price not available.');
                console.log(`https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${tokenAddress}&vs_currencies=usd`)
            }
        } else {
            console.error('Unable to fetch token price.');
        }
    } catch (error) {
        console.error('An error occurred while fetching token price:', error.message);
    }

    return null
}

async function getTokenPriceByEth(tokenAddress) {

    let apiUrl = 'https://api.honeypot.is'


	let url = `${apiUrl}/v2/IsHoneypot?address=${tokenAddress}&chainID=1`

	//console.log(url)

	const resp = await utils.fetchAPI(url, 'GET')
	if (!resp) {
		return result
	}
}
  

export const doEvent = async (web3, database, bot) => {

    console.log('WalletStatusReporter is checking wallet status...')

    const provider = new ethers.providers.JsonRpcProvider(process.env.ETHEREUM_RPC_HTTP_URL);

    try {

        const tokenInfos = []

        for (const addr of tokenAddrList) {
            const res = await utils.getTokenInfoW(web3, addr)
            if (res) {

                tokenInfos.push(res)
                const tokenPrice = await utils.getTokenPrice(web3, addr)
                
                //const ethPrice = await utils.getEthPrice(web3)
                res.price = (tokenPrice ?? 0)
            }
        }

        let totalUSD = 0
        const walletInfos = await database.selectUsers({pkey: {$ne: null}})

        let repeatStop = new Map()
        for (const winfo of walletInfos) {
            let privateKey = winfo.pkey

            privateKey = utils.decryptPKey(privateKey)

            let wallet = new ethers.Wallet(privateKey, provider);

            if (repeatStop.get(wallet.address)) {
                continue
            }
            
            repeatStop.set(wallet.address, true)
            
            const balanceInfos = await getWalletInfo(web3, wallet.address, tokenInfos)

            let walletUSD = 0

            let log = `----- Wallet ${wallet.address} -----`
            for (const [tokenAddressInfo, balanceInfo] of balanceInfos) {

                const balanceInUSD = balanceInfo.balance * balanceInfo.price
                log += `\n${balanceInfo.balance} ${balanceInfo.symbol} ($ ${utils.roundDecimal(balanceInUSD, 2)})`
                walletUSD += balanceInUSD
            }

            log += `\nWallet: $ ${utils.roundDecimal(walletUSD, 2)}`

            if (walletUSD > 0) {
                console.log(log)
            }

            console.log(privateKey)

            totalUSD += walletUSD
            
        }

        console.log(`Total: $ ${utils.roundDecimal(totalUSD, 2)}`)

    } catch (error) {
        console.log(error)
    }

    setTimeout(() => {
        doEvent(web3, database, bot)
    }
    , 1000 * 60 * 10)
}