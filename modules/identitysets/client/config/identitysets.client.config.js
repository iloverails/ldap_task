'use strict';

// Configuring the Identitysets module
angular.module('identitysets').run(['Menus',
  function (Menus) {
    // Add the identitysets dropdown item
    Menus.addMenuItem('topbar', {
      title: 'Identity Sets',
      state: 'identitysets',
      type: 'dropdown',
      roles: ['*']
    });

    // Add the dropdown list item
    Menus.addSubMenuItem('topbar', 'identitysets', {
      title: 'List Identity Sets',
      state: 'identitysets.list'
    });

    // Add the dropdown create item
    Menus.addSubMenuItem('topbar', 'identitysets', {
      title: 'Create identitysets',
      state: 'identitysets.create',
      roles: ['user']
    });
  }
]);
