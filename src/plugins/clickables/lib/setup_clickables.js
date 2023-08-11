export default function setup_clickables(context) {
  return function (args) {
    const { selector = null, event_name = "cmp:click", delay = 0 } = args

    const link_click_delay = function (event, element) {
      if (!element.href) {
        return
      }

      if (delay !== 0) {
        event.preventDefault()
      }

      const dataLayer = parseDataLayer(element)

      if (!dataLayer) {
        window.location = element.href
        return
      }

      context.acdl.push({
        event: event_name,
        eventInfo: { path: `component.${Object.keys(dataLayer)[0]}` },
      })

      if (delay !== null) {
        setTimeout(function () {
          window.location = element.href
        }, delay)
      }
    }

    addCustomEventListener(selector, "click", link_click_delay)
    context.logger.success(`Register event "${event_name}" with delay ${delay}`)
  }
}

function addCustomEventListener(selector, event, fn) {
  const rootElement = document.querySelector("body")
  rootElement.addEventListener(
    event,
    function (e) {
      const targetElement = e.target.matches(selector) ? e.target : e.target.closest(selector)
      if (targetElement) fn(e, targetElement)
    },
    true
  )
}

function parseDataLayer(element) {
  const parseJSON = (maybeJson) => {
    try {
      return JSON.parse(maybeJson)
    } catch (err) {
      return undefined
    }
  }
  return element?.dataset?.cmpDataLayer ? parseJSON(element.dataset.cmpDataLayer) : undefined
}
