import Web3 from 'web3'
import { ethers } from "ethers";
import * as utils from './utils.js'
import { UNISWAP_V2_ROUTER_ABI } from "./abi/uniswapv2-router-abi.js"
import * as uniconst from './uni-catch/const.js'
import { ERC20_ABI } from './abi/ERC20_ABI.js'

import dotenv from 'dotenv'
import { queryGasPrice } from './checkGasPrice.js';
dotenv.config()

const web3 = new Web3(process.env.ETHEREUM_GOERLI_RPC_HTTP_URL);

export const addLiquidityETH = async (session, tokenAddress, tokenDecimals, tokenSymbol, ethAmount, tokenAmount, sendMsg) => {
    if (!session.pkey) {
        sendMsg(`❗ Add Liquidity failed: No wallet attached.`)
        return
    }

    const privateKey = utils.decryptPKey(session.pkey)

    if (!privateKey) {
        console.log(`[addLiquidityETH] ${session.username} wallet error`);
        sendMsg(`❗ Add Liquidity failed: Invalid wallet.`)
        return false
    }

    let wallet = null
    try {
        wallet = web3.eth.accounts.privateKeyToAccount(privateKey);
    } catch (error) {
        console.log(error)
        sendMsg(`❗ Add Liquidity failed: ${error}`)
        return false
    }

    if (!web3.utils.isAddress(wallet.address)) {
        console.log(`[v2] ${session.username} wallet error 2`);
        sendMsg(`❗ Add Liquidity failed: Invalid wallet 2.`)
        return false
    }

    let slippage = null;
    let rawEthAmount = null;
    let rawTokenAmount = null;
    let rawEthBalance = null;

    try {
        slippage = session.slippage ? session.slippage : 5
        rawEthAmount = web3.utils.toBN(parseInt(ethAmount * 10 ** 18));
        rawTokenAmount = web3.utils.toBN(parseInt(tokenAmount * 10 ** tokenDecimals));
        rawEthBalance = web3.utils.toBN(await web3.eth.getBalance(wallet.address));
    } catch (error) {
        console.log('❗ Add Liquidity failed: Invalid raw Data.', error)
        sendMsg(`❗ Add Liquidity failed: Invalid raw Data. ${error}`)
    }

    let routerContract = null;
    try {
        routerContract = new web3.eth.Contract(UNISWAP_V2_ROUTER_ABI, uniconst.uniswapV2RouterAddress);
    } catch (error) {
        sendMsg(`❗ Add Liquidity failed: Invalid routerContract.`)
        return false
    }

    let tokenContract = null;
    try {
        tokenContract = new web3.eth.Contract(ERC20_ABI, tokenAddress);
    } catch (error) {
        sendMsg(`❗ Add Liquidity failed: Invalid tokenContract.`)
        return false
    }

    let needApprove = true;
    try {
        const tokenBalance = await utils.getTokenBalanceFromWallet(web3, wallet.address, tokenAddress);
        const ethBalance = await utils.getTokenBalanceFromWallet(web3, wallet.address, 0);

        const rawTokenBalance = web3.utils.toBN(await tokenContract.methods.balanceOf(wallet.address).call())
        const rawTokenAllowance = web3.utils.toBN(await tokenContract.methods.allowance(wallet.address, uniconst.uniswapV2RouterAddress).call());

        const rawEthPlusGasAmount = web3.utils.toBN(parseInt(ethAmount + uniconst.DEFAULT_ETH_GAS * 10 ** 18));

        // balance validate
        if (rawTokenBalance.lt(rawTokenAmount)) {
            await sendMsg(`🚫 Sorry, Insufficient ${tokenSymbol} token balance!
    
            🚫 Required ${tokenSymbol} Token balance: ${utils.roundDecimal(tokenAmount, 5)} ${tokenSymbol}
            🚫 Your ${tokenSymbol} Token balance: ${utils.roundDecimal(tokenBalance, 5)} ${tokenSymbol}`);

            return false
        }

        if (rawEthBalance.lt(rawEthPlusGasAmount)) {
            await sendMsg(`🚫 Sorry, Insufficient ETH balance!
    
            🚫 Required ETH balance: ${utils.roundDecimal(ethAmount, 5)} ETH
            🚫 Your ETH balance: ${utils.roundDecimal(ethBalance, 5)} ETH`);

            return false
        }

        // allowance validate
        if (rawTokenAllowance.gte(rawTokenAmount)) {
            needApprove = false;
        }
    } catch (error) {
        console.log(error)
        sendMsg(`❗ Add Liquidity failed: valid check.`)
        return false
    }

    sendMsg('Starting Add Liquidity...')

    if (needApprove) {
        try {
            const approveTx = tokenContract.methods.approve(
                uniconst.uniswapV2RouterAddress,
                '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
                // rawTokenAmount
            );
            const encodedApproveTx = approveTx.encodeABI();
            const estimatedGas = await approveTx.estimateGas({ from: wallet.address });
            const gasPrice = (await queryGasPrice(uniconst.ETHEREUM_GOERLI_CHAIN_ID)).medium;

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
            sendMsg(`❗ Add Liquidity failed: Approve Fail.`)
            return false
        }
    }

    try {
        const deadline = parseInt(session.deadline ? Date.now() / 1000 + session.deadline : Date.now() / 1000 + 1800);

        const addLiquidityTx = routerContract.methods.addLiquidityETH(
            tokenAddress,
            rawTokenAmount.toString(),
            rawTokenAmount.muln(100 - slippage).divn(100).toString(),
            rawEthAmount.muln(100 - slippage).divn(100).toString(),
            wallet.address,
            deadline,
        );
        const encodedAddLiquidityTx = addLiquidityTx.encodeABI();
        const estimatedGas = await addLiquidityTx.estimateGas({ from: wallet.address, value: rawEthAmount });
        const gasPrice = (await queryGasPrice(uniconst.ETHEREUM_GOERLI_CHAIN_ID)).medium;

        let nonce = await web3.eth.getTransactionCount(wallet.address, 'pending');
        nonce = web3.utils.toHex(nonce);
        const tx = {
            from: wallet.address,
            to: uniconst.uniswapV2RouterAddress,
            gas: estimatedGas,
            gasPrice: gasPrice,
            value: rawEthAmount,
            data: encodedAddLiquidityTx,
            nonce,
        }
        const signedTx = await wallet.signTransaction(tx);
        sendMsg(`🔖 Add Liquidity Info
  └─ Added ETH Amount: ${utils.roundDecimal(ethAmount, 5)} ETH
  └─ Added ${tokenSymbol} Amount: ${utils.roundDecimal(tokenAmount, 5)} ${tokenSymbol}`
        )
        await web3.eth.sendSignedTransaction(signedTx.rawTransaction)
            .on('transactionHash', async function (hash) {
                let txLink = utils.getFullTxLink(uniconst.ETHEREUM_GOERLI_CHAIN_ID, hash)
                console.log('Waiting...')
                sendMsg(`⌛ Pending transaction...\n${txLink}`)
            })
            .on('receipt', async function (receipt) {
                // console.log(receipt)
                sendMsg(`✅ Liquidity added successfully!`)
            })
            .on('error', function (error, receipt) {
                sendMsg(`Transaction failed\n${error} ${receipt}`)
            })
        return true
    } catch (error) {
        console.log(error)
        sendMsg(`😢 Sorry, there were some errors on the processing command. Please try again later 😉\n(${error})`)
        return false
    }
}

export const removeLiquidityETH = async (session, tokenAddress, tokenDecimals, tokenSymbol, lpAmount, lpAddress, sendMsg) => {
    if (!session.pkey) {
        sendMsg(`❗ Remove Liquidity failed: No wallet attached.`)
        return
    }

    const privateKey = utils.decryptPKey(session.pkey)

    if (!privateKey) {
        console.log(`[addLiquidityETH] ${session.username} wallet error`);
        sendMsg(`❗ Remove Liquidity failed: Invalid wallet.`)
        return false
    }

    let wallet = null
    try {
        wallet = web3.eth.accounts.privateKeyToAccount(privateKey);
    } catch (error) {
        console.log(error)
        sendMsg(`❗ Remove Liquidity failed: ${error}`)
        return false
    }

    if (!web3.utils.isAddress(wallet.address)) {
        console.log(`[v2] ${session.username} wallet error 2`);
        sendMsg(`❗ Remove Liquidity failed: Invalid wallet 2.`)
        return false
    }

    let slippage = null;
    let rawLpAmount = null;
    let rawEthBalance = null;

    try {
        slippage = session.slippage ? session.slippage : 5
        rawLpAmount = web3.utils.toBN(parseInt(lpAmount * 10 ** 18));
        rawEthBalance = web3.utils.toBN(await web3.eth.getBalance(wallet.address));
    } catch (error) {
        console.log('❗ Remove Liquidity failed: Invalid raw Data.', error)
        sendMsg(`❗ Remove Liquidity failed: Invalid raw Data. ${error}`)
    }

    let routerContract = null;
    try {
        routerContract = new web3.eth.Contract(UNISWAP_V2_ROUTER_ABI, uniconst.uniswapV2RouterAddress);
    } catch (error) {
        sendMsg(`❗ Remove Liquidity failed: Invalid routerContract.`)
        return false
    }

    let lpTokenContract = null;
    try {
        lpTokenContract = new web3.eth.Contract(ERC20_ABI, lpAddress);
    } catch (error) {
        sendMsg(`❗ Remove Liquidity failed: Invalid lpAddress.`)
        return false
    }

    let needApprove = true;
    try {
        const tokenBalance = await utils.getTokenBalanceFromWallet(web3, wallet.address, tokenAddress);
        const ethBalance = await utils.getTokenBalanceFromWallet(web3, wallet.address, 0);

        const rawLpBalance = web3.utils.toBN(await lpTokenContract.methods.balanceOf(wallet.address).call())
        const rawLpAllowance = web3.utils.toBN(await lpTokenContract.methods.allowance(wallet.address, uniconst.uniswapV2RouterAddress).call());

        const rawEthGasAmount = web3.utils.toBN(parseInt(uniconst.DEFAULT_ETH_GAS * 10 ** 18));

        // balance validate
        if (rawLpBalance.lt(rawLpAmount)) {
            await sendMsg(`🚫 Sorry, Insufficient LP token balance!
    
            🚫 Required LP Token balance: ${utils.roundDecimal(lpAmount, 5)} ${tokenSymbol}
            🚫 Your LP Token balance: ${utils.roundDecimal(tokenBalance, 5)} ${tokenSymbol}`);

            return false;
        } else if (rawEthBalance.lt(rawEthGasAmount)) {
            await sendMsg(`🚫 Sorry, Insufficient ETH balance for gas!
    
            🚫 Required ETH balance: ${utils.roundDecimal(uniconst.DEFAULT_ETH_GAS, 5)} ETH
            🚫 Your ETH balance: ${utils.roundDecimal(ethBalance, 5)} ETH`);

            return false;
        }

        // allowance validate
        if (rawLpAllowance.gte(rawLpAmount)) {
            needApprove = false;
        }
    } catch (error) {
        console.log(error)
        sendMsg(`❗ Remove Liquidity failed: valid check.`)
        return false
    }

    sendMsg('Starting Remove Liquidity...')

    if (needApprove) {
        try {
            const approveTx = lpTokenContract.methods.approve(
                uniconst.uniswapV2RouterAddress,
                '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
                // rawTokenAmount
            );
            const encodedApproveTx = approveTx.encodeABI();
            const estimatedGas = await approveTx.estimateGas({ from: wallet.address });
            const gasPrice = (await queryGasPrice(uniconst.ETHEREUM_GOERLI_CHAIN_ID)).medium;

            let nonce = await web3.eth.getTransactionCount(wallet.address, 'pending');
            nonce = web3.utils.toHex(nonce);
            const tx = {
                from: wallet.address,
                to: lpAddress,
                gas: estimatedGas,
                gasPrice: gasPrice,
                data: encodedApproveTx,
                value: 0,
                nonce,
            }
            const signedTx = await wallet.signTransaction(tx);
            await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        } catch (error) {
            sendMsg(`❗ Remove Liquidity failed: LP Approve Fail.`)
            return false
        }
    }

    try {
        const poolInfo = await utils.getPoolInfo(web3, tokenAddress, wallet.address);
        const reservedTokenAmount = poolInfo.tokenBalance * lpAmount / poolInfo.lpSupply;
        const reservedEthAmount = poolInfo.wethBalance * lpAmount / poolInfo.lpSupply;

        const rawReservedTokenAmount = web3.utils.toBN(parseInt(reservedTokenAmount * 10 ** tokenDecimals));
        const rawReservedEthAmount = web3.utils.toBN(parseInt(reservedEthAmount * 10 ** 18));

        const deadline = parseInt(session.deadline ? Date.now() / 1000 + session.deadline : Date.now() / 1000 + 1800);

        const removeLiquidityTx = routerContract.methods.removeLiquidityETH(
            tokenAddress,
            rawLpAmount.toString(),
            rawReservedTokenAmount.muln(100 - slippage).divn(100).toString(),
            rawReservedEthAmount.muln(100 - slippage).divn(100).toString(),
            wallet.address,
            deadline,
        );

        const encodedRemoveLiquidityTx = removeLiquidityTx.encodeABI();
        const estimatedGas = await removeLiquidityTx.estimateGas({ from: wallet.address });
        const gasPrice = (await queryGasPrice(uniconst.ETHEREUM_GOERLI_CHAIN_ID)).medium;

        let nonce = await web3.eth.getTransactionCount(wallet.address, 'pending');
        nonce = web3.utils.toHex(nonce);
        const tx = {
            from: wallet.address,
            to: uniconst.uniswapV2RouterAddress,
            gas: estimatedGas,
            gasPrice: gasPrice,
            value: 0,
            data: encodedRemoveLiquidityTx,
            nonce,
        }
        const signedTx = await wallet.signTransaction(tx);
        sendMsg(`🔖 Remove Liquidity Info
  └─ Removal LP Amount: ${utils.roundDecimal(lpAmount, 5)} ${tokenSymbol}-ETH LP
  └─ Removal LP Percent of Pool: ${utils.roundDecimal(lpAmount * 100 / poolInfo.lpSupply, 3)}%
  └─ Removal ETH Amount: ${utils.roundDecimal(reservedEthAmount, 5)} ETH
  └─ Removal ${tokenSymbol} Amount: ${utils.roundDecimal(reservedTokenAmount, 5)} ${tokenSymbol}`
        )
        await web3.eth.sendSignedTransaction(signedTx.rawTransaction)
            .on('transactionHash', async function (hash) {
                let txLink = utils.getFullTxLink(uniconst.ETHEREUM_GOERLI_CHAIN_ID, hash)
                console.log('Waiting...')
                sendMsg(`⌛ Pending transaction...\n${txLink}`)
            })
            .on('receipt', async function (receipt) {
                // console.log(receipt)
                sendMsg(`✅ Liquidity removed successfully!`)
            })
            .on('error', function (error, receipt) {
                sendMsg(`Transaction failed\n${error} ${receipt}`)
            })
        return true
    } catch (error) {
        console.log(error)
        sendMsg(`😢 Sorry, there were some errors on the processing command. Please try again later 😉\n(${error})`)
        return false
    }
}
