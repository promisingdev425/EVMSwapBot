
import Validator from "validator"
import isEmpty from "is-empty"

export const validateLoginInput = (data) => {
    let errors = {};
    data.userid = !isEmpty(data.email) ? data.email.trim() : "";
    data.password = !isEmpty(data.password) ? data.password : "";
    if (Validator.isEmpty(data.email)) {
        errors.userid = "ID field is required";
    } 

    if (Validator.isEmpty(data.password)) {
        errors.password = "Password field is required";
    }
    return {
        errors,
        isValid: isEmpty(errors)
    };
}


export const validateRegisterInput = (data) => {
    let errors = {};
    data.name = !isEmpty(data.name) ? data.name.trim() : "";
    data.email = !isEmpty(data.email) ? data.email.trim() : "";
    data.password = !isEmpty(data.password) ? data.password : "";
    data.password2 = !isEmpty(data.password2) ? data.password2 : "";
    if (Validator.isEmpty(data.name)) {
        errors.name = "Name field is required";
    }
    if (Validator.isEmpty(data.email)) {
        errors.email = "ID field is required";
    }
    if (Validator.isEmpty(data.password)) {
        errors.password = "Password field is required";
    }
    if (Validator.isEmpty(data.password2)) {
        errors.password2 = "Confirm password field is required";
    }
    if (!Validator.isLength(data.password, { min: 6, max: 30 })) {
        errors.password = "Password must be at least 6 characters";
    }
    if (!Validator.equals(data.password, data.password2)) {
        errors.password2 = "Passwords must match";
    }
    return {
        errors,
        isValid: isEmpty(errors)
    };
};

export const validateUpdateUserInput = (data) => {
    let errors = {};
    data.name = !isEmpty(data.name) ? data.name.trim() : "";
    data.email = !isEmpty(data.email) ? data.userid.trim() : "";
    if (Validator.isEmpty(data.name)) { 
        errors.name = "Name field is required";
    }
    if (Validator.isEmpty(data.email)) {
        errors.email = "ID field is required";
    } 

    return { 
        errors,
        isValid: isEmpty(errors)
    };
};

export const validateUpdateGroupInput = (data) => {
    let errors = {};
    data.name = !isEmpty(data.name) ? data.name.trim() : "";
    data.email = !isEmpty(data.email) ? data.userid.trim() : "";
    if (Validator.isEmpty(data.name)) { 
        errors.name = "Name field is required";
    }
    if (Validator.isEmpty(data.email)) {
        errors.email = "ID field is required";
    } 

    return { 
        errors,
        isValid: isEmpty(errors)
    };
};