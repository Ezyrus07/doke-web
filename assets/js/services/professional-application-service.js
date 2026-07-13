/* Deprecated compatibility alias.
   Professional setup is now owned by professional-profile-setup-service.js. */
(function () {
  'use strict';
  var Doke = window.Doke || (window.Doke = {});
  var services = Doke.services || (Doke.services = {});
  if (services.professionalProfileSetup) services.professionalApplications = services.professionalProfileSetup;
})();
