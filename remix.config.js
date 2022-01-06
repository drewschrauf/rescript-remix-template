const fs = require('fs');
const path = require('path');

/**
 * @type {import('@remix-run/dev/config').AppConfig}
 */
module.exports = {
  appDirectory: "app",
  assetsBuildDirectory: "public/build",
  publicPath: "/build/",
  serverBuildDirectory: "build",
  devServerPort: 8002,
  ignoredRouteFiles: [".*", "*.res"],
  transpileModules: ["rescript"],
  routes: (defineRoutes) => {
    const buildRoutes = (dir) => {
      const routes = {};

      const files = fs.readdirSync(path.join('app', dir));

      for (const file of files) {
        const fileStats = fs.statSync(path.join('app', dir, file));
        const filename = path.parse(file).name;

        let routeSegment = filename.match(/([^_]+?)$/)[1];
        routeSegment = routeSegment.replace(/\[([^\]]+?)\]/g, ':$1');
        if (routeSegment === "index") routeSegment = "";

        const routeMapping = routes[routeSegment] ?? {};

        if (fileStats.isDirectory()) {
          routes[routeSegment] = {...routeMapping, nested: buildRoutes(path.join(dir, file))};
        } else if (path.extname(file) === '.js') {
          routes[routeSegment] = {...routeMapping, parent: path.join(dir, file)};
        }
      }

      return routes;
    }

    const routes = buildRoutes('reroutes');
    console.log(routes)

    return defineRoutes(route => {
      const registerRoutes = (routes, parentSegments = []) => {
        for (const segment in routes) {
          const {parent, nested} = routes[segment];

          if (parent && !nested) {
            route([...parentSegments, segment].join('/'), parent, { index: true});
          } else if(!parent && nested) {
            registerRoutes(nested, [...parentSegments, segment])
          } else {
            route([...parentSegments, segment].join('/'), parent, () => {
              registerRoutes(nested);
            })
          }
        }
      }
      registerRoutes(routes);
    });
  }
};
