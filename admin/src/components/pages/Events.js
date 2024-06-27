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

const serverUrl = config.serverUrl;

class Events extends Component {

    constructor(props) {
        super(props);

        //this.getData = this.getData.bind(this);
        this.perm = props.perm;
    }

    componentDidMount() {
    };

    componentWillReceiveProps(nextProps) {
    }


    render() {
        return (
            <div>
                <Navbar perm={this.perm}/>
                <div className="d-flex" id="wrapper">
                <Sidebar perm={this.perm}/>
                    <div id="page-content-wrapper">
                        <div className="container-fluid">
                            <button className="btn btn-link mt-3" id="menu-toggle"><FontAwesomeIcon icon={faList}/></button>
                            <h1 className="mt-2 text-primary">Events</h1>
                        </div>
                    </div>
                    <ToastContainer/>
                </div>
            </div>
        );
    }

}

const mapStateToProps = state => ({
    auth: state.auth,
});

export default connect(
    mapStateToProps
)(Events);
