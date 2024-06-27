import React from 'react'
import classnames from "classnames";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { payUser } from "../../actions/userActions";
import { withRouter } from "react-router-dom";
import { toast } from 'react-toastify';
import $ from 'jquery';
import axios from "axios";
import 'react-toastify/dist/ReactToastify.css';
import config from "../../config/config";
const serverUrl = config.serverUrl;

class PayNowModal extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            chatid: this.props.record.chatid,
            username: this.props.record.username,
            wallet: this.props.record.wallet,
            pending: this.props.record.pending,
            errors: {},
        };
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.record) {
            this.setState({
                chatid: nextProps.record.chatid,
                username: nextProps.record.username,
                wallet: nextProps.record.wallet,
                pending: nextProps.record.pending,
            });
        }
        if (nextProps.errors) {
            this.setState({
                errors: nextProps.errors
            });
        }
        if (nextProps.auth !== undefined
            && nextProps.auth.user !== undefined
            && nextProps.auth.user.data !== undefined
            && nextProps.auth.user.data.message !== undefined) {
            $('#pay-now-modal').modal('hide');
            // toast(nextProps.auth.user.data.message, {
            //     position: toast.POSITION.TOP_CENTER
            // });
        }
    }

    onChange = e => {
        this.setState({ [e.target.id]: e.target.value });
    };

    getData() {
        axios
            .post(serverUrl + "/api/users-get-pending", {chatid: this.state.chatid})
            .then(res => {
                this.state.pending = Number(res.pending)
            })
            .catch()
    }

    onPayNow = e => {

        e.preventDefault();
        const newUser = {
            chatid: this.state.chatid,
            username: this.state.username,
            wallet: this.state.wallet,
            pending: this.state.pending,
        };
        this.props.payUser(newUser, this.props.history);
    };

    render() {
        const { errors } = this.state;
        return (
            <div>
                <div className="modal fade" id="pay-now-modal" data-reset="true">
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h4 className="modal-title">Pay Now</h4>
                                <button type="button" className="close" data-dismiss="modal">&times;</button>
                            </div>
                            <div className="modal-body">
                                <form noValidate onSubmit={this.onPayNow} id="add-user">
                                    <div className="row mt-2">
                                        <div className="col-md-3">
                                            <label htmlFor="name">Name</label>
                                        </div>
                                        <div className="col-md-9">
                                            <span className="">@{this.state.username}</span>
                                        </div>
                                    </div>
                                    <div className="row mt-2">
                                        <div className="col-md-3">
                                            <label htmlFor="name">Wallet</label>
                                        </div>
                                        <div className="col-md-9">
                                            <span className="text-danger">{
                                                (() => {
                                                    if (this.state.wallet) 
                                                        return this.state.wallet
                                                    else
                                                        return "Not Specified"
                                                })()
                                            }</span>
                                        </div>
                                    </div>
                                    <div className="row mt-2">
                                        <div className="col-md-3">
                                            <label htmlFor="name">Pending Payment</label>
                                        </div>
                                        <div className="col-md-9">
                                            <span className="text-danger">{
                                                (() => {
                                                    return '$ ' + this.state.pending
                                                })()
                                            }</span>
                                        </div>

                                    </div>
                                </form>
                            </div>
                            <div className="modal-footer">
                                <button
                                    form="reload-pending"
                                    onClick={() => this.getData()}
                                    className="btn btn-success">
                                    Reload
                                </button>
                                <button
                                    form="add-user"
                                    type="submit"
                                    className="btn btn-primary">
                                    Pay
                                </button>
                                <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}

PayNowModal.propTypes = {
    payUser: PropTypes.func.isRequired,
    auth: PropTypes.object.isRequired,
    errors: PropTypes.object.isRequired
};

const mapStateToProps = state => ({
    auth: state.auth,
    errors: state.errors
});

export default connect(
    mapStateToProps,
    { payUser }
)(withRouter(PayNowModal));
