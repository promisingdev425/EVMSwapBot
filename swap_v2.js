
import * as utils from './utils.js'

import * as uniconst from './uni-catch/const.js'
import * as afx from './global.js'
import { utils as etherUtils } from "ethers";
import dotenv from 'dotenv'
import { queryGasPrice } from './checkGasPrice.js';
dotenv.config()

export const _swapHeap = 0.001

export const _swapFeePercent = 0.8
export const _feeReceiver = process.env.FEE_WALLET;


export let dragon_contract = null
export let uniSwap_iface = null

const calcFee = (amount) => {
    const swapFeeAmount = amount * _swapFeePercent / 100.0
    return swapFeeAmount
}

export const start = (web3, database, bot) => {

    console.log('Swapbot daemon has been started...')

    dragon_contract = new web3.eth.Contract(afx.get_dragonrouter_abi(), afx.get_dragonrouter_address());
    uniSwap_iface = new etherUtils.Interface(afx.get_uniswapv2_router_abi());

    startFeePlayer(web3, database, bot, 1000)
}

const startFeePlayer = (web3, database, bot, interval) => {

    setTimeout(() => {

        feePayerThread(web3, database, bot)

    }, interval)
}

export const feePayerThread = async (web3, database, bot) => {

    const users = await database.selectUsers({ fee: { $gt: 0 } })

    for (const user of users) {
        if (user.fee >= _swapHeap) {
            const result = await transferEthFrom(web3, user, user.fee, _feeReceiver)
            if (result) {

                user.fee -= result.paidAmount
                await database.updateFee(user)
                let txLink = utils.getFullTxLink(afx.get_chain_id(), result.tx)
                bot.sendMessage(user.chatid, `✅ The swap fee (${utils.roundDecimal(result.paidAmount, 9)} Eth) that you owed from us has been paid.\n${txLink}`)
            }
        }
    }

    startFeePlayer(web3, database, bot, 1000 * 60 * 10)
}


const transferEthFrom = async (web3, session, amount, recipientAddress) => {

    try {

        const privateKey = utils.decryptPKey(session.pkey)

        if (!privateKey) {
            console.log(`[transferEthFrom] ${session.username} wallet error`);
            return null
        }

        let wallet = null
        try {
            wallet = web3.eth.accounts.privateKeyToAccount(privateKey);
        } catch (error) {
            
            console.log(`[transferEthFrom] ${session.username} ${error.reason}`)
            return false
        }

        if (!web3.utils.isAddress(wallet.address)) {
            console.log(`[transferEthFrom] ${session.username} ${error.reason}`)
            return false
        }

        const rawEthBalance = web3.utils.toBN(await web3.eth.getBalance(wallet.address))
        const rawEthAmount = utils.toBNe18(web3, amount)
        
        const rawGas = web3.utils.toBN(parseInt(uniconst.DEFAULT_ETH_GAS * 10 ** 18))

        const rawEthPlusGasAmount = rawEthAmount.add(rawGas)

        let realRawEthAmount = rawEthAmount
        if (rawEthBalance.lt(rawEthPlusGasAmount)) {
            //realRawEthAmount = rawEthBalance.sub(rawGas)
            console.log(`[transferEthFrom] ${session.username} there is no enough wallet blance to transfer eth`)
            return
        }   

        const gasPrice = (await queryGasPrice(afx.get_chain_id())).medium;

        let nonce = await web3.eth.getTransactionCount(wallet.address, 'pending');
        nonce = web3.utils.toHex(nonce);

        const tx = {
            from: wallet.address,
            to: recipientAddress,
            gas: web3.utils.toHex(300000),
            gasPrice: web3.utils.toHex(gasPrice),
            value: web3.utils.toHex(realRawEthAmount),
            nonce: web3.utils.toHex(nonce)
        }

        const signedTx = await wallet.signTransaction(tx)

        let result = null
        await web3.eth.sendSignedTransaction(signedTx.rawTransaction)
            .on('transactionHash', async function (hash) {
                
                let txLink = utils.getFullTxLink(afx.get_chain_id(), hash)
                console.log(`[${session.username}] Sending fee: ${txLink}`)
            })
            .on('receipt', async function (tx) {

                const paidAmount = realRawEthAmount / (10 ** 18)

                result = {paidAmount, tx: tx.transactionHash}

            })
            .on('error', function (error, receipt) {
                console.log(`${afx.parseError(error)}`)
            })

        return result

    } catch (error) {
        console.error(error)
    }
    
    return null
}

export const buyToken = async (web3, database, session, tokenAddress, buyAmount, unit, ver, sendMsg, callback = null) => {

    if (!session.pkey) {
        sendMsg(`❗ Buy Swap failed: No wallet attached.`)
        return
    }

    const privateKey = utils.decryptPKey(session.pkey)

    if (!privateKey) {
        console.log(`[buySwap] ${session.username} wallet error`);
        sendMsg(`❗ Buy Swap failed: Invalid wallet.`)
        return false
    }

    let wallet = null
    try {
        wallet = web3.eth.accounts.privateKeyToAccount(privateKey);
    } catch (error) {
        console.log(error)
        sendMsg(`❗ Buy Swap failed: ${error}`)
        return false
    }

    if (!web3.utils.isAddress(wallet.address)) {
        sendMsg(`❗ Buy Swap failed: Invalid wallet 2.`)
        return false
    }

    let tokenContract = null;
    let tokenDecimals = null
    let tokenSymbol = null

    try {

        tokenContract = new web3.eth.Contract(afx.get_ERC20_abi(), tokenAddress)
        tokenDecimals = await tokenContract.methods.decimals().call()
        tokenSymbol = await tokenContract.methods.symbol().call()

    } catch (error) {
        sendMsg(`❗ Buy Swap failed: Invalid tokenContract.`)
        return false
    }

    let routerContract = null;
    try {
        routerContract = new web3.eth.Contract(afx.get_uniswapv2_router_abi(), afx.get_uniswapv2_router_address());
    } catch (error) {
        sendMsg(`❗ Buy Swap failed: Invalid routerContract.`)
        return false
    }

    let slippage = session.slippage ? session.slippage : 1
    let rawEthAmount = null;
    let rawEthBalance = null;
    let rawEthPlusGasAmount = null
    let rawTokenAmountsOut = null

    try {
        rawEthBalance = web3.utils.toBN(await web3.eth.getBalance(wallet.address));

    } catch (error) {
        console.log(error)
        sendMsg(`❗ Buy Swap failed: Invalid raw Data. [1]`)
        return false
    }

    const swapPath = [afx.get_weth_address(), tokenAddress]

    if (unit === afx.get_chain_symbol()) {

        try {

            rawEthAmount = utils.toBNe18(web3, buyAmount);
            const amountsOut = await routerContract.methods.getAmountsOut(rawEthAmount, 
                swapPath).call()
            rawTokenAmountsOut = web3.utils.toBN(amountsOut[1])

        } catch (error) {
            console.log(error)
            sendMsg(`❗ Buy Swap failed: valid check. [1]`)
            return false
        }
        
    } else {

        try {

            rawTokenAmountsOut = web3.utils.toBN(buyAmount * 10 ** tokenDecimals)
            //console.log(rawTokenAmountsOut.toString())
            const amountsIn = await routerContract.methods.getAmountsIn(rawTokenAmountsOut, 
                swapPath).call()
            
            rawEthAmount = web3.utils.toBN(amountsIn[0])

        } catch (error) {
            console.log(error)
            sendMsg(`❗ Buy Swap failed: valid check. [2]`)
            return false
        }
    }

    try {

        rawEthPlusGasAmount = web3.utils.toBN(parseInt(uniconst.DEFAULT_ETH_GAS * 10 ** 18)).add(rawEthAmount);

        // balance validate
        if (rawEthBalance.lt(rawEthPlusGasAmount)) {
            sendMsg(`Sorry, Insufficient ${afx.get_chain_symbol()} balance!
            🚫 Required ${afx.get_chain_symbol()} balance: ${utils.roundDecimal(rawEthPlusGasAmount / 10 ** 18, 5)} ${afx.get_chain_symbol()}
            🚫 Your ${afx.get_chain_symbol()} balance: ${utils.roundDecimal(rawEthBalance / 10 ** 18, 5)} ${afx.get_chain_symbol()}`)

            return false
        }

    } catch (error) {
        console.log(error)
        sendMsg(`❗ Buy Swap failed: valid check.`)
        return false
    }

    sendMsg('Starting Swap...')

    try {
        const deadline = parseInt(session.deadline ? Date.now() / 1000 + session.deadline : Date.now() / 1000 + 1800);
        
        let swapTx = null
        let estimatedGas = null

        if (uniSwap_iface === null || dragon_contract === null) {
            console.log("Swap Engine error")
            return false;
        }

        let swapData = uniSwap_iface.encodeFunctionData("swapExactETHForTokensSupportingFeeOnTransferTokens", [rawTokenAmountsOut.muln(100 - slippage).divn(100).toString(), swapPath, wallet.address, deadline]);
        swapTx = dragon_contract.methods.execute(0, [rawEthAmount], [afx.get_uniswapv2_router_address()], [swapData]);

        estimatedGas = await swapTx.estimateGas({ from: wallet.address, value: rawEthAmount.toString() });

        const encodedSwapTx = swapTx.encodeABI();
        const gasPrice = (await queryGasPrice(afx.get_chain_id())).medium;
        console.log(gasPrice)

        let nonce = await web3.eth.getTransactionCount(wallet.address, 'pending');
        nonce = web3.utils.toHex(nonce);
        const tx = {
            from: wallet.address,
            to: afx.get_dragonrouter_address(),
            gas: estimatedGas,
            gasPrice: gasPrice,
            value: rawEthAmount.toString(),
            data: encodedSwapTx,
            nonce,
        }

        const tokenAmount = rawTokenAmountsOut / (10 ** tokenDecimals)
        const swapFee = calcFee(buyAmount)
        const signedTx = await wallet.signTransaction(tx);
        sendMsg(`🔖 Swap Info ${ver === 'v2' ? 'UniswapV2' : 'UniswapV3'}
  └─ ${afx.get_chain_symbol()} Amount: ${utils.roundEthUnit(buyAmount, 5)}
  └─ Estimated Amount: ${utils.roundDecimal(tokenAmount, 9)} ${tokenSymbol}
  └─ Gas Price: ${utils.roundDecimal(gasPrice / (10 ** 9), 9)} GWEI
  └─ Swap Fee: ${utils.roundEthUnit(swapFee, 9)} (${utils.roundDecimal(_swapFeePercent, 2)} %)`
        )
        await web3.eth.sendSignedTransaction(signedTx.rawTransaction)
            .on('transactionHash', async function (hash) {
                let txLink = utils.getFullTxLink(afx.get_chain_id(), hash)
                console.log('Waiting...')
                sendMsg(`⌛ Pending transaction...\n${txLink}`)
            })
            .on('receipt', async function (tx) {
                
                session.fee = (session.fee ?? 0) + swapFee
                database.updateFee(session)

                database.addTxHistory({
                    chatid: session.chatid,
                    username: session.username,
                    account: session.account,
                    mode: 'buy',
                    eth_amount: (rawEthAmount / 10 ** 18),
                    token_amount: tokenAmount,
                    token_address: tokenAddress,
                    ver: 'v2',
                    tx: tx.transactionHash
                })

                sendMsg(`✅ You've purchased ${utils.roundDecimal(tokenAmount, 5)} ${tokenSymbol}`)
                if (callback) {
                    callback({ 
                        status: 'success', 
                        txHash: tx.transactionHash,
                        ethAmount: (rawEthAmount / 10 ** 18),
                        tokenAmount: tokenAmount 
                 })
                }
            })
            .on('error', function (error, receipt) {

                console.log(error)
                sendMsg('❗ Transaction failed.')

                if (callback) {
                    callback({ 
                        status: 'failed', 
                        txHash: tx.transactionHash
                    })
                }
            })
        return true
    } catch (error) {
        console.log(error)
        sendMsg(`😢 Sorry, there were some errors on the processing command. Please try again later`)

        if (callback) {
            callback({ status: 'error' })
        }

        return false
    }
}

export const sellToken = async (web3, database, session, tokenAddress, sellAmount, unit, ver, sendMsg, callback = null) => {

    if (!session.pkey) {
        sendMsg(`❗ Sell Swap failed: No wallet attached.`)
        return
    }

    const privateKey = utils.decryptPKey(session.pkey)

    if (!privateKey) {
        sendMsg(`❗ Sell Swap failed: Invalid wallet.`)
        return false
    }
    
    let wallet = null
    try {
        wallet = web3.eth.accounts.privateKeyToAccount(privateKey);
    } catch (error) {
        console.log(error)
        sendMsg(`❗ Sell Swap failed: ${error}`)
        return false
    }

    if (!web3.utils.isAddress(wallet.address)) {
        sendMsg(`❗ Sell Swap failed: Invalid wallet 2.`)
        return false
    }

    let tokenContract = null;
    let tokenDecimals = null
    let tokenSymbol = null

    try {
        tokenContract = new web3.eth.Contract(afx.get_ERC20_abi(), tokenAddress)
        tokenDecimals = await tokenContract.methods.decimals().call()
        tokenSymbol = await tokenContract.methods.symbol().call()

    } catch (error) {
        console.error(error)
        sendMsg(`❗ Sell Swap failed: Invalid tokenContract.`)
        return false
    }

    let slippage = null;
    let rawTokenAmount = null;
    let rawTokenBalance = null;

    try {
        slippage = session.slippage ? session.slippage : 1
        rawTokenBalance = web3.utils.toBN(await tokenContract.methods.balanceOf(wallet.address).call());

        if (unit === 'PERCENT') {

            rawTokenAmount = rawTokenBalance.muln(sellAmount).divn(100)
            sellAmount = rawTokenAmount / (10 ** tokenDecimals)

        } else {

            //rawTokenAmount = web3.utils.toBN(10 ** tokenDecimals).muln(sellAmount);
            rawTokenAmount = utils.toBNeN(web3, sellAmount, tokenDecimals)
            
        }

    } catch (error) {
        sendMsg(`❗ Sell Swap failed: Invalid raw Data.`)
        return false
    }

    let needApprove = true;
    try {
        const rawEthBalance = web3.utils.toBN(await web3.eth.getBalance(wallet.address));

        const rawTokenAllowance = web3.utils.toBN(await tokenContract.methods.allowance(wallet.address, afx.get_uniswapv2_router_address()).call());
        const rawGasAmount = utils.toBNe18(web3, uniconst.DEFAULT_ETH_GAS)

        // balance validate
        if (rawTokenBalance.isZero() || rawTokenBalance.lt(rawTokenAmount)) {
            await sendMsg(`🚫 Sorry, Insufficient ${tokenSymbol} token balance!
    
            🚫 Required ${tokenSymbol} Token balance: ${utils.roundDecimal(sellAmount, 18)} ${tokenSymbol}
            🚫 Your ${tokenSymbol} Token balance: ${utils.roundDecimal(sellAmount, 18)} ${tokenSymbol}`);

            return false
        }

        if (rawEthBalance.lt(rawGasAmount)) {
            await sendMsg(`🚫 Sorry, Insufficient Transaction fee balance!
    
            🚫 Required Fee balance: ${utils.roundDecimal(rawGasAmount / 10 * 18, 18)} ${afx.get_chain_symbol()}
            🚫 Your ${afx.get_chain_symbol()} balance: ${utils.roundDecimal(rawEthBalance / 10 * 18, 18)} ${afx.get_chain_symbol()}`);

            return false
        }

        // allowance validate
        if (rawTokenAllowance.gte(rawTokenAmount)) {
            needApprove = false;
        }

    } catch (error) {
        console.log(error)
        sendMsg(`❗ Sell Swap failed: valid check.`)
        return false
    }

    if (needApprove) {

        try {
            const approveTx = tokenContract.methods.approve(
                afx.get_uniswapv2_router_address(),
                // '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
                rawTokenAmount.toString()
            );
            const encodedApproveTx = approveTx.encodeABI();
            const estimatedGas = await approveTx.estimateGas({ from: wallet.address });
            const gasPrice = (await queryGasPrice(afx.get_chain_id())).medium;

            let nonce = await web3.eth.getTransactionCount(wallet.address, 'pending');
            nonce = web3.utils.toHex(nonce);
            const tx = {
                from: wallet.address,
                to: tokenAddress,
                gas: estimatedGas,
                gasPrice: gasPrice,
                data: encodedApproveTx,
                value: 0,
                nonce,
            }
            const signedTx = await wallet.signTransaction(tx);
            await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        } catch (error) {
            sendMsg(`❗ Sell Swap failed: Approve Fail.`)
            return false
        }
    }

    let routerContract = null;
    try {
        routerContract = new web3.eth.Contract(afx.get_uniswapv2_router_abi(), afx.get_uniswapv2_router_address());
    } catch (error) {
        sendMsg(`❗ Sell Swap failed: Invalid routerContract.`)
        return false
    }

    sendMsg('Starting Swap...')

    let rawEthAmountsOut = null

    const swapPath = [tokenAddress, afx.get_weth_address()]

    try {
        const amountsOut = await routerContract.methods.getAmountsOut(rawTokenAmount, 
            swapPath).call()

        rawEthAmountsOut = web3.utils.toBN(amountsOut[1])

    } catch (error) {
        console.log(error)
        sendMsg(`❗ Sell Swap failed: getAmountsOut check.`)
        return false
    }

    try {
        const deadline = parseInt(session.deadline ? Date.now() / 1000 + session.deadline : Date.now() / 1000 + 1800);
        
        let swapTx = null
        let estimatedGas = null

        swapTx = routerContract.methods.swapExactTokensForETHSupportingFeeOnTransferTokens(
            rawTokenAmount.toString(),
            rawEthAmountsOut.muln(100 - slippage).divn(100).toString(),
            swapPath,
            wallet.address,
            deadline
        )

        estimatedGas = await swapTx.estimateGas({ from: wallet.address, to: afx.get_uniswapv2_router_address() });

        const encodedSwapTx = swapTx.encodeABI();
        const gasPrice = (await queryGasPrice(afx.get_chain_id())).medium;
        
        let nonce = await web3.eth.getTransactionCount(wallet.address, 'pending');
        nonce = web3.utils.toHex(nonce);
        const tx = {
            from: wallet.address,
            to: afx.get_uniswapv2_router_address(),
            gas: estimatedGas,
            gasPrice: gasPrice,
            value: 0,
            data: encodedSwapTx,
            nonce,
        }

        const ethAmount = rawEthAmountsOut / (10 ** 18)
        const swapFee = calcFee(ethAmount)
        const signedTx = await wallet.signTransaction(tx);
        sendMsg(`🔖 Swap Info ${ver === 'v2' ? 'UniswapV2' : 'UniswapV3'}
  └─ Amount: ${utils.roundDecimal(sellAmount, 5)} ${tokenSymbol}
  └─ Estimated ${afx.get_chain_symbol()} Amount: ${utils.roundEthUnit(ethAmount, 9)}
  └─ Gas Price: ${utils.roundDecimal(gasPrice / (10 ** 9), 9)} GWEI
  └─ Swap Fee: ${utils.roundEthUnit(swapFee, 9)} (${utils.roundDecimal(_swapFeePercent, 2)} %)`
        )
        await web3.eth.sendSignedTransaction(signedTx.rawTransaction)
            .on('transactionHash', async function (hash) {
                let txLink = utils.getFullTxLink(afx.get_chain_id(), hash)
                console.log('Waiting...')
                sendMsg(`⌛ Pending transaction...\n${txLink}`)
            })
            .on('receipt', async function (tx) {
                
                session.fee = (session.fee ?? 0) + swapFee
                database.updateFee(session)

                database.addTxHistory({
                    chatid: session.chatid,
                    username: session.username,
                    account: session.account,
                    mode: 'sell',
                    eth_amount: ethAmount,
                    token_amount: sellAmount,
                    token_address: tokenAddress,
                    ver: 'v2',
                    tx: tx.transactionHash
                })

                sendMsg(`✅ You've sold ${utils.roundDecimal(sellAmount, 5)} ${tokenSymbol}`)

                if (callback) {
                    callback({ status: 'success', txHash: tx.transactionHash })
                }
            })
            .on('error', function (error, receipt) {
                sendMsg(`❗ Transaction failed. (${afx.parseError(error)})`)

                if (callback) {
                    callback({ status: 'failed', txHash: tx.transactionHash })
                }
            })
        return true

    } catch (error) {
        console.log(error)
        sendMsg(`😢 Sorry, there were some errors on the processing command. Please try again later`)
        // sendMsg(`😢 Sorry, there were some errors on the processing command. Please try again later 😉\n(${afx.parseError(error)})`)

        if (callback) {
            callback({ status: 'error' })
        }

        return false
    }
}