/* Deprecated compatibility alias.
   Professional setup is now owned by professional-profiles-repository.js. */
(function () {
  'use strict';
  var Doke = window.Doke || (window.Doke = {});
  var repositories = Doke.repositories || (Doke.repositories = {});
  if (repositories.professionalProfiles) repositories.professionalApplications = repositories.professionalProfiles;
})();
