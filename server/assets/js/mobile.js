window.onload = function () {
  const getNavi = document.getElementById("navigation")

  const mobile = document.createElement("span")
  mobile.setAttribute("id", "mobile-navigation")
  getNavi.parentNode.insertBefore(mobile, getNavi)

  document.getElementById("mobile-navigation").onclick = function () {
    const a = getNavi.getAttribute("style")
    if (a) {
      getNavi.removeAttribute("style")
      document.getElementById("mobile-navigation").style.backgroundImage = "url(images/mobile/mobile-menu.png)"
    } else {
      getNavi.style.display = "block"
      document.getElementById("mobile-navigation").style.backgroundImage = "url(images/mobile/mobile-close.png)"
    }
  }
  const getElm = getNavi.getElementsByTagName("LI")
  for (var i = 0; i < getElm.length; i++) {
    if (getElm[i].children.length > 1) {
      var smenu = document.createElement("span")
      smenu.setAttribute("class", "mobile-submenu")
      smenu.setAttribute("OnClick", "submenu(" + i + ")")
      getElm[i].appendChild(smenu)
    }
  }
  submenu = function (i) {
    const sub = getElm[i].children[1]
    const b = sub.getAttribute("style")
    if (b) {
      sub.removeAttribute("style")
      getElm[i].lastChild.style.backgroundImage = "url(images/mobile/mobile-expand.png)"
      getElm[i].lastChild.style.backgroundColor = "rgba(121, 101, 102, 0.91)"
    } else {
      sub.style.display = "block"
      getElm[i].lastChild.style.backgroundImage = "url(images/mobile/mobile-collapse.png)"
      getElm[i].lastChild.style.backgroundColor = "rgba(204, 60, 104, 0.91)"
    }
  }
  window.adobeDataLayer = window.adobeDataLayer || []
  window.adobeDataLayer.push({ event: "app:loaded" })

  setTimeout(() => {
    window.adobeDataLayer = window.adobeDataLayer || []
    window.adobeDataLayer.push({ event: "user:loaded" })
  }, 2500)
}
