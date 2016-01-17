'use strict';

// Setting up route
angular.module('identitysets').config(['$stateProvider',
  function ($stateProvider) {
    // Articles state routing
    $stateProvider
      .state('identitysets', {
        abstract: true,
        url: '/identitysets',
        template: '<ui-view/>'
      })
      .state('identitysets.list', {
        url: '',
        templateUrl: 'modules/identitysets/client/views/list-identitysets.client.view.html'
      })
      .state('identitysets.create', {
        url: '/create',
        templateUrl: 'modules/identitysets/client/views/create-identityset.client.view.html',
        data: {
          roles: ['user', 'admin']
        }
      })
      .state('identitysets.view', {
        url: '/:identitysetId',
        templateUrl: 'modules/identitysets/client/views/view-identityset.client.view.html'
      })
      .state('identitysets.edit', {
        url: '/:identitysetId/edit',
        templateUrl: 'modules/identitysets/client/views/edit-identityset.client.view.html',
        data: {
          roles: ['user', 'admin']
        }
      });
  }
]);
