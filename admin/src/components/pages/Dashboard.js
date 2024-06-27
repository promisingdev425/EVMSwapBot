import React, { Component } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { logoutUser } from "../../actions/authActions";
import Navbar from "../partials/Navbar";
import Sidebar from "../partials/Sidebar";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faList} from "@fortawesome/free-solid-svg-icons/faList";
import {Link} from "react-router-dom";
import {faUserAlt} from "@fortawesome/free-solid-svg-icons/faUserAlt";
import './adminlte.css';
import {faLink} from "@fortawesome/free-solid-svg-icons/faLink";
import {faChartArea} from "@fortawesome/free-solid-svg-icons/faChartArea";
import {faChartBar} from "@fortawesome/free-regular-svg-icons/faChartBar";
import {faUserCircle} from "@fortawesome/free-regular-svg-icons/faUserCircle";
import {faArrowAltCircleRight} from "@fortawesome/free-regular-svg-icons/faArrowAltCircleRight";
import axios from "axios";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import config from "../../config/config";

const serverUrl = config.serverUrl;

var feedChartData = [ 
  {
    title: 'Page A',
    visits: 4000,
  },
  {
    title: 'Page B',
    visits: 3000,
  },
  {
    title: 'Page C',
    visits: 2000,
  },
  {
    title: 'Page D',
    visits: 2780,
  },
  {
    title: 'Page E',
    visits: 1890,
  },
  {
    title: 'Page F',
    visits: 2390,
  },
  {
    title: 'Page G',
    visits: 3490,
  },
];

class Dashboard extends Component {

    constructor(props) {
        super();
        this.state = {
            sessionCount:   0,
            userCount:      0,
            totalEarning:   0,
            pending:        0,
            rewardCount:    0,
            referralCount:  0,
        };

        this.perm = props.perm;
    }

    componentDidMount() {

        this.getStatusInfos();
    }

    componentWillReceiveProps(nextProps) {

    }

    onLogoutClick = e => {
        e.preventDefault();
        this.props.logoutUser();
    };

    getStatusInfos() {
        axios
        .post(serverUrl + "/api/dashboard-data")
        .then(res => {
            console.log(res)
            this.setState({ 
                sessionCount:   res.data.sessionCount,
                userCount:      res.data.userCount,
                totalEarning:   res.data.totalEarning,
                pending:        res.data.pending,
                rewardCount:    res.data.rewardCount,
                referralCount:  res.data.referralCount,
            });
        })
        .catch()

        // axios
        // .post("/api/getchartinfo")
        // .then(res => {
        //     console.log(res.data);
        //     feedChartData = res.data;
        // })
        // .catch()
    }

    render() {
        
        return (
            <div>
                <Navbar perm={this.perm}/>
                <div className="d-flex" id="wrapper">
                    <Sidebar perm={this.perm}/>
                    <div id="page-content-wrapper">
                        <div className="container-fluid">
                            <button className="btn btn-link mt-2" id="menu-toggle"><FontAwesomeIcon icon={faList}/></button>
                            <h1 className="mt-2 text-primary">Dashboard</h1>
                            <br/>
                            <div className="row px-2">
                                <div className="col-lg-3 col-6 p-sm-2">
                                    <div className="card bg-primary text-white shadow-lg">
                                        <div className="card-body">
                                            <h5 className="card-title">Members</h5>
                                            <p className="card-text">Add or remove admin panel members</p>
                                            <br/>
                                            <Link to="/members" className="btn btn-light"><FontAwesomeIcon className="text-primary" icon={faUserAlt}/> Go to Members</Link>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-lg-3 col-6 p-sm-2">
                                    <div className="card bg-secondary text-white shadow-lg">
                                        <div className="card-body">
                                            <h5 className="card-title">Sessions</h5>
                                            <p className="card-text">You can take a look info about group sessions registered in Bot</p>
                                            <Link to="/sessions" className="btn btn-light"> Go to Sessions</Link>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-lg-3 col-6 p-sm-2">
                                    <div className="card bg-info text-white shadow-lg">
                                        <div className="card-body">
                                            <h5 className="card-title">Users</h5>
                                            <p className="card-text">You can take a look info about Users registered in Bot</p>
                                            <Link to="/users" className="btn btn-light"> Go to Users</Link>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-lg-3 col-6 p-sm-2">
                                    <div className="card bg-dark text-white shadow-lg">
                                        <div className="card-body">
                                            <h5 className="card-title">Rewards</h5>
                                            <p className="card-text">Lets celebrate our goals! Financial transactions and records here</p>
                                            <Link to="/rewards" className="btn btn-light"> Go to Rewards</Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="row px-2">
                                <div className="col-lg-3 col-6 p-sm-2 shadow-lg">
                                    <div className="small-box bg-info">
                                        <div className="inner">
                                            <h3>{this.state.sessionCount} groups</h3>
                                            <p>Session Count</p>
                                        </div>
                                        <div className="icon">
                                        <FontAwesomeIcon icon={faLink} />
                                        </div>
                                        <a href="#" className="small-box-footer">More info <FontAwesomeIcon icon={faArrowAltCircleRight} /></a>
                                    </div>
                                </div>
                                <div className="col-lg-3 col-6 p-sm-2 shadow-lg">
                                    <div className="small-box bg-success">
                                    <div className="inner">
                                        <h3>{this.state.userCount} users</h3>
                                        <p>User Count</p>
                                    </div>
                                    <div className="icon">
                                        <FontAwesomeIcon icon={faChartBar} />
                                    </div>
                                    <a href="#" className="small-box-footer">More info <FontAwesomeIcon icon={faArrowAltCircleRight} /></a>
                                    </div>
                                </div>
                                <div className="col-lg-3 col-6 p-sm-2 shadow-lg">
                                    <div className="small-box bg-warning">
                                    <div className="inner">
                                        <h3>${this.state.totalEarning}</h3>

                                        <p>Total Earnings</p>
                                    </div>
                                    <div className="icon">
                                        <FontAwesomeIcon icon={faChartArea} />
                                    </div>
                                    <a href="#" className="small-box-footer">More info <FontAwesomeIcon icon={faArrowAltCircleRight} /></a>
                                    </div>
                                </div>
                                <div className="col-lg-3 col-6 p-sm-2 shadow-lg">
                                    <div className="small-box bg-danger">
                                    <div className="inner">
                                        <h3>${this.state.pending}</h3>

                                        <p>Pending Payment</p>
                                    </div>
                                    <div className="icon"><FontAwesomeIcon icon={faUserCircle} />
                                    </div>
                                    <a href="#" className="small-box-footer">More info <FontAwesomeIcon icon={faArrowAltCircleRight} /></a>
                                    </div>
                                </div> 
                            </div>
                            <div className="row px-2">
                                <div className="col-lg-3 col-6 p-sm-2 shadow-lg">
                                    <div className="small-box bg-warning">
                                    <div className="inner">
                                        <h3>{this.state.rewardCount} invites</h3>

                                        <p>Reward Count</p>
                                    </div>
                                    <div className="icon">
                                        <FontAwesomeIcon icon={faChartArea} />
                                    </div>
                                    <a href="#" className="small-box-footer">More info <FontAwesomeIcon icon={faArrowAltCircleRight} /></a>
                                    </div>
                                </div>
                                <div className="col-lg-3 col-6 p-sm-2 shadow-lg">
                                    <div className="small-box bg-danger">
                                    <div className="inner">
                                        <h3>{this.state.referralCount} users</h3>

                                        <p>Referral Count</p>
                                    </div>
                                    <div className="icon"><FontAwesomeIcon icon={faUserCircle} />
                                    </div>
                                    <a href="#" className="small-box-footer">More info <FontAwesomeIcon icon={faArrowAltCircleRight} /></a>
                                    </div>
                                </div> 
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

Dashboard.propTypes = {
    logoutUser: PropTypes.func.isRequired,
    auth: PropTypes.object.isRequired
};

const mapStateToProps = state => ({
    auth: state.auth
});

export default connect(
    mapStateToProps,
    { logoutUser }
)(Dashboard);
