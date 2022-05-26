/*
log statements are included and can be viewed in the auth0 webtask log extension for testing

* Handler that will be called during the execution of a PostLogin flow.
*
* @param {Event} event - Details about the user and the context in which they are logging in.
* @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
*/
exports.onExecutePostLogin = async (event, api) => {
//urls to your 403/500 error pages
var error500Url = 'Your 500 error page';
var error403Url = 'Your 403 error page';
//array of your configured enterprise connection names
configuredEntepriseConnections = 'Your connections'
    
const ManagementClient = require('auth0').ManagementClient;
const management = new ManagementClient({
  domain: event.secrets.domain,
  clientId: event.secrets.clientId,
  clientSecret: event.secrets.clientSecret,
});

/** If IDP doesnt return a users email with the claim token throw an error message */
if (event.user.email === undefined) {
  api.access.deny("Email from IDP not found.");
  //delete IDP user from auth0
  management.deleteUser({ "id": event.user.user_id }, function (err) {
    if (err){
      api.redirect.sendUserTo(internalErrorUrl);
      return;
    }
      // User deleted.
    else {
        console.log('Access denied (IDP email undefined)- auth0 user/identity deleted.');
        api.redirect.sendUserTo(unauthorizedUrl);
        }
    });
}
else {
  //check to see if IDP user with email exists in auth0 already
  management.users.getByEmail(event.user.email, function (userError, users) {
  if (userError || users === undefined || users.length == 0){
    api.access.deny('Internal Server error');
    if (userError){
        api.redirect.sendUserTo(error500Url);
    }
    //delete IDP created user in auth0
    management.deleteUser({ "id": event.user.user_id }, function (deleteError) {
      if (deleteError){
        api.redirect.sendUserTo(error500Url);
      }
      else {
        console.log('access denied (user not found)- auth0 user/identity deleted');
        api.redirect.sendUserTo(error403Url);
        }
        // User deleted.
    });
  }
  else {
    //get auth0 identity user
    let user = users.find(item => item.user_id.includes('auth0|') )
    //if an auth0 account with password authentication connection is present then user was either invited or is an existing user
    let isInvitedOrExistingUser = user.identities.some(e => e.provider === "auth0" && e.connection == "Username-Password-Authentication");
    // returns array of all enabled enterprise SSO connections
    let allSSOConnections = configuredEntepriseConnections;
    // checks to see if the Azure/Google SSO connection was used for this login
    let isSSOLogin = allSSOConnections.includes(event.connection.name);

    /** if user has been invited  link their account (auth0 identity) with their new SSO identity created account 
    and maintain the auth0 identity as the primary account */
    if (isSSOLogin && isInvitedOrExistingUser) {
      /** get a list of existing SSO identities/connections for the existing user */
      let userConnections = user.identities.map(identity => identity.connection);
      /** if the account created by SSO connection is not already linked to the auth0 user
      * link it and return the auth0 user as the primary user without invoking link account dialogue*/
      if (!userConnections.includes(event.connection.name)){
          var userId = user.user_id;
          var params = {
            "user_id": event.user.user_id,
            "connection_id": event.connection.id,
            "provider": event.connection.strategy
          };
          management.linkUsers(userId, params, function (err, newUser) {
          if (err) {
            api.access.deny("Whoops, there was an error please try again later.");
            api.redirect.sendUserTo(error500Url);
            console.log('linking error:', err)
            return;
          }
          else {
            console.log('Login successfull (SSO - with account link)');
            console.log('Connection:', event.connection.name);
            console.log(newUser);
            return;
          }
          });
      }
      else {
        console.log('login successfull (SSO)');
        console.log('Connection:', event.connection.name);
        console.log(user);
        return;
      }
      
    }
    else {
      console.log ('Login successfull (username-password)');
      console.log('Connection:', event.connection.name);
      console.log(user);
      return;
    }
  }
});
}
};


/**
* Handler that will be invoked when this action is resuming after an external redirect. If your
* onExecutePostLogin function does not perform a redirect, this function can be safely ignored.
*
* @param {Event} event - Details about the user and the context in which they are logging in.
* @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
*/
// exports.onContinuePostLogin = async (event, api) => {
// };
