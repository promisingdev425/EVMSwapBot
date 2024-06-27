import React from "react";
import { Route, Redirect } from "react-router-dom";
import { connect } from "react-redux";
import PropTypes from "prop-types";

const PublicRoute = ({ component: Component, perm, ...rest }) => (
    <Route
        {...rest}
        render={props =>
            perm === 'OBSERVER' ? (
                <Redirect to="/login" />
            ) : (
                <Component {...props} />
            )
        }
    />
);

PublicRoute.propTypes = {
    auth: PropTypes.object.isRequired
};

const mapStateToProps = state => ({
    
});

export default connect(mapStateToProps)(PublicRoute);
