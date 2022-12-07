import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const port = 3000

const app = express()

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'templates'))
app.use('/', express.static('server/assets'))
app.use('/dist', express.static('dist'))

app.get('/', (req, res) => res.render('index'))
app.get('/index', (req, res) => res.redirect('/'))
app.get('/about', (req, res) => res.render('about'))
app.get('/blog', (req, res) => res.render('blog'))
app.get('/contact', (req, res) => res.render('contact'))
app.get('/about/product', (req, res) => res.render('product'))
app.get('/blog/post', (req, res) => res.render('post'))

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})