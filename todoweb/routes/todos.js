var express = require('express');
var router = express.Router();
const moment = require('moment')
const path = require('path');
const { isLoggedIn } = require('../helpers/util');

module.exports = function (db) {

  router.get('/', isLoggedIn, (req, res) => {
    const page = req.query.page || 1
    const sortBy = req.query.sortBy || 'id'
    const sortMode = req.query.sortMode || 'asc'
    const limit = 2
    const offset = (page - 1) * limit

    const queries = []
    const params = []

    params.push(req.session.user.id)
    queries.push(`userid = $${params.length}`)

    if (req.query.title) {
      params.push(req.query.title)
      queries.push(`title ilike '%' || $${params.length} || '%'`)

    }

    if (req.query.startdate && req.query.enddate) {
      params.push(req.query.startdate)
      const startIdx = params.length
      params.push(req.query.enddate)
      const endIdx = params.length
      queries.push(`deadline BETWEEN $${startIdx} AND $${endIdx}::date + INTERVAL '1 day'`)
    
    } else if (req.query.startdate) {
      params.push(req.query.startdate)
      queries.push(`deadline >= $${params.length}`)
    
    } else if (req.query.enddate) {
      params.push(req.query.enddate)
      queries.push(`deadline <= $${params.length}::date + INTERVAL '1 day'`)
    }

    if (req.query.complete) {
      params.push(JSON.parse(req.query.complete))
      queries.push(`complete = $${params.length}`)
    }

    let sql = 'SELECT COUNT(*) AS total FROM todos';

    if (queries.length > 0) {
      sql += ` WHERE ${queries.join(' AND ')}`
    }

    console.log(sql, 'count')

    db.query(sql, params, (err, data) => {


      if (err) console.log(err)


      const pages = Math.ceil(data.rows[0].total / limit)

      sql = 'SELECT * FROM todos';


      if (queries.length > 0) {
        sql += ` WHERE ${queries.join(' AND ')}`
      }

      sql += ` ORDER BY ${['id', 'title', 'complete', 'deadline'].includes(sortBy) ? sortBy : 'id'} ${['asc', 'desc'].includes(sortMode) ? sortMode : 'asc'}`

      params.push(limit, offset)
      sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`

      console.log(sql)
      db.query(sql, params, (err, data) => {
        if (err) {
          console.log(err)
        }
        res.render('todos/table', { moment, rows: data.rows, query: req.query, pages, page: parseInt(page), sortBy, sortMode, url: new URLSearchParams({ ...req.query, page, sortBy, sortMode }).toString() });
      })
    })
  });

  router.get('/add', isLoggedIn, (req, res) => {
    res.render('todos/add', { item: {} });
  })
  router.post('/add', isLoggedIn, (req, res) => {
    const { title } = req.body
    db.query("INSERT INTO todos (title, userid) VALUES ($1, $2)", [title, req.session.user.id], (err) => {
      if (err) {
        console.log("gagal menambah data", err)
      }
      res.redirect('/todos')
    })
  })

  router.get('/edit/:id', isLoggedIn, (req, res) => {
    const id = req.params.id
    db.query("SELECT * FROM todos WHERE id = $1", [id], (err, data) => {
      if (err) console.log(err)
      res.render('todos/edit', { moment, item: data.rows[0] })
    })
  })

  router.post('/edit/:id', isLoggedIn, (req, res) => {
    const id = req.params.id
    const { title, deadline, complete } = req.body
    db.query("UPDATE todos SET title = $1, deadline = $2, complete = $3 WHERE id = $4",
      [title, deadline || null, complete == "" ? null : JSON.parse(complete), id], (err) => {
        if (err) console.log("gagal update data", err)
        res.redirect('/todos')
      })
  })

  router.get('/delete/:id', isLoggedIn, (req, res) => {
    const id = req.params.id
    db.query('DELETE FROM todos WHERE id = $1', [id], (err) => {
      if (err) console.log(err)
      res.redirect('/todos')
    })
  })

  return router;

};
