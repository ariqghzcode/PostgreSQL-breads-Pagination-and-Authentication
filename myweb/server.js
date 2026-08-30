const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data.db');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const path = require('path');

const app = express();

app.set('view engine', 'ejs');

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded())

// parse application/json
app.use(bodyParser.json())

app.use(express.static('public'));

app.use(fileUpload());

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
  if (req.query.height) {
    queries.push('height = ?')
    params.push(parseFloat(req.query.height))
  }

  if (req.query.weight) {
    queries.push('weight = ?')
    params.push(parseFloat(req.query.weight))
  }
  if (req.query.startdate && req.query.enddate) {
    queries.push('birthdate BETWEEN ? AND ?')
    params.push(req.query.startdate, req.query.enddate)
  } else if (req.query.startdate) {
    queries.push('birthdate >= ?')
    params.push(req.query.startdate)
  } else if (req.query.enddate) {
    queries.push('birthdate <= ?')
    params.push(req.query.enddate)
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
      res.render('table', { rows, query: req.query, pages, page: parseInt(page), url: new URLSearchParams({ ...req.query, page }).toString() });
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

app.get('/upload/:id', (req, res) => {
  res.render('upload')
} )

app.post('/upload/:id', function(req, res) {
  const id = req.params.id;

  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
  let avatar = req.files.avatar;
  let filename = `${Date.now()}-${avatar.name}`;
  let uploadPath = path.join(__dirname, 'public', 'avatars', filename); 

  console.log(uploadPath)
  avatar.mv(uploadPath, function(err) {
    if (err) return res.status(500).send(err);
    db.run('UPDATE siswa SET avatar = ? WHERE id = ?', [filename, id], (err) => {
      if (err) console.log(err)
        res.redirect('/');
    }) 
  });
});

app.listen(3000);