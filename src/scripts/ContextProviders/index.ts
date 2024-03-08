/**
 * Context Providers for Integration points usable by Plugins and various aspects of the Application
 *
 * @module
 */

export class ApplicationIsLockedError extends Error {
  constructor() {
    super(
      'The Application is currently Locked, and will not allow any new Events, Middleware, Stylesheets, Templates, Settings, or Settings Schemas to be Registered.'
    );
  }
}
