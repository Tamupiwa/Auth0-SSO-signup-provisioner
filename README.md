# Auth0-SSO-invite-provisioner
Auth0 Post login Actions script that prevents automatic signups from external Identity Providers (google, azure etc) unless the user has an existing auth0 account.
The script automatically deletes the newly created idenity if there is not an existing (username-password) user with the same email in auth0. 

If an existing user
exists, it automatically links them with the new IDP identity and keeps the existing auth0 user as the primary identity (Note: this may not be secure depending on your use case)

This implementation can be tested using the 'webtask log' extension and running it in the actions sandbox.

#Requirements
- Auth0 management API (auth0@2.40.0) must be in the auth0 actions dependency tab 
- Read and Delete permissions for users must be enabled for the registered auth0 client
- User linking extension should be disbabled as it is done automatically in the script
