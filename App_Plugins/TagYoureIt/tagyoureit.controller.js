angular.module('umbraco').controller('tagyoureit.controller', ['$scope', 'editorState', 'contentResource', 'contentEditingHelper', 'tagFactory', function ($scope, editorState, contentResource, contentEditingHelper, tagFactory) {

    $scope.msg = 'tag';

    var apiKey = $scope.model.config.apiKey,
        alias = $scope.model.config.properties.split(',');
        currentId = editorState.getCurrent().id;

    $scope.tag = function () {

        contentResource.getById(currentId).then(function (resp) {

            var props = contentEditingHelper.getAllProps(resp),
                data;

            angular.forEach(alias, function (a) {
                data += $.grep(props, function (p) {
                    return p.alias === a;
                })[0].value;
            })

            tagFactory.getTags(data, apiKey).then(function (resp) {
                parseTags(resp);
            });
        });
    }

    var parseTags = function (d) {
        $scope.tags = [];

        angular.forEach(d, function (o) {
            if (o._typeGroup === 'socialTag') {
                $scope.tags.push(o.name);
            }
        });

        $scope.model.value = $scope.tags !== $scope.model.value ? $scope.tags : $scope.model.value;
        $scope.$apply();
    }

    $scope.removeTag = function (t) {
        var i = $scope.model.value.indexOf(t);
        $scope.model.value.splice(i, 1);
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