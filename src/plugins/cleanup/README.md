# Plugin - cleanup

## Description
This plugin removes all first-level properties from the adobeDataLayer.
It can be configured to keep some properties and as such get rid of just some unwanted properties that might have been pushed by some other libraries (i.e. usercentrics polutes the adobeDataLayer).


- `name`: cleanup
- `dependencies`: none
- `events`: ['acdl_helper:cleanup']
    - If this event is pushed to the *adobeDataLayer*, the cleanup is triggered

## Installation & Config
```javascript
// Example
plugins: [
  cleanup: {
    keep: ['page', 'components']
  }
]

// => result
// removes all properties from the adobeDataLayer, 
// except of 'page' and 'components', as soon as
// the event 'acdl_helper:cleanup' is pushed to the adobeDataLayer
```

## Providers
none
