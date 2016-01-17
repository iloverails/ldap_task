'use strict';

// Identitysets controller
angular.module('identitysets').controller('IdentitysetsController', ['$scope', '$stateParams', '$location', 'Authentication', 'Identitysets',  '$modal',
	function($scope, $stateParams, $location, Authentication, Identitysets, $modal) {
		$scope.authentication = Authentication;

        $scope.setTypeOptions = [
            { label: 'Users', value: 'Users' },
            { label: 'Contacts', value: 'Contacts' }
        ];
        $scope.setType = $scope.setTypeOptions[0];

		// Create new Identity Set
		$scope.create = function(isValid) {
			// Create new IdentitySet object
			var identityset = new Identitysets ({
				name: this.name,
                setType: this.setType.value,
                description: this.description
			});

			// Redirect after save
			identityset.$save(function(response) {
				$location.path('identitysets/' + response._id);

				// Clear form fields
				$scope.ou = '';
                $scope.iaasSetType = '';
                $scope.description = '';
			}, function(errorResponse) {
				$scope.error = errorResponse.data.message;
			});
		};

		// Remove existing Identityset
		$scope.remove = function(identityset) {
            var modalInstance = $modal.open({
                templateUrl: 'confirmDelete.html',
                controller: 'ConfirmDeleteController',
                size: 'sm',
                resolve: {
                }
            });
            modalInstance.result.then(function () {

                if (identityset) {
                    identityset.$remove();

                    for (var i in $scope.identitysets) {
                        if ($scope.identitysets [i] === identityset) {
                            $scope.identitysets.splice(i, 1);
                        }
                    }
                } else {
                    $scope.identityset.$remove(function () {
                        $location.path('identitysets');
                    });
                }
            });
		};

		// Update existing Identityset
		$scope.update = function() {
			var identityset = $scope.identityset;

			identityset.$update(function() {
				$location.path('identitysets/' + identityset._id);
			}, function(errorResponse) {
				$scope.error = errorResponse.data.message;
			});
		};

		// Find a list of Identitysets
		$scope.find = function() {
			$scope.identitysets = Identitysets.query();
		};

		// Find existing Identityset
		$scope.findOne = function() {
			$scope.identityset = Identitysets.get({ 
				identitysetId: $stateParams.identitysetId
			});
		};
	}
]);
