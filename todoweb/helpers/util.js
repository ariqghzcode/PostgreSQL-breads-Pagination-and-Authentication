const bcrypt = require('bcrypt');
const saltRounds = 10;

module.exports = {
    hashPassword(password){
        return bcrypt.hashSync(password, saltRounds);
    },
    comparePassword(password, hash) {
        return bcrypt.compareSync(password, hash);
    },
    isLoggedIn(req, res, next){
        if(req.session.user){
            next()
        } else {
        res.redirect('/')
        }
    },
    isAdmin(req, res, next){
        if(req.session.user && req.session.user.role === 'admin'){
            next()
        } else {
        res.redirect('/')
        }
    }
}