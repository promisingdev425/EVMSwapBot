import React from "react";
import { Route, Redirect } from "react-router-dom";
import { connect } from "react-redux";
import PropTypes from "prop-types";

const PrivateRoute = ({ component: Component, auth, perm, dashboard, ...rest }) => (
    <Route
        {...rest}
        render={props =>
            auth.isAuthenticated === true ? (
                perm === 'OBSERVER' && !dashboard ?
                ( <Redirect to="/dashboard" /> )
                : 
                ( <Component {...props} perm={perm} /> )
            ) : (
                <Redirect to="/login" />
            )
        }
    />
);

PrivateRoute.propTypes = {
    auth: PropTypes.object.isRequired
};

const mapStateToProps = state => ({
    auth: state.auth
});

export default connect(mapStateToProps)(PrivateRoute);
