'use strict';

//Identitysets service used to communicate Identitysets REST endpoints
angular.module('identitysets').factory('Identitysets', ['$resource',
	function($resource) {
		return $resource('api/identitysets/:identitysetId', { identitysetId: '@_id'
		}, {
			update: {
				method: 'PUT'
			}
		});
	}
]);