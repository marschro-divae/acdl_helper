# Plugin - component

## Description
Easifies the way to get whole state from a single 'core-component' (resides in adobeDatLayer.component) or only one single property.


- `name`: component
- `dependencies`: ['cmp:loaded']
- `events`: []

## Installation & Config
```javascript
// Example
plugins: [
  components: {}
]

// => result
// no special config needed
```

## Providers
```javascript
acdl_helper.component.get('header-hero-cta-929ccdje39') // return component state of this component if exists. Otherwise returns undefined
acdl_helper.component.get('header-hero-cta-929ccdje39', 'dc:title') // return given component property of this component if somponent and property exists. Otherwise returns undefined
```
