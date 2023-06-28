# Plugin - clickables

## Description

You know the data attribute `data-cmp-clickable` that can be added to elements, that should push an event `cmp:click` to the adobeDataLayer?

With this extension, you are not anymore limited to one single attribute and event. You can register additional attributes and events and even configure a click-delay in order to send your analytics data before page is unloaded.

For example you can add a data-attribute like `data-cmp-clickable-link` to your component, whiches behaviour you can then control with this plugin (see example below).

- `name`: clickables
- `dependencies`: none
- `events`: none

## Installation & Config

```javascript
// Example
plugins: [
  clickables: {
    register: [
      { selector: '[data-cmp-clickable-link]', event_name: 'cmp:link_click', delay: 200 },
      { selector: '[data-cmp-clickable-cta]', event_name: 'cmp:cta_click', delay: 200 }
    ]
  }
]

// => result
// if the user clicks on components, with the data-attribute 'data-cmp-clickable-link'
// the event 'cmp:link_click' is pushed to the adobeDataLayer and a link execution delay
// of 200 ms is applied.
```

## Providers

none
