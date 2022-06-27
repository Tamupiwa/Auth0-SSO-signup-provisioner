/*
  
  The following disables SSO logins/signups for users without an existing account/invite.
  It checks if user exists in auth0 with Username-Password-Authentication connection 
 (this means they were created via an invite by admin was an onboarded admin). 
 
 NOTE: To significantly improve login speeds it is advised to replace the allSSOConnectins call 
 with a hard coded array of the names of all your configured connections instead
 
 WARNING: The following code is run for after every auth0 login in the actions post-login script and includes 
 logic that can delete accounts so it should be changed cautiously. 

log statements are included and can be viewed in the auth0 webtask log extension for testing

* Handler that will be called during the execution of a PostLogin flow.
*
* @param {Event} event - Details about the user and the context in which they are logging in.
* @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
*/
exports.onExecutePostLogin = async (event, api) => {

  const ManagementClient = require('auth0').ManagementClient;
  const management = new ManagementClient({
    domain: event.secrets.domain,
    clientId: event.secrets.clientId,
    clientSecret: event.secrets.clientSecret,
  });
  
  /** triggered if Identity Provider doesnt return a users email with the claim token throw an error message */
  if (event.user.email === undefined) {
    let resp = await management.deleteUser({ "id": event.user.user_id });
    if (resp.error){
      console.log('Failed to delete unauthorized SSO auth0 user');
    }
    // User deleted.
    else { console.log('Access denied (IDP email undefined)- auth0 user/identity deleted.');}
    api.access.deny(`Identity provider did not provide an email.`);
  }
  else {
    let resp = await management.users.getByEmail(event.user.email);
    if (resp.error || resp.length == 0){
      //delete IDP created user in auth0
      let delResp = await management.deleteUser({ "id": event.user.user_id });
      if (delResp.error){
        api.access.deny("Whoops, there was an error please try again later.");
      }
      else {
        console.log('access denied (user not found)- auth0 user/identity deleted');
        api.access.deny(`Invalid or incorrect login credentials. Either register for Insight or request an invite from organization's administrator.`);
        }
    }
    else {
      //get auth0 identity user (since this login has created multiple users with the same email)
      var user = resp.find(item => item.user_id.includes('auth0|') );
      console.log(user);
      //if an auth0 account with password authentication connection is present then user was either invited or is an existing user
      //since there is no other way for accounts to be created. (admin accounts are created manually, and invitee accounts are created when invite link is clicked
      let isInvitedOrExistingUser = user.identities.some(e => e.provider === "auth0" && e.connection == "Username-Password-Authentication");
      // returns array of all enabled enterprise SSO connections
      let connections = await management.getConnections();
      let allSSOConnections = connections.filter(connection.name)
      // checks to see if the Azure/Google/SSO connection was used for this login
      let isSSOLogin = allSSOConnections.includes(event.connection.name);

      /** if user has been invited (exists in the db) link their account (auth0 identity) with their new SSO identity created account 
      and maintain the auth0 identity as the primary account */
      if (isSSOLogin && isInvitedOrExistingUser) {
        /** get a list of existing SSO identities/connections for the existing user */
        let userConnections = user.identities.map(identity => identity.connection);
        /** if the account created by SSO connection is not already linked to the auth0 user
        * link it and return the auth0 user as the primary user without invoking link account dialogue*/
        if (!userConnections.includes(event.connection.name)){
            let userId = user.user_id;
            let params = {
              "user_id": event.user.user_id,
              "connection_id": event.connection.id,
              "provider": event.connection.strategy
            };
            let resp = await management.linkUsers(userId, params);
            if (resp.error) {
               // disabled - default optional account link popup extension is being used until this automatic linking is fixed
              api.access.deny("Whoops, there was an error please try again later.");
              console.log('linking error:', resp.error);
            }
            else {
              console.log('Login successfull (SSO - with account link)');
              console.log('Connection:', event.connection.name);
            }
        }
        else {
          console.log('login successfull (SSO)');
          console.log('Connection:', event.connection.name);
          console.log(user);
        }
        
      }
      else {
        console.log ('Login successfull (username-password)');
        console.log('Connection:', event.connection.name);
        console.log(user);
      }
    }
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
  
