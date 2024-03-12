import kaltura from "kaltura-client";

const getEnvsOrFail = (envs) => {
  const missingEnvs = envs.filter((env) => !process.env[env]);
  if (missingEnvs.length > 0) {
    throw new Error(`Missing environment variables: ${missingEnvs.join(", ")}`);
  }
  return envs.map((env) => process.env[env]);
};

const run = async () => {
  const [adminSecret, partnerId] = getEnvsOrFail([
    "KALTURA_ADMIN_SECRET",
    "KALTURA_PARTNER_ID"
  ]);
  
  const config = new kaltura.Configuration();
  config.serviceUrl = 'https://www.kaltura.com';
  const client = new kaltura.Client(config);
  
  // don't leak secrets on stdout
  client.shouldLog = false;
  
  const ks = await kaltura.services.session.start(
    adminSecret,
    "",
    kaltura.enums.SessionType.ADMIN,
    partnerId,
    86400,
    "privacycontext:echolabs" // So we can verify the existance of the category
  ).execute(client);
  client.setKs(ks);
  
  // Verify existance of the echo labs category
  const categoriesFilter = new kaltura.objects.CategoryFilter();
  categoriesFilter.privacyContextEqual = "echolabs";
  const categoriesPager = new kaltura.objects.FilterPager();
  
  const categoriesResult = await kaltura.services.category.listAction(categoriesFilter, categoriesPager).execute(client);
  const echoLabsCategoryId = categoriesResult?.objects[0]?.id;
  if (!echoLabsCategoryId) {
    console.error('Category with privacy context "echolabs" not found. Please create one in KMC.');
    process.exit(1);
  }
  
  // Create a new user role to enable access to the captionAsset service
  let echoLabsRoleId;
  const rolePermissions = "CONTENT_MANAGE_BASE,CAPTION_MODIFY";
  try {
    const userRole = new kaltura.objects.UserRole();
    userRole.description = "Echo Labs Integration";
    userRole.name = "Echo Labs Integration";
    userRole.permissionNames = rolePermissions;
    userRole.status = kaltura.enums.UserRoleStatus.ACTIVE;
    const userRoleRes = await kaltura.services.userRole.add(userRole)
      .execute(client);
    echoLabsRoleId = userRoleRes.id;
  } catch (err) {
    if (err.code === "ROLE_NAME_ALREADY_EXISTS") {
      const filter = new kaltura.objects.UserRoleFilter();
      filter.nameEqual = "Echo Labs Integration";
      const pager = new kaltura.objects.FilterPager();
      
      const userRoleRes = await kaltura.services.userRole.listAction(filter, pager)
        .execute(client);
      const existingPermissions = userRoleRes.objects[0].permissionNames;
      if (existingPermissions !== rolePermissions) {
        throw new Error(`Role "Echo Labs Integration" has invalid permissions. Required: "${rolePermissions}", found: "${existingPermissions}"`);
      }
      echoLabsRoleId = userRoleRes.objects[0].id;
    }
  }
  
  // Create the application token
  let appToken = new kaltura.objects.AppToken();
  appToken.description = "Echo Labs App Token";
  appToken.expiry = Math.floor(Date.now() / 1000) + (60*60*24*365*10); // 10 years
  appToken.hashType = kaltura.enums.AppTokenHashType.SHA256;
  appToken.sessionType = kaltura.enums.SessionType.USER;
  appToken.sessionPrivileges = `list:*,edit:*,setrole:${echoLabsRoleId},privacycontext:echolabs`;
  const appTokenRes = await kaltura.services.appToken.add(appToken)
    .execute(client);
  console.log(`Application Token ID: ${appTokenRes.id}`);
  console.log(`Application Token: ${appTokenRes.token}`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
