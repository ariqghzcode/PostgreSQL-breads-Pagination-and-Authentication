const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data.db');
const bodyParser = require('body-parser')

const app = express();

app.set('view engine', 'ejs');

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded())

// parse application/json
app.use(bodyParser.json())

app.get('/', (req, res) => {
  const page = req.query.page || 1
  const limit = 2
  const offset = (page - 1) * limit

  const queries = []
  const params = []

  if (req.query.name) {
    queries.push("name like '%' || ? || '%'")
    params.push(req.query.name)
  }

  if (req.query.isMarried) {
    queries.push('isMarried = ?')
    params.push(JSON.parse(req.query.isMarried))
  }

  let sql = 'SELECT COUNT (*) AS total FROM siswa';
  
   if (queries.length > 0) {
      sql += ` WHERE ${queries.join(' AND ')}`
    }

    console.log(sql, 'count')

  db.get(sql, params, (err, { total }) => {

    if (err) console.log(err)

    const pages = Math.ceil(total / limit)

    sql = 'SELECT * FROM siswa';


    if (queries.length > 0) {
      sql += ` WHERE ${queries.join(' AND ')}`
    }

    sql += ` LIMIT ? OFFSET ?`
    params.push(limit, offset)

    db.all(sql, params, (err, rows) => {
      if (err) {
        console.log(err)
      
      }
      res.render('table', { rows, query: req.query, pages, page: parseInt(page), url: new URLSearchParams({...req.query, page }).toString() });
    })
  })
});

app.get('/add', (req, res) => {
  res.render('form', { item: {} });
})
app.post('/add', (req, res) => {
  const { name, height, weight, birthdate, isMarried } = req.body
  db.run("INSERT INTO siswa (name, height, weight, birthdate, isMarried) VALUES (?, ?, ?, ?, ?)", [name, height, weight, birthdate, isMarried == "" ? null : JSON.parse(isMarried)], (err) => {
    if (err) {
      console.log("gagal menambah data", err)
    }
    res.redirect('/')
  })
})

app.get('/edit/:id', (req, res) => {
  const id = req.params.id
  db.get("SELECT * FROM siswa WHERE id = ?", [id], (err, item) => {
    if (err) console.log(err)
    res.render('form', { item })
  })
})

app.post('/edit/:id', (req, res) => {
  const id = req.params.id
  const { name, height, weight, birthdate, isMarried } = req.body
  db.run("UPDATE siswa SET name = ?, height = ?, weight = ?, birthdate = ?, isMarried = ? WHERE id = ?",
    [name, height, weight, birthdate, isMarried == "" ? null : JSON.parse(isMarried), id], (err) => {
      if (err) console.log("gagal update data", err)
      res.redirect('/')
    })
})

app.get('/delete/:id', (req, res) => {
  const id = req.params.id
  db.run('DELETE FROM siswa WHERE id = ?', [id], (err) => {
    if (err) console.log(err)
    res.redirect('/')
  })
})

app.listen(3000);