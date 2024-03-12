All commands are from the root of the repository.

# Dependencies 
1. Install Node.js (https://nodejs.org/en/download)
2. Run `npm install` (for `kaltura-client`)

# Usage
macOS and Linux:
```
KALTURA_PARTNER_ID=******* KALTURA_ADMIN_SECRET=******************************** node create-app-token.mjs
```

Windows CMD:
```
set KALTURA_PARTNER_ID=*******
set KALTURA_ADMIN_SECRET=********************************
node create-app-token.mjs
```

Windows PowerShell:
```
$env:KALTURA_PARTNER_ID="*******"
$env:KALTURA_ADMIN_SECRET="********************************"
node create-app-token.mjs
```