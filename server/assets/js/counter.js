const template = document.createElement("template")
template.innerHTML = `
  <style>
    * {
      font-size: 100%;
      font-family: sans-serif;
    }
    .wrapper {
      border: 0px solid #000;
      background-color: #F2F2F3;
      border-radius: 10px;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 4px 0;
    }

    span {
      width: 4rem;
      display: inline-block;
      text-align: center;
    }

    button {
      width: 1.5rem;
      height: 1.5rem;
      border: none;
      border-radius: 4px;
      background-color: seagreen;
      color: white;
    }
  </style>
  <div class="wrapper">
    <button id="dec">-</button>
    <span id="count"></span>
    <button id="inc">+</button>
  </div>`

class MyCounter extends HTMLElement {
  constructor() {
    super()
    this.count = 0
    this.attachShadow({ mode: "open" })
  }

  connectedCallback() {
    this.shadowRoot.appendChild(template.content.cloneNode(true))
    this.shadowRoot.getElementById("inc").onclick = () => this.inc()
    this.shadowRoot.getElementById("dec").onclick = () => this.dec()
    this.update(this.count)
    this.product = this.getAttribute("product")
    this.id = `${this.product.toLowerCase()}-counter`
  }

  inc() {
    this.update(++this.count)
    this.track("increment", this.count)
  }

  dec() {
    this.update(--this.count)
    this.track("decrement", this.count)
  }

  update(count) {
    this.shadowRoot.getElementById("count").innerHTML = count
  }

  track(action, count) {
    window.adobeDataLayer = window.adobeDataLayer || []
    window.adobeDataLayer.push({
      event: action,
      eventInfo: { reference: `component.${this.id}` },
      component: { [this.id]: { count, product: this.product } },
    })
  }
}

customElements.define("my-counter", MyCounter)
