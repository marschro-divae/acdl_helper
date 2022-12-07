# Plugin - user

## Description
This plugin simply adds a user property to the adobeDataLayer.
It provides properties like `name`, `mcid` and `local_segments`.

In order to use the mcid property (Marketing Cloud Id), the plugin has to be configured with additional Adobe Cloud informations (orgId and trackingserver)

- `name`: user
- `dependencies`: ['launch:loaded']
- `events`: none

## Installation & Config
```javascript
// Example
plugins: [
  user: {
    adobe_org_id: 'your_org_id',
    tracking_server: 'your_tracking_server', // without protocol
    default_name: 'Anonymous'
  }
]

// => result
// adds a user property to the adobeDataLayer and some providers - see below
```

## Providers
```javascript
acdl_helper.user.get() // return user properties
acdl_helper.user.add_segment('Funny Segment') // add segment to 'local_segments' property
acdl_helper.user.remove_segment('Funny Segment') // removes the given segment
acdl_helper.user.clear_segments() // clears all segments

```
