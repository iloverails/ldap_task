var crypto = require('crypto'),
    validator = require('validator'),
    owasp = require('owasp-password-strength-test');

module.exports = function(){
    return {
        validatePassword: function (password) {
            if (!password) return 'Password is required';
            var result = owasp.test(password);
            if (result.errors.length)
                return result.errors.join(' ');
        },
        hashPassword: function (password, salt) {
            console.log(password, salt)
            return crypto.pbkdf2Sync(password, new Buffer(salt, 'base64'), 10000, 64).toString('base64');
        },
        authenticate: function (user, password) {
            return user.password === this.hashPassword(password, user.salt);
        },
        preSave: function(user){
            user.salt = crypto.randomBytes(16).toString('base64');
            user.password = this.hashPassword(user.password,user.salt);
            return user
        }

    }
};
