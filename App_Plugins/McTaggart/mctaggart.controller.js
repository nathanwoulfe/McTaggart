angular.module('umbraco').controller('mctaggart.controller', ['$scope', 'editorState', 'tagFactory', function ($scope, editorState, tagFactory) {

    $scope.tag = function () {

        $scope.model.value = [];
        $scope.loading = true;

        tagFactory.getTags($scope.model.config.apiKey, editorState.getCurrent().id, $scope.model.config.properties).then(function (resp) {

            angular.forEach(resp.data, function (o) {
                $scope.model.value.push(o);
            });

            $scope.loading = false;
        });
    }

    $scope.removeTag = function (t) {
        $scope.model.value.splice($scope.model.value.indexOf(t), 1);
    }

    $scope.placeholder = function () {
        return $scope.loading ? 'Thinking...' : 'There\'s nothing here, yet';
    }

    $scope.showPlaceholder = function () {
        return $scope.model.value.length === 0;
    }

}]);

angular.module('umbraco.resources').factory('tagFactory', function ($http) {
    return {
        getTags: function (apiKey, id, props) {
            return $http.get('backoffice/mctaggart/tagsapi/gettags', { params: { apiKey: apiKey, id: id, props: props } });
        }
    }
});