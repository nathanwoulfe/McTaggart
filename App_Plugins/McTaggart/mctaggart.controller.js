angular.module('umbraco').controller('mctaggart.controller', ['$scope', 'editorState', 'contentResource', 'contentEditingHelper', 'tagFactory', function ($scope, editorState, contentResource, contentEditingHelper, tagFactory) {

    $scope.tag = function () {

        $scope.model.value = [];
        $scope.loading = true;

        contentResource.getById(editorState.getCurrent().id).then(function (resp) {

            var props = contentEditingHelper.getAllProps(resp),
                data;

            angular.forEach($scope.model.config.properties.split(','), function (a) {
                data += $.grep(props, function (p) {
                    return p.alias === a;
                })[0].value;
            })

            tagFactory.getTags(data, $scope.model.config.apiKey).then(function (resp) {
                parseTags(resp);
            });
        });
    }

    var parseTags = function (d) {

        $scope.model.value = [];

        angular.forEach(d, function (o) {
            if (o._typeGroup === 'socialTag') {
                $scope.model.value.push(o.name);
            }
        });

        $scope.loading = false;
        $scope.$apply();

    }

    $scope.removeTag = function (t) {
        var i = $scope.model.value.indexOf(t);
        $scope.model.value.splice(i, 1);
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
        getTags: function (d, apiKey) {

            var ajaxOpts = {
                type: 'POST',
                data: d,
                url: "https://api.thomsonreuters.com/permid/calais",
                beforeSend: function (jqXHR, settings) {
                    jqXHR.setRequestHeader('Content-Type', 'text/raw');
                    jqXHR.setRequestHeader('OutputFormat', 'application/json');
                    jqXHR.setRequestHeader('X-AG-Access-Token', apiKey);
                },
                success: function (data, textStatus, jqXHR) {
                    return data;
                }
            }

            return $.ajax(ajaxOpts);
        }
    }
});