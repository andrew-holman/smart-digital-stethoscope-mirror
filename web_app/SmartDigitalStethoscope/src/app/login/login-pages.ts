export const $pages = {
  register: {
    // Register new user page
    title: "Register",
    message:
      "Welcome to Smart Digital Stethoscope. As a registered users you'll get unrestricted access to all the features",
    caption: "Register",
  },
  signIn: {
    // Regular sign-in page
    title: "Sign-in",
    message: "We're glad to see you again. Please sign-in",
    caption: "Sign-in",
  },
  forgotPassword: {
    // Ask for password reset page
    title: "Reset password",
    message: "We'll be sending a link to reset the password to your email",
    caption: "Reset the password",
  },
  /*"resetPassword": {// Reset to a new password page (2nd step after forgotPassword)
      title: 'New password',
      caption: 'Change the password' 
    },*/
  changePassword: {
    // Change the password (while authenticated)
    title: "Change password",
    message: "Please confirm by re-authenticating",
    caption: "Change your password",
  },
  changeEmail: {
    // Change the email
    title: "Change email",
    message: "Please confirm by re-authenticating",
    caption: "Change your email",
  },
  delete: {
    // Delete the user account
    title: "Delete account",
    message:
      "WARNING! Confirmimg with your password the account will be permanently deleted",
    caption: "delete the account",
  },
};
