/**
 * Core helpers link_type() and family() (src/core/lib/link.js) — pure functions, configuration is passed in.
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { link_type, family } from "../src/core/lib/link.js"

const OPTS = {
  current_host: "www.frankfurt-airport.com",
  partner_hosts: ["https://map.frankfurt-airport.com", "shop.frankfurt-airport.com", "https://www.fraport.com/de.html"],
}

const LINKS = [
  ["mailto:info@example.com", "mailto"],
  ["MAILTO:info@example.com", "mailto"],
  ["tel:+49 69 6900", "tel"],
  ["/en/parking.html", "internal"],
  ["en/parking.html", "internal"],
  ["#section", "internal"],
  ["?q=1", "internal"],
  ["https://www.frankfurt-airport.com/en/parking.html", "internal"],
  ["HTTPS://WWW.FRANKFURT-AIRPORT.COM/en", "internal"],
  ["//www.frankfurt-airport.com/en", "internal"],
  ["/content/dam/site/map.pdf", "download"],
  ["https://www.frankfurt-airport.com/content/dam/site/map.pdf", "download"],
  ["/content/dam/site/map.pdf/_jcr_content/renditions/original./map.pdf", "download"],
  ["https://other-aem.example.com/content/dam/x.pdf", "external"],
  ["https://map.frankfurt-airport.com/terminal-1", "partner"],
  ["https://shop.frankfurt-airport.com", "partner"],
  ["https://www.fraport.com/en.html", "partner"],
  ["https://www.bahn.de", "external"],
  ["http://frankfurt-airport.com/en", "external"],
  ["https://evil.com/?r=https://www.frankfurt-airport.com", "external"],
  ["javascript:void(0)", "other"],
  ["whatsapp://send?text=x", "other"],
]

for (const [url, expected] of LINKS) {
  test(`link_type(${JSON.stringify(url)}) → ${expected}`, () => {
    assert.equal(link_type(url, OPTS), expected)
  })
}

test("link_type: empty / missing / non-string → undefined (property omitted)", () => {
  for (const url of [undefined, null, "", "   ", 5, {}]) assert.equal(link_type(url, OPTS), undefined)
})

test("link_type: unparseable absolute URL → undefined", () => {
  assert.equal(link_type("https://", OPTS), undefined)
})

test("link_type: no partner_hosts → sister sites are external", () => {
  assert.equal(link_type("https://map.frankfurt-airport.com", { current_host: OPTS.current_host }), "external")
})

test("link_type: invalid partner_hosts entries are ignored", () => {
  assert.equal(
    link_type("https://map.frankfurt-airport.com", { ...OPTS, partner_hosts: [null, 5, "", "https://"] }),
    "external"
  )
})

test("link_type: current_host defaults to location.hostname", () => {
  globalThis.location = { hostname: "www.frankfurt-airport.com" }
  try {
    assert.equal(link_type("https://www.frankfurt-airport.com/x"), "internal")
  } finally {
    delete globalThis.location
  }
})

const FAMILIES = [
  ["*/contentTeaser/*", "teaser"],
  ["*/promotionteaser/*", "teaser"],
  ["*/text/*", "rich_text"],
]

test("family: first matching pattern wins", () => {
  assert.equal(family("site/components/contentTeaser/contentTeaserItem/link", FAMILIES), "teaser")
  assert.equal(family("site/components/text/richtext-link", FAMILIES), "rich_text")
})

test("family: accepts a node and reads its @type", () => {
  assert.equal(family({ "@type": "site/components/promotionteaser/item/link" }, FAMILIES), "teaser")
})

test("family: no match / no type / no families → 'other'", () => {
  assert.equal(family("site/components/footer/link", FAMILIES), "other")
  assert.equal(family({}, FAMILIES), "other")
  assert.equal(family(undefined, FAMILIES), "other")
  assert.equal(family("site/components/text/x"), "other")
})

test("family: invalid entries are skipped", () => {
  assert.equal(family("site/components/text/x", [null, ["*/text/*"], [5, "x"], ["*/text/*", "rich_text"]]), "rich_text")
})
