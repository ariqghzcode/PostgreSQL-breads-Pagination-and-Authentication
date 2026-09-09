var express = require('express');
const { hashPassword, comparePassword } = require('../helpers/util');
var router = express.Router();

module.exports = function (db) {
  router.get('/', function (req, res, next) {
    res.render('login',
      {
        successMessage: req.flash('successMessage'),
        errorMessage: req.flash('errorMessage')
      }
    );
  });

  router.post('/login', async function (req, res, next) {
    const { email, password } = req.body
    try {
      const data = await db.query('SELECT * FROM users WHERE email = $1', [email])
      if (data.rows.length == 0) throw Error(`email doesn't exist`)
      if (!comparePassword(password, data.rows[0].password)) throw Error('password is wrong')
      req.session.user = {
        id: data.rows[0].id,
        name: data.rows[0].name,
        role: data.rows[0].role,
        avatar: data.rows[0].avatar 
      }
      res.redirect('/todos')
    } catch (error) {
      req.flash('errorMessage', error.message)
      res.redirect('/')
    }
  });

  router.get('/register', function (req, res, next) {
    res.render('register',
      {
        successMessage: req.flash('successMessage'),
        errorMessage: req.flash('errorMessage')
      }
    );
  });

  router.post('/register', async function (req, res, next) {
    const { name, email, password, repassword } = req.body
    try {
      if (password !== repassword) throw Error(`password doesn't match`)
      const data = await db.query('SELECT * FROM users WHERE email = $1', [email])
      if (data.rows.length > 0) throw Error('email already exist')
      await db.query('INSERT INTO users(name, email, password) VALUES ($1, $2, $3)', [name, email, hashPassword(password)])
      req.flash('successMessage', 'User Created, Please Log In')
      res.redirect('/')
    } catch (error) {
      req.flash('errorMessage', error.message)
      res.redirect('/register')
    }
  });

  router.get('/logout', (req, res) => {
    req.session.destroy(function (err) {
      res.redirect('/')
    })
  })

  return router;
}
