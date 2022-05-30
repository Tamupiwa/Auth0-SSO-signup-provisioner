# Auth0-SSO-invite-provisioner
Auth0 Post login Actions script that prevents automatic signups from external Identity Providers (Google, Azure AD etc) unless 
the user has an existing auth0 account. The script automatically deletes the newly created identity if there is not an
existing (username-password) user with the same email in auth0 and automatically links an existing user with the IDP identity.

This implementation can be tested using the 'webtask log' extension and running it in the actions sandbox.

Note: When a successful login occurs, the users auth0 app/user metadata will not be available
until the next login since the script is technically executed post login when the prelinked IDP idenity has already logged in. 

## Requirements
- Auth0 management API (auth0@2.40.0) must be in the auth0 actions dependency tab 
- Auth0 client must be setup with the user read, delete and link permissions
- Auth0 client secret and client ID must be set up in the actions secrets tab
- User linking extension should be disbabled as it is done automatically in the script
