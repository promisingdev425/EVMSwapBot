import EventEmitter from 'events'
import dotenv from 'dotenv'
dotenv.config()
import * as afx from './global.js'

export let apiKeyIndex = 0
export let apiKeySleepIndex = 0

export let apiKeyList = [
    process.env.API_KEY_1,
    process.env.API_KEY_2,
    process.env.API_KEY_3,
    process.env.API_KEY_4,
    process.env.API_KEY_5,
    process.env.API_KEY_6,
    process.env.API_KEY_7,
    process.env.API_KEY_8,
    process.env.API_KEY_9,
    process.env.API_KEY_10,
    process.env.API_KEY_11,
    process.env.API_KEY_12,
    process.env.API_KEY_13,
    process.env.API_KEY_14,
    process.env.API_KEY_15,
    process.env.API_KEY_16
]

function waitForEvent(eventEmitter, eventName) {
	return new Promise(resolve => {
		eventEmitter.on(eventName, resolve)
	})
}

async function waitSeconds(seconds) {
	const eventEmitter = new EventEmitter()

	setTimeout(() => {
		eventEmitter.emit('TimeEvent')
	}, seconds * 1000)

	await waitForEvent(eventEmitter, 'TimeEvent')
}

export const getApiKey = async () => {

    let apiKey
    apiKeyIndex = apiKeyIndex % apiKeyList.length
    apiKey = apiKeyList[apiKeyIndex]

    //console.log(`[etherscan-api] rotating api key ${apiKeyIndex}`)
    apiKeyIndex++

    apiKeySleepIndex++
    apiKeySleepIndex = apiKeySleepIndex % (apiKeyList.length * 4)

    if (apiKeySleepIndex === 0) {
        await waitSeconds(1)
    }

    return apiKey
}

export const executeEthscanAPI = async (url, apiKey) => {

     //console.log(`${url}&apikey=${apiKey}`)
    try {
        const res = await fetch(url + `&apikey=${apiKey}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const resData = await res.json()

        // console.log('done')
        return resData;

    } catch (error) {
        
        afx.error_log('executeEthscanAPI', error)
    }
}
