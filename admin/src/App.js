import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import Dashboard from "./components/pages/Dashboard";
import React, { Component } from 'react';
import Login from "./components/auth/Login";
import NotFound from "./components/layout/NotFound";
import { Provider } from "react-redux";
import PrivateRoute from "./components/private-route/PrivateRoute";
import PublicRoute from "./components/public-route/PublicRoute";
import Register from "./components/auth/Register";
import store from "./store";
import jwt_decode from "jwt-decode";
import setAuthToken from "./utils/setAuthToken";
import { setCurrentUser, logoutUser } from "./actions/authActions";

import './App.css';
import '../node_modules/bootstrap/dist/css/bootstrap.css';
import '../node_modules/bootstrap/dist/js/bootstrap';
import '../node_modules/font-awesome/css/font-awesome.css';
import '../node_modules/jquery/dist/jquery.min';
import '../node_modules/popper.js/dist/popper';

import Members from "./components/pages/Members";
import Sessions from "./components/pages/Sessions";
import Users from "./components/pages/Users";
import Events1 from "./components/pages/Events";
import Rewards from "./components/pages/Rewards";

let permission = 'ADMIN';

if (localStorage.jwtToken) {
    const token = localStorage.jwtToken; 
    setAuthToken(token);
    const decoded = jwt_decode(token);
    store.dispatch(setCurrentUser(decoded));
    const currentTime = Date.now() / 1000;

    permission = decoded.permission;

    console.log(permission)

    if (decoded.exp < currentTime) {
        store.dispatch(logoutUser());
        window.location.href = "./login";
    }
}

class App extends Component {

    render () {
        return (
            <Provider store={store}>
                <Router>
                    <div className="App">
                        <Switch>
                            <Route exact path="/" component={Login} />
                            <PublicRoute exact path="/register" component={Register} perm={permission} />
                            <Route exact path="/login" component={Login} />
                            <Switch>
                                <PrivateRoute exact path="/dashboard" component={Dashboard} dashboard={true} perm={permission}/>
                                <PrivateRoute exact path="/members" component={Members} perm={permission} />
                                <PrivateRoute exact path="/sessions" component={Sessions} perm={permission} />
                                <PrivateRoute exact path="/users" component={Users} perm={permission} />
                                <PrivateRoute exact path="/rewards" component={Rewards} perm={permission} />
                                <PrivateRoute exact path="/events" component={Events1} perm={permission} />
                            </Switch>
                            <Route exact path="*" component={NotFound} />
                        </Switch>
                    </div>
                </Router>
            </Provider>
        );
    }
}

export default App;
