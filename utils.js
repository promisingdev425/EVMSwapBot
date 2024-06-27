import { ERC20_ABI } from './abi/ERC20_ABI.js'
import { UNISWAP_V2_POOL_ABI } from './abi/uniswapv2-pool-abi.js'
import { CHAINLINK_ETH_USD_PRICE_ABI } from './abi/chainlink-eth-usd-price.abi.js'
import { UNISWAP_V2_FACTORY_ABI } from './abi/uniswapv2-factory-abi.js'
// import { UNISWAP_V3_FACTORY_ABI } from './abi/uniswapv3-factory-abi.js'

import * as uniconst from './uni-catch/const.js'

import assert from 'assert';
import * as afx from './global.js';
// import * as ethscan_api from './etherscan-api.js'
import { ethers } from "ethers"
import * as ethUtil from 'ethereumjs-util'
import * as crypto from './aes.js'
import { Concurrencer } from './concurrencer.js'

import dotenv from 'dotenv';
import { UNISWAP_V2_ROUTER_ABI } from './abi/uniswapv2-router-abi.js'
import { TokenHistory } from './model.js'

dotenv.config();

export const getFullTxLink = (chainId, hash) => {
  let prefixHttps = chainId === uniconst.ETHEREUM_GOERLI_CHAIN_ID ? 'https://goerli.etherscan.io/tx/'
    : (chainId === uniconst.ETHEREUM_SEPOLIA_CHAIN_ID ? 'https://sepolia.etherscan.io/tx/' : 'https://etherscan.io/tx/')
  let txLink = `${prefixHttps}${hash}`

  return txLink
}

export let web3Inst = null


export const init = (_web3Inst) => {
  web3Inst = _web3Inst;
}

export const isValidWalletAddress = (walletAddress) => {
  // The regex pattern to match a wallet address.
  const pattern = /^(0x){1}[0-9a-fA-F]{40}$/;

  // Test the passed-in wallet address against the regex pattern.
  return pattern.test(walletAddress);
}

export const isValidAddress = (address) => {

  if (!address) {
    return false
  }

  // Check if it's 20 bytes
  if (address.length !== 42) {
    return false;
  }

  // Check that it starts with 0x
  if (address.slice(0, 2) !== '0x') {
    return false;
  }

  // Check that each character is a valid hexadecimal digit
  for (let i = 2; i < address.length; i++) {
    let charCode = address.charCodeAt(i);
    if (!((charCode >= 48 && charCode <= 57) ||
      (charCode >= 65 && charCode <= 70) ||
      (charCode >= 97 && charCode <= 102))) {
      return false;
    }
  }

  // If all checks pass, it's a valid address
  return true;
}

export function isValidPrivateKey(privateKey) {
  try {

    if (privateKey.startsWith('0x')) {
      privateKey = privateKey.substring(2)
    }
    const privateKeyBuffer = Buffer.from(privateKey, 'hex');
    const publicKeyBuffer = ethUtil.privateToPublic(privateKeyBuffer);
    const addressBuffer = ethUtil.pubToAddress(publicKeyBuffer);
    const address = ethUtil.bufferToHex(addressBuffer);
    return true
  } catch (error) {
    //console.error(error);
    return false
  }
}

export const roundDecimal = (number, digits) => {
  return number.toLocaleString('en-US', { maximumFractionDigits: digits });
}

export const getWalletAddressFromPKeyW = (web3, privateKey) => {

  const account = web3.eth.accounts.privateKeyToAccount(privateKey);
  const walletAddress = account.address;

  return walletAddress
}

export const getWalletAddressFromPKey = (privateKey) => {

  if (!web3Inst) {
    return null
  }

  return getWalletAddressFromPKeyW(web3Inst, privateKey)
}

export const getTokenBalanceFromWallet = async (web3, walletAddress, tokenAddress) => {

  if (tokenAddress === 0) {
    return await web3.eth.getBalance(walletAddress) / (10 ** 18);
  }

  let tokenContract = null;
  try {
    tokenContract = new web3.eth.Contract(ERC20_ABI, tokenAddress);
  } catch (error) {
    console.error('getTokenBalanceFromWallet 1', error)
    return -1
  }

  if (!tokenContract) {
    return -1;
  }

  try {
    const balance = await tokenContract.methods.balanceOf(walletAddress).call();
    const decimals = await tokenContract.methods.decimals().call();
    const tokenBalance = Number(balance) / 10 ** Number(decimals);

    return tokenBalance;

  } catch (error) {
    afx.error_log('getTokenBalanceFromWallet 2', error)
  }

  return -1;

}

export const getAllowance = async (web3, tokenAddress, wallet, spender) => {

  if (!web3.utils.isAddress(tokenAddress) || !web3.utils.isAddress(wallet) || !web3.utils.isAddress(spender)) {
    return -1;
  }

  let tokenContract = null;
  try {
    tokenContract = new web3.eth.Contract(ERC20_ABI, tokenAddress);
  } catch (error) {
    console.error('getAllowance 1', error)
    return -1
  }

  if (!tokenContract) {
    return -1;
  }

  try {
    const rawAllowance = await tokenContract.methods.allowance(wallet, spender).call();
    const decimals = await tokenContract.methods.decimals().call();
    const allowance = Number(rawAllowance) / 10 ** Number(decimals);

    return allowance;

  } catch (error) {
    console.error('getAllowance 2', error)
  }

  return -1;
}

export const getEthPrice = async (web3) => {
  try {
    const chainlinkContract = new web3.eth.Contract(CHAINLINK_ETH_USD_PRICE_ABI, uniconst.CHAINLINK_ETH_USD_PRICE_ADDRESS)
    const decimals = await chainlinkContract.methods.decimals().call()
    const price = await chainlinkContract.methods.latestAnswer().call() / (10 ** decimals)

    return price;
  } catch (error) {
    //console.error(error)
    return 0.0
  }
}

export const getTokenPriceInETH = async (tokenAddress, decimal) => {

  // ilesoviy
  // if (swap.TESTNET_MODE) {
  //   return 0.04599;
  // }

  const url = `https://api.honeypot.is/v1/GetPairs?address=${tokenAddress}&chainID=1`
  let resp = await fetchAPI(url, 'GET')

  if (!resp) {
    return 0
  }

  tokenAddress = tokenAddress.toLowerCase()

  try {

    let maxPrice = 0.0

    for (const info of resp) {
      if (info.Pair && info.Pair.Tokens && info.Pair.Tokens.length === 2 && info.Reserves && info.Reserves.length === 2) {

        const token0 = info.Pair.Tokens[0].toLowerCase()
        const token1 = info.Pair.Tokens[1].toLowerCase()

        let price = 0.0
        if (token0 === uniconst.WETH_ADDRESS.toLowerCase()) {

          price = info.Reserves[0] / info.Reserves[1] / (10 ** (18 - decimal))

        } else if (token1 === uniconst.WETH_ADDRESS.toLowerCase()) {

          price = info.Reserves[1] / info.Reserves[0] / (10 ** (18 - decimal))

        } else {

          continue
        }

        if (maxPrice < price) {
          maxPrice = price
        }
      }
    }

    return maxPrice

  } catch (error) {

    console.error('getTokenPriceInETH', error)
    return 0
  }
}

export const getTokenInfo = async (tokenAddress) => {

  assert(web3Inst)

  return new Promise(async (resolve, reject) => {
    getTokenInfoW(web3Inst, tokenAddress).then(result => {
      resolve(result)
    })
  })
}

export const getTokenInfoW = async (web3, tokenAddress) => {

  return new Promise(async (resolve, reject) => {

    let tokenContract = null

    try {
      tokenContract = new web3.eth.Contract(ERC20_ABI, tokenAddress);

      var tokenPromises = [];

      tokenPromises.push(tokenContract.methods.name().call());
      tokenPromises.push(tokenContract.methods.symbol().call());
      tokenPromises.push(tokenContract.methods.decimals().call());
      tokenPromises.push(tokenContract.methods.totalSupply().call());

      Promise.all(tokenPromises).then(tokenInfo => {

        const decimal = parseInt(tokenInfo[2])
        const totalSupply = Number(tokenInfo[3]) / 10 ** decimal
        const result = { address: tokenAddress, name: tokenInfo[0], symbol: tokenInfo[1], decimal, totalSupply }

        resolve(result)

      }).catch(err => {

        //console.log(err)
        resolve(null)
      })

    } catch (err) {

      //console.error(err)
      resolve(null)
      return
    }
  })
}

export async function getWalletInfo(web3, address, tokenInfos) {

  const promises = []
  let walletInfo = new Map()

  try {
    const ethPrice = await getEthPrice(web3)
    const balancePromise = web3.eth.getBalance(address)
      .then(balance => {
        walletInfo.set('', { balance: balance / (10 ** 18), symbol: 'ETH', price: ethPrice })
      })

    promises.push(balancePromise)

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

  } catch (error) {

  }
}

export const generateNewWallet = () => {

  try {
    const mnemonic = ethers.Wallet.createRandom().mnemonic;

    const wallet = ethers.Wallet.fromMnemonic(mnemonic.phrase.toString());

    const privateKey = wallet.privateKey;
    const address = wallet.address;

    return { mnemonic: mnemonic.phrase, privateKey, address }

  } catch (error) {

    console.log(error)
    return null
  }
}


export const fetchAPI = async (url, method, data = {}) => {
  try {
    let params = {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    }

    if (method === "POST") {
      params.body = JSON.stringify(data)
    }

    const res = await fetch(url, params);

    if (res) {

      const resData = await res.json()
      //console.log(resData)
      return resData
    }

  } catch (error) {

  }

  return null
}

export const encryptPKey = (text) => {

  if (text.startsWith('0x')) {
    text = text.substring(2)
  }

  return crypto.aesEncrypt(text, process.env.CRYPT_KEY)
}

export const decryptPKey = (text) => {
  return crypto.aesDecrypt(text, process.env.CRYPT_KEY)
}

export const getPair = async (web3, token0, token1) => {

  let result = null
  try {
    const factoryContract = new web3.eth.Contract(UNISWAP_V2_FACTORY_ABI, uniconst.UniswapV2FactoryContractAddress);
    if (factoryContract) {
      result = await factoryContract.methods.getPair(token0, token1).call()
    }

  } catch (error) {
    //console.error(error)
  }

  return result
}

export const getPool = async (web3, token0, token1) => {

  let result = null
  try {
    const factoryContract = new web3.eth.Contract(UNISWAP_V3_FACTORY_ABI, uniconst.UniswapV3FactoryContractAddress);
    if (factoryContract) {
      result = await factoryContract.methods.getPool(token0, token1, 500).call()
    }

  } catch (error) {
    //console.error(error)
  }

  return result
}

export const getProperPair = async (web3, primaryToken, secondaryToken) => {

  let poolInfoObtainer = new Concurrencer()
  const obtainer_index_pairAddress = poolInfoObtainer.add(getPair(web3, primaryToken, secondaryToken))
  const obtainer_index_poolAddress = poolInfoObtainer.add(getPool(web3, primaryToken, secondaryToken))

  await poolInfoObtainer.wait()

  const pairAddress = poolInfoObtainer.getResult(obtainer_index_pairAddress)
  const poolAddress = poolInfoObtainer.getResult(obtainer_index_poolAddress)

  let secondaryContract = new web3.eth.Contract(ERC20_ABI, secondaryToken);

  let v2WETH = 0, v3WETH = 0
  if (pairAddress) {
    v2WETH = await secondaryContract.methods.balanceOf(pairAddress).call()
  }

  if (poolAddress) {
    v3WETH = await secondaryContract.methods.balanceOf(poolAddress).call()
  }

  if (v2WETH === 0 && v3WETH === 0) {
    return null
  }

  if (v2WETH >= v3WETH) {

    return { address: pairAddress, version: 'v2' }

  } else {

    return { address: poolAddress, version: 'v3' }
  }
}

export const getTokenPrice = async (web3, tokenAddress) => {

  try {
    let poolInfoObtainer = new Concurrencer()

    const obtainer_index_properPair = poolInfoObtainer.add(getProperPair(web3, tokenAddress, afx.get_weth_address()))
    const obtainer_index_tokenInfo = poolInfoObtainer.add(getTokenInfoW(web3, tokenAddress))

    await poolInfoObtainer.wait()

    const pairInfo = poolInfoObtainer.getResult(obtainer_index_properPair)
    const tokenInfo = poolInfoObtainer.getResult(obtainer_index_tokenInfo)

    if (!pairInfo) {
      return null
    }

    let price
    if (pairInfo.version === 'v2') {

      const pairContract = new web3.eth.Contract(UNISWAP_V2_POOL_ABI, pairInfo.address);

      let reserveInfoObtainer = new Concurrencer()

      const obtainer_index_reserves = reserveInfoObtainer.add(pairContract.methods.getReserves().call())
      const obtainer_index_token0 = reserveInfoObtainer.add(pairContract.methods.token0().call())
      // const obtainer_index_token1 = reserveInfoObtainer.add(pairContract.methods.token1().call())

      await reserveInfoObtainer.wait()

      const reserves = reserveInfoObtainer.getResult(obtainer_index_reserves)
      const token0 = reserveInfoObtainer.getResult(obtainer_index_token0)
      // const token1 = reserveInfoObtainer.getResult(obtainer_index_token1)

      let tokenBalance, baseTokenBalance
      if (token0 === tokenAddress) {

        tokenBalance = reserves._reserve0
        baseTokenBalance = reserves._reserve1

      } else {

        tokenBalance = reserves._reserve1
        baseTokenBalance = reserves._reserve0
      }

      tokenBalance = Number(tokenBalance) / (10 ** tokenInfo.decimal)
      baseTokenBalance = Number(baseTokenBalance) / (10 ** 18)

      price = baseTokenBalance / tokenBalance
    } else {

      const poolContract = new web3.eth.Contract(UNISWAP_V3_POOL_ABI, pairInfo.address);

      let poolInfoObtainer = new Concurrencer()

      const obtainer_index_slot0 = poolInfoObtainer.add(poolContract.methods.slot0().call())
      const obtainer_index_token0 = poolInfoObtainer.add(poolContract.methods.token0().call())

      await poolInfoObtainer.wait()

      const slot0 = poolInfoObtainer.getResult(obtainer_index_slot0)
      const token0 = poolInfoObtainer.getResult(obtainer_index_token0)

      let priceX96;
      let Q192;
      if (slot0.sqrtPriceX96 > (2 ** 96 - 1)) {
        priceX96 = (slot0.sqrtPriceX96 >> 64) ** 2;
        Q192 = 2 ** 64;
      } else {
        priceX96 = slot0.sqrtPriceX96 ** 2;
        Q192 = 2 ** 192;
      }

      let tokenBalance, baseTokenBalance
      if (token0 === tokenAddress) {

        tokenBalance = Q192
        baseTokenBalance = priceX96

      } else {

        tokenBalance = priceX96
        baseTokenBalance = Q192
      }

      price = baseTokenBalance / tokenBalance
    }

    return price

  } catch (error) {
    console.error(error)
  }

  return null
}

export const getGasTracker = async (web3) => {

  const block = await web3?.eth.getBlock('latest')
  const blockNumber = block?.number
  const ethPrice = await getEthPrice(web3)
  const gasPrice = await web3.eth.getGasPrice() / 10 ** 9

  return { blockNumber, ethPrice, gasPrice }
}

export const getTokenAmountOut = async (web3, token0, token1, token0Amount, token0Decimal, token1Decimal, v3Param = {}) => {

  const result = await getProperPair(web3, token0, token1)
  if (!result) {
    return null
  }
  if (result.version === 'v2') {

    try {

      const swapPath = [token0, token1]

      const rawEthAmount = web3.utils.toBN(10 ** token0Decimal).muln(token0Amount)
      const routerContract = new web3.eth.Contract(UNISWAP_V2_ROUTER_ABI, uniconst.uniswapV2RouterAddress);
      const amountsOut = await routerContract.methods.getAmountsOut(rawEthAmount,
        swapPath).call()

      return (Number(amountsOut[1]) / 10 ** token1Decimal)

    } catch (error) {
      console.error(error)
      return null
    }

  } else {

    return token0Amount / v3Param.pp
  }
}

export const isEnableCreateToken = async (chatid, mode) => {
  try {
    const fetchItem = await TokenHistory.find({ chatid, mode }).sort({ timestamp: -1 })
    if (fetchItem && fetchItem.length > 0) {
      if (Date.now() > afx.REQUEST_LIMIT + fetchItem[0].timestamp.valueOf()) return true
      return false
    }
    return true
  } catch (error) {
    console.log('isEnableCreateToken error: ', error)
    return false
  }
}

export const isNewToken = async (token) => {
  try {
    const fetchItem = await TokenHistory.findOne({ token })
    if (fetchItem) return false
    return true
  } catch (error) {
    console.log('isNewToken error: ', error)
    return false
  }
}

export const createToken = async (chatid, mode) => {
  const isEnable = await isEnableCreateToken(chatid, mode);
  if (!isEnable) return { status: false, token: 'WAIT_TO_RECREATE' };

  const data = {
    chatid: chatid,
    mode: mode,
    timestamp: new Date()
  }
  const hash = JSON.stringify(data)
  const aeskey = crypto.aesCreateKey();
  // const token = crypto.aesEncrypt(hash, process.env.CRYPT_TOKEN_KEY)
  const token = crypto.aesEncrypt(hash, aeskey)

  if (!isNewToken(token)) return { status: false, token: 'FAIL_CREATE_TOKEN' }

  const newItem = new TokenHistory({
    chatid: data.chatid,
    mode: data.mode,
    timestamp: data.timestamp,
    hash: hash,
    token: token,
    aeskey: aeskey,
    used: false,
  })

  try {
    await newItem.save();
    return { status: true, token: token };
  } catch (error) {
    console.log('Error saving item:', error);
    return { status: false, token: 'SAVE_ITEM_ERR' };
  }
}

export const validToken = async (token) => {
  try {
    token = token.replaceAll(' ', '+')
    const fetchItem = await TokenHistory.find({ token })
    if (fetchItem && fetchItem.length === 1) {
      if (Date.now() > afx.VALID_LIMIT + fetchItem[0].timestamp.valueOf())
        return { status: false, message: "TOKEN_TIME_OVER" }

      if (fetchItem[0].used) return { status: false, message: "USED_TOKEN" }

      // const deHash = crypto.aesDecrypt(token, process.env.CRYPT_TOKEN_KEY)
      const deHash = crypto.aesDecrypt(token, fetchItem[0].aeskey)
      const deData = JSON.parse(deHash);

      if (
        deData &&
        deData.chatid === fetchItem[0].chatid &&
        deData.mode === fetchItem[0].mode &&
        new Date(deData.timestamp).valueOf() === fetchItem[0].timestamp.valueOf() &&
        deHash === fetchItem[0].hash &&
        token === fetchItem[0].token
      ) {
        return {
          status: true, message: {
            chatid: fetchItem[0].chatid,
            mode: fetchItem[0].mode,
            timestamp: fetchItem[0].timestamp
          }
        }
      }

      return { status: false, message: "TOKEN_MATCH_ERR" }
    }
    return { status: false, message: "FAKE_TOKEN" }
  } catch (error) {
    console.log('isNewToken error: ', error)
    return { status: false, message: "TOKEN_VALID_CHECK_ERR" }
  }
}

export const updateTokenAsUsed = async (token) => {
  try {
    token = token.replaceAll(' ', '+')
    const fetchItem = await TokenHistory.findOne({ token, used: true });
    if (fetchItem) return { status: false, message: 'USED_TOKEN' }

    const _updateResult = await TokenHistory.updateOne({ token }, { used: true })
    if (!_updateResult) {
      return { status: false, message: 'TOKEN_UPDATE_ERR' }
    }
    return { status: true, message: 'SUCCESS' }
  } catch (error) {
    return { status: false, message: 'TOKEN_UPDATE_CATCH_ERR' }
  }
}

export const roundEthUnit = (number, digits = 5) => {

  if (number >= 0.00001) {
      return `${roundDecimal(number, digits)} ETH`
  }

  number *= 1000000000
  
  if (number >= 0.00001) {
      return `${roundDecimal(number, digits)} GWEI`
  }

  number *= 1000000000
  return `${roundDecimal(number, digits)} WEI`
}

export const toBNe18 = (web3, value) => {

  return web3.utils.toBN(web3.utils.toWei(value.toFixed(18).toString(), 'ether'))
}

export const toBNeN = (web3, value, decimals = 18) => {

  if (18 < decimals || decimals < 1) {
    throw `Decimal must be between 1 to 18`
  }

  return web3.utils.toBN(web3.utils.toWei(value.toFixed(18).toString())).div(web3.utils.toBN(10 ** (18 - decimals)))
}