import React from 'react'
import classnames from "classnames";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { msgUser } from "../../actions/userActions";
import { withRouter } from "react-router-dom";
import { toast } from 'react-toastify';
import $ from 'jquery';
import axios from "axios";
import 'react-toastify/dist/ReactToastify.css';
import config from "../../config/config";
const serverUrl = config.serverUrl;

class MsgNowModal extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            chatid: this.props.record.chatid,
            username: this.props.record.username,
            errors: {},
        };
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.record) {
            this.setState({
                chatid: nextProps.record.chatid,
                username: nextProps.record.username,
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
            $('#msg-now-modal').modal('hide');
            // toast(nextProps.auth.user.data.message, {
            //     position: toast.POSITION.TOP_CENTER
            // });
        }
    }

    onChange = e => {
        this.setState({ [e.target.id]: e.target.value });
    };

    onMsgNow = e => {

        e.preventDefault();
        const newUser = {
            chatid: this.state.chatid,
            username: this.state.username,
            message: this.state.message,
        };

        this.props.msgUser(newUser, this.props.history);
    };

    render() {
        const { errors } = this.state;
        return (
            <div>
                <div className="modal fade" id="msg-now-modal" data-reset="true">
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h4 className="modal-title">Message Now</h4>
                                <button type="button" className="close" data-dismiss="modal">&times;</button>
                            </div>
                            <div className="modal-body">
                                <form noValidate onSubmit={this.onMsgNow} id="msg-user">
                                    <div className="row mt-2">
                                        <div className="col-md-3">
                                            <label htmlFor="username">Name</label>
                                        </div>
                                        <div className="col-md-9">
                                            <span className="">@{this.state.username}</span>
                                        </div>
                                    </div>
                                    <div className="row mt-2">
                                        <div className="col-md-3">
                                            <label htmlFor="name">Content</label>
                                        </div>
                                        <div className="col-md-9">
                                            <input
                                                onChange={this.onChange}
                                                value={this.state.message}
                                                id="message"
                                                type="text"
                                                error={errors.message}
                                                className={classnames("form-control", {
                                                    invalid: errors.message
                                                })}/>
                                            <span className="text-danger">{errors.message}</span>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div className="modal-footer">
                                <button
                                    form="msg-user"
                                    type="submit"
                                    className="btn btn-primary">
                                    Send
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

MsgNowModal.propTypes = {
    msgUser: PropTypes.func.isRequired,
    auth: PropTypes.object.isRequired,
    errors: PropTypes.object.isRequired
};

const mapStateToProps = state => ({
    auth: state.auth,
    errors: state.errors
});

export default connect(
    mapStateToProps,
    { msgUser }
)(withRouter(MsgNowModal));
