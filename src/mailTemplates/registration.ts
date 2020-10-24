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
      <p>Welcome to Hypersign!</p>
      <p></p>
      <p class='colored'>Please click on this link or scan the QR code (attached with this email) to get the Hypersign Auth Credential to be able to login into websites that supports Hypersign login. This link will expired in 15 minutes.</p>
      <p><a href="@@LINK@@" target="_blank">Link to download HypersignAuth Credential</a></p>
      <p></p>
      <p><img alt="Logo" title="Logo" style="display:block" src="@@QRURL@@"></p>
      <p>Thanks & Regards,</p>
      <p>Team Hypersign!</p>
    </div>
  </body>
</html>
`
export default template