import axios from 'axios';
import Web3 from 'web3'
import { Utils } from './model.js';
import * as uniconst from './uni-catch/const.js'
import * as afx from './global.js'
import * as ethscan_api from './etherscan-api.js'
import dotenv from 'dotenv'
dotenv.config()

const web3 = new Web3(afx.get_ethereum_rpc_http_url());
const GAS_STATION = {
    [uniconst.ETHEREUM_MAINNET_CHAIN_ID]:
        "https://api.etherscan.io/api?module=proxy&action=eth_gasPrice",
    [uniconst.ETHEREUM_GOERLI_CHAIN_ID]:
        "https://api-goerli.etherscan.io/api?module=proxy&action=eth_gasPrice",
};

export async function getCurrentGasPrices(chainID = uniconst.ETHEREUM_GOERLI_CHAIN_ID) {
    try {
        const apiKey = await ethscan_api.getApiKey()
        const response = await ethscan_api.executeEthscanAPI(GAS_STATION[chainID], apiKey)
        //const response = await axios.get(GAS_STATION[chainID]);
        //console.log(response)
        const gasPrices = {
            low: web3.utils.hexToNumberString(response.result),
            medium: web3.utils
                .toBN(web3.utils.hexToNumber(response.result))
                .muln(1.2)
                .toString(),
            high: web3.utils
                .toBN(web3.utils.hexToNumber(response.result))
                .muln(1.5)
                .toString(),
        };
        // console.log("chainID", chainID, gasPrices)
        return gasPrices;
    } catch (error) {
        console.log("error:", error);
        throw error;
    }
};

let counter = 0
let isRunning = false;

const fetchGasPrice = async () => {
    try {
        if (isRunning) {
            return;
        }

        isRunning = true;
        counter++;
        // console.log(`===========fetchGasPrice counter===========${counter}`);
        await updateCurrentGasPrices(uniconst.ETHEREUM_MAINNET_CHAIN_ID);
        //await updateCurrentGasPrices(uniconst.BSC_MAINNET_CHAIN_ID);
        await updateCurrentGasPrices(uniconst.ETHEREUM_GOERLI_CHAIN_ID);
        isRunning = false;
    } catch (error) {
        console.log('fetchGasPrice catch error: ', error)
    }
}

const updateCurrentGasPrices = async (chainID = uniconst.ETHEREUM_MAINNET_CHAIN_ID) => {
    try {
        const gasPrices = await getCurrentGasPrices(chainID)
        const fetchItem = await Utils.findOne({ 'gas.chainID': chainID })
        if (fetchItem) {
            const _updateResult = await Utils.updateOne({ 'gas.chainID': chainID }, { 'gas.gasPrices': gasPrices });

            if (!_updateResult) {
                // console.log("updateOne fail!", _updateResult);
                console.log("updateOne fail!");
            }
        } else {
            const utilsItem = new Utils({
                gas: {
                    chainID: chainID,
                    gasPrices: gasPrices
                }
            })

            try {
                const savedItem = await utilsItem.save();
                //console.log("new utils object saved: ", savedItem);
                //console.log("new utils object saved: ");
            } catch (error) {
                // console.log('Error saving item:', error);
                console.log('Error saving item:');
            }
        }
    } catch (error) {
        console.log("error:");
    }
}

export async function checkGasPrice() {
    try {
        console.log("GasChecker daemon has been started");
        setInterval(async () => { await fetchGasPrice() }, 30000);
    } catch (error) {
        console.log('checkOffer catch error: ', error);
    }
}

export async function queryGasPrice(chainID = uniconst.ETHEREUM_MAINNET_CHAIN_ID) {
    try {
        const fetchItem = await Utils.findOne({ 'gas.chainID': chainID })
        if (fetchItem) {
            return fetchItem.gas.gasPrices;
        } else {
            const gasPrices = await getCurrentGasPrices(chainID)
            return gasPrices;
        }
    } catch (error) {
        console.log("error:");
    }
}
