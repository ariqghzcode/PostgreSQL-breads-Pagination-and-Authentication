var express = require('express');
var router = express.Router();

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

  if (req.query.isMarried) {
    params.push(JSON.parse(req.query.isMarried))
    queries.push(`isMarried = $${params.length}`)
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
      res.render('users/table', { rows: data.rows, query: req.query, pages, page: parseInt(page), url: new URLSearchParams({ ...req.query, page }).toString() });
    })
  })
});

router.get('/add', (req, res) => {
  res.render('users/form', { item: {} });
})
router.post('/add', (req, res) => {
  const { name, height, weight, birthdate, isMarried } = req.body
  db.run("INSERT INTO siswa (name, height, weight, birthdate, isMarried) VALUES (?, ?, ?, ?, ?)", [name, height, weight, birthdate, isMarried == "" ? null : JSON.parse(isMarried)], (err) => {
    if (err) {
      console.log("gagal menambah data", err)
    }
    res.redirect('/')
  })
})

router.get('/edit/:id', (req, res) => {
  const id = req.params.id
  db.get("SELECT * FROM siswa WHERE id = ?", [id], (err, item) => {
    if (err) console.log(err)
    res.render('users/form', { item })
  })
})

router.post('/edit/:id', (req, res) => {
  const id = req.params.id
  const { name, height, weight, birthdate, isMarried } = req.body
  db.run("UPDATE siswa SET name = ?, height = ?, weight = ?, birthdate = ?, isMarried = ? WHERE id = ?",
    [name, height, weight, birthdate, isMarried == "" ? null : JSON.parse(isMarried), id], (err) => {
      if (err) console.log("gagal update data", err)
      res.redirect('/')
    })
})

router.get('/delete/:id', (req, res) => {
  const id = req.params.id
  db.run('DELETE FROM siswa WHERE id = ?', [id], (err) => {
    if (err) console.log(err)
    res.redirect('/')
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

return router;

};
