import process from "node:process"
import * as dotenv from "dotenv"
import express from "express"
import path from "path"
import { fileURLToPath } from "url"
dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const port = 3000

const app = express()

const render = custom_renderer({ adobe_launch: process.env["ADOBE_LAUNCH_PROPERTY"] })

app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "templates"))
app.use("/", express.static("server/assets"))
app.use("/dist", express.static("dist"))

app.get("/", (req, res) => render(res, "index"))
app.get("/index", (req, res) => res.redirect("/"))
app.get("/about", (req, res) => render(res, "about"))
app.get("/blog", (req, res) => render(res, "blog"))
app.get("/contact", (req, res) => render(res, "contact"))
app.get("/about/product", (req, res) => render(res, "product"))
app.get("/blog/post", (req, res) => render(res, "post"))

app.listen(port, () => {
  console.log(`Development dummy-page listening on http://localhost:${port}`)
})

function custom_renderer(...args) {
  return function (res, path) {
    res.render(path, ...args)
  }
}
