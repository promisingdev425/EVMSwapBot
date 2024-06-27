import axios from "axios";
import {
    GET_ERRORS,
    USER_ADD,
    USER_UPDATE,
    USER_PAY,
    USER_MSG
} from "./types";

import config from "../config/config";

const serverUrl = config.serverUrl;

export const addUser = (userData, history) => dispatch => {
    axios
        .post(serverUrl + "/api/admin-add", userData)
        .then(res =>
            dispatch({
                type: USER_ADD,
                payload: res,
            })
        ).catch(err =>
        dispatch({
            type: GET_ERRORS,
            payload: err.response.data
        })
    );
};

export const payUser = (userData, history) => dispatch => {
    axios
        .post(serverUrl + "/api/user-pay", userData)
        .then(res => {
                dispatch({
                    type: USER_PAY,
                    payload: res,
                })

                if (res.data) {
                    alert(res.data.message)
                } else {
                    alert("Failed to make payment")
                }
            }
        ).catch(err =>
        dispatch({
            type: GET_ERRORS,
            payload: err.response.data
        })
    );
};

export const msgUser = (userData, history) => dispatch => {

    axios
        .post(serverUrl + "/api/user-msg", userData)
        .then(res => {
                dispatch({
                    type: USER_MSG,
                    payload: res,
                })

                if (res.data) {
                    alert(res.data.message)
                } else {
                    alert("Failed to send message")
                }
            }
        ).catch(err =>
        dispatch({
            type: GET_ERRORS,
            payload: err.response.data
        })
    );
};

export const updateUser = (userData) => dispatch => {
    axios
        .post(serverUrl + "/api/admin-update", userData)
        .then(res =>
            dispatch({
                type: USER_UPDATE,
                payload: res,
            })
        ).catch(err =>
        dispatch({
            type: GET_ERRORS,
            payload: err.response.data
        })
    );
};
