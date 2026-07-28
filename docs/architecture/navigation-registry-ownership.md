# Navigation Registry ownership

The canonical owner for route metadata is `assets/js/core/navigation-registry.js`.

It owns:

- route-to-navigation grouping and active paths;
- page shell metadata;
- safe and native-only navigation policy;
- hydration barriers and direct hydration commits;
- route initializer hooks;
- priority warm routes;
- surface membership for sidebar, drawer and bottom navigation.

Consumers may query the registry, but must not maintain complete route maps. When the registry is unavailable, routers must fall back to native navigation instead of recreating metadata locally.

Validation:

`npm run audit:navigation-registry-ownership`
