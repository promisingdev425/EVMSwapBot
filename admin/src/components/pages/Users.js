import React, { Component, Fragment } from "react";
import Navbar from "../partials/Navbar";
import Sidebar from "../partials/Sidebar";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faList} from "@fortawesome/free-solid-svg-icons/faList";
import ReactDatatable from '@ashvin27/react-datatable';
import PropTypes from "prop-types";
import {connect} from "react-redux";
import axios from "axios";
import {faPlus} from "@fortawesome/free-solid-svg-icons";
import { toast, ToastContainer} from "react-toastify";
import config from "../../config/config";
import PayNowModal from "../partials/PayNowModal";
import MsgNowModal from "../partials/MsgNowModal";

const serverUrl = config.serverUrl;
class Users extends Component {

    constructor(props) {
        super(props);

        this.perm = props.perm;
        this.columns = [
            // {
            //     key: "_id",
            //     text: "Id",
            //     className: "id",
            //     align: "left",
            //     sortable: true,
            // },
            {
                key: "chatid",
                text: "ChatID",
                className: "chatid",
                align: "left",
                width: "10%",
                sortable: true,
            },
            {
                key: "username",
                text: "Name",
                className: "username",
                align: "left",
                width: "10%",
                sortable: true,
            },
            {
                key: "bot_referral_link",
                text: "Refer Link",
                className: "bot_referral_link",
                align: "left",
                sortable: true,
                cell: record => <span style={{ color: 'blue' }}>{record.bot_referral_link}</span>
            },
            {
                key: "referred_by",
                text: "Referred By",
                className: "referred_by",
                align: "left",
                width: "10%",
                sortable: true
            },
            {
                key: "count_referred",
                text: "Referred Count",
                className: "count_referred",
                align: "left",
                width: "5%",
                sortable: true
            },
            {
                key: "rewarded",
                text: "Rewarded Times",
                className: "rewarded",
                align: "left",
                width: "5%",
                sortable: true
            },
            {
                key: "earned",
                text: "Total earned",
                className: "earned",
                align: "left",
                width: "5%",
                sortable: true,
                cell: record => {
                    return (
                       '$' + record.earned
                    );
                }
            },
            {
                key: "pending",
                text: "Pending",
                className: "pending",
                align: "left",
                width: "5%",
                sortable: true,
                cell: record => {
                    return (
                       '$' + record.pending
                    );
                }
            },
            {
                key: "action",
                text: "Action",
                className: "action",
                width: "150px",
                align: "left",
                sortable: false,
                cell: record => {
                    return (
                        <Fragment>
                            <button
                                className="btn btn-primary btn-sm"
                                data-toggle="modal" data-target="#msg-now-modal"
                                onClick={() => this.msgNow(record)}
                                >
                                <i className="fa fa-telegram"></i>
                            </button>
                            <button
                                className="btn btn-success btn-sm"
                                data-toggle="modal" data-target="#pay-now-modal"
                                onClick={() => this.payNow(record)}
                                >
                                <i className="fa fa-credit-card"></i>
                            </button>
                            <button
                                className="btn btn-danger btn-sm"
                                onClick={() => this.deleteRecord(record)}>
                                <i className="fa fa-trash"></i>
                            </button>
                        </Fragment>
                    );
                }
            }
        ];

        this.config = {
            page_size: 10,
            length_menu: [ 10, 20, 50 ],
            filename: "Users",
            no_data_text: 'No session found!',
            button: {
                excel: true,
                print: true,
                csv: true
            },
            language: {
                length_menu: "Show _MENU_ result per page",
                filter: "Filter in records...",
                info: "Showing _START_ to _END_ of _TOTAL_ records",
                pagination: {
                    first: "First",
                    previous: "Previous",
                    next: "Next",
                    last: "Last"
                }
            },
            show_length_menu: true,
            show_filter: true,
            show_pagination: true,
            show_info: true,
        };

        this.state = {
            records: []
        };

        this.state = {
            currentRecord: {
                id: '',
                chatid: '',
                username: '',
                bot_referral_link: '',
                referred_by: '',
                wallet: '',
            }
        };

        this.getData = this.getData.bind(this);
    }

    componentDidMount() {

        this.getData()
    };

    componentWillReceiveProps(nextProps) {

        this.getData()
    }

    getData() {

        axios
            .post(serverUrl + "/api/users-data")
            .then(res => {
                this.setState({ records: res.data})
            })
            .catch()
    }

    payNow(record) {
        this.setState({ currentRecord: record});
    }

    msgNow(record) {
        this.setState({ currentRecord: record});
    }

    deleteRecord(record) {
        var result = window.confirm(`Are you sure you wanna delete @${record.username}?`);
        if (result) {
            axios
                .post(serverUrl + "/api/users-delete", {_id: record._id})
                .then(res => {
                    if (res.status === 200) {
                    toast(res.data.message, {
                        position: toast.POSITION.TOP_CENTER,
                    })
                    }
                })
                .catch();
            this.getData();
        }
    }

    pageChange(pageData) {
        
    }

    render() {
        return (
            <div>
                <Navbar perm={this.perm}/>
                <div className="d-flex" id="wrapper">
                    <Sidebar perm={this.perm}/>
                    <PayNowModal record={this.state.currentRecord}/>
                    <MsgNowModal record={this.state.currentRecord}/>
                    <div id="page-content-wrapper">
                        <div className="container-fluid">
                            <button className="btn btn-link mt-3" id="menu-toggle"><FontAwesomeIcon icon={faList}/></button>
                            <h1 className="mt-2 text-primary">Users List</h1>
                            <ReactDatatable
                                config={this.config}
                                records={this.state.records}
                                columns={this.columns}
                                onPageChange={this.pageChange.bind(this)}
                            />
                        </div>
                    </div>
                    <ToastContainer/>
                </div>
            </div>
        );
    }

}

Users.propTypes = {
    auth: PropTypes.object.isRequired,
};

const mapStateToProps = state => ({
    auth: state.auth,
    records: state.records
});

export default connect(
    mapStateToProps
)(Users);
