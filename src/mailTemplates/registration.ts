const template =    
`
<html>
  <head>
    <style>
      .colored {
        color: blue;
      }
      #body {
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <div id='body'>
      <p>Hi @@RECEIVERNAME@@,</p>
      <p>Welcome to Superhero!</p>
      <p></p>
      <p class='colored'>Please click on this link or scan the QR code to get the Superhero Auth Credential to be able to login into websites that supports Superhero login. This link will expired in 15 minutes.</p>
      <p><a href="@@LINK@@" target="_blank">Link to download SuperheroAuth Credential</a></p>
      <p></p>
      <p><img alt="Logo" title="Logo" style="display:block" src="@@QRURL@@"></p>
      <p>Thanks & Regards,</p>
      <p>Team Superhero!</p>
    </div>
  </body>
</html>
`
export default template