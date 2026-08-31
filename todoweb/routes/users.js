var express = require('express');
var router = express.Router();
const moment = require('moment')
const path = require('path');

module.exports = function(db){

router.get('/', (req, res) => {
  const page = req.query.page || 1
  const limit = 2
  const offset = (page - 1) * limit

  const queries = []
  const params = []

  if (req.query.name) {
    params.push(req.query.name)
    queries.push(`name like '%' || $${params.length} || '%'`)
    
  }
  if (req.query.height) {
    params.push(parseFloat(req.query.height))
    queries.push(`height = $${params.length}`)
  }

  if (req.query.weight) {
    params.push(parseFloat(req.query.weight))
    queries.push(`weight = $${params.length}`)
  }
  if (req.query.startdate && req.query.enddate) {
    params.push(req.query.startdate, req.query.enddate)
    queries.push(`birthdate BETWEEN $${params.length} AND $${params.length}`)
    
  } else if (req.query.startdate) {
    params.push(req.query.startdate)
    queries.push(`birthdate >= $${params.length}`)
    
  } else if (req.query.enddate) {
    params.push(req.query.enddate)
    queries.push(`birthdate <= $${params.length}`)
    
  }

  if (req.query.ismarried) {
    params.push(JSON.parse(req.query.ismarried))
    queries.push(`ismarried = $${params.length}`)
  }

  let sql = 'SELECT COUNT(*) AS total FROM siswa';

  if (queries.length > 0) {
    sql += ` WHERE ${queries.join(' AND ')}`
  }

  console.log(sql, 'count')

  db.query(sql, params, (err, data ) => {


    if (err) console.log(err)


    const pages = Math.ceil(data.rows[0].total / limit)

    sql = 'SELECT * FROM siswa';


    if (queries.length > 0) {
      sql += ` WHERE ${queries.join(' AND ')}`
    }

    params.push(limit, offset)
    sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`

    console.log(sql)
    db.query(sql, params, (err, data) => {
      if (err) {
        console.log(err)
      }
      res.render('users/table', { moment, rows: data.rows, query: req.query, pages, page: parseInt(page), url: new URLSearchParams({ ...req.query, page }).toString() });
    })
  })
});

router.get('/add', (req, res) => {
  res.render('users/form', { item: {} });
})
router.post('/add', (req, res) => {
  const { name, height, weight, birthdate, ismarried } = req.body
  db.query("INSERT INTO siswa (name, height, weight, birthdate, ismarried) VALUES ($1, $2, $3, $4, $5)", [name, height, weight, birthdate, ismarried == "" ? null : JSON.parse(ismarried)], (err) => {
    if (err) {
      console.log("gagal menambah data", err)
    }
    res.redirect('/users')
  })
})

router.get('/edit/:id', (req, res) => {
  const id = req.params.id
  db.query("SELECT * FROM siswa WHERE id = $1", [id], (err, data) => {
    if (err) console.log(err)
    res.render('users/form', { moment, item: data.rows[0] })
  })
})

router.post('/edit/:id', (req, res) => {
  const id = req.params.id
  const { name, height, weight, birthdate, ismarried } = req.body
  db.query("UPDATE siswa SET name = $1, height = $2, weight = $3, birthdate = $4, ismarried = $5 WHERE id = $6",
    [name, height, weight, birthdate, ismarried == "" ? null : JSON.parse(ismarried), id], (err) => {
      if (err) console.log("gagal update data", err)
      res.redirect('/users')
    })
})

router.get('/delete/:id', (req, res) => {
  const id = req.params.id
  db.query('DELETE FROM siswa WHERE id = $1', [id], (err) => {
    if (err) console.log(err)
    res.redirect('/users')
  })
})

router.get('/upload/:id', (req, res) => {
  res.render('users/upload')
} )

router.post('/upload/:id', function(req, res) {
  const id = req.params.id;

  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  let avatar = req.files.avatar;
  let filename = `${Date.now()}-${avatar.name}`;
  let uploadPath = path.join(__dirname, '..', 'public', 'images', 'avatars', filename); 

  console.log(uploadPath)
  avatar.mv(uploadPath, function(err) {
    if (err) return res.status(500).send(err);
    db.query('UPDATE siswa SET avatar = $1 WHERE id = $2', [filename, id], (err) => {
      if (err) console.log(err)
        res.redirect('/users');
    }) 
  });
});

return router;

};
