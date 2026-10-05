# MyGPASS Client

Angular frontend for the MyGPASS application.

## Prerequisites

- Node.js 22.12 or later and npm 11
- The local ASP.NET Core API and SQL Server setup described in [backend/README.md](../../backend/README.md)

Install the locked dependencies from this directory:

```bash
npm ci
```

## Development server

Start the API from the repository root using the backend setup instructions, then start Angular from this directory:

```bash
npm start
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

Development uses `proxy.conf.json` to forward `/api` requests to `http://localhost:5000`. The production build uses `https://localhost:5001` from `src/environments/environment.ts` as a generic local API example; update it for your own deployment before building for production. No private environment values are included.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
npm run build
```
npm test -- --watch=false
This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
