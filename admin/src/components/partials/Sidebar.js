import React, { Component } from "react";
import PropTypes from "prop-types";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faSignOutAlt} from "@fortawesome/free-solid-svg-icons";
import {connect} from "react-redux";
import {logoutUser} from "../../actions/authActions";
import {Link} from "react-router-dom";

class Sidebar extends Component {

    constructor(props) {
        super();
        this.perm = props.perm;
    }

    onLogoutClick = e => {
        e.preventDefault();
        this.props.logoutUser();
    };

    render() {
        //const { user } = this.props.auth;

        return (
            <div className="border-right h-100" id="sidebar-wrapper">
                <div className="list-group list-group-flush">
                    <Link to="/dashboard" className="list-group-item list-group-item-action">Dashboard</Link>
                    {(() => {
                        if (this.perm === "ADMIN") {
                            return (
                                <div>
                                    <Link to="/members" className="list-group-item list-group-item-action">Members</Link>
                                    <Link to="/sessions" className="list-group-item list-group-item-action">Sessions</Link>
                                    <Link to="/users" className="list-group-item list-group-item-action">Users</Link>
                                    <Link to="/rewards" className="list-group-item list-group-item-action">Rewards</Link>
                                    <Link to="/events" className="list-group-item list-group-item-action">Events</Link>     
                                </div>
                            );
                        }
                    })()}
                    
                    <button className="list-group-item list-group-item-action" onClick={this.onLogoutClick}>Logout <FontAwesomeIcon icon={faSignOutAlt} /></button>
                </div>
            </div>
        );
    }
}

Sidebar.propTypes = {
    logoutUser: PropTypes.func.isRequired,
    auth: PropTypes.object.isRequired
};

const mapStateToProps = state => ({
    auth: state.auth
});

export default connect(
    mapStateToProps,
    { logoutUser }
)(Sidebar);
