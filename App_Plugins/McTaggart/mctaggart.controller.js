/* Extends the core Umbraco tags property editor to include auto-generated tags from the OpenCalais API */

angular.module('umbraco').controller('mctaggart.controller', ['$scope', 'assetsService', 'editorState', 'tagFactory', '$element', 'angularHelper', 'umbRequestHelper', '$timeout',
    function ($scope, assetsService, editorState, tagFactory, $element, angularHelper, umbRequestHelper, $timeout) {

    var noMatch = false;
    $scope.tagToAdd = '';

    if ($scope.model.value.length) {
        $scope.model.value = $scope.model.value.split(',');
    } else {
        $scope.model.value = [];
    }

    // Method required by the valPropertyValidator directive (returns true if the property editor has at least one tag selected)
    $scope.validateMandatory = function () {
        return {
            isValid: !$scope.model.validation.mandatory || ($scope.model.value != null && $scope.model.value.length > 0),
            errorMsg: "Value cannot be empty",
            errorKey: "required"
        };
    }

    // Set the default text - either loading tags or none exist
    $scope.placeholder = function () {
        return noMatch ? 'No tags found' : $scope.loading ? 'Thinking...' : 'There\'s nothing here, yet';
    }

    // Do we display the placeholder text? Only if the model value is empty
    $scope.showPlaceholder = function () {
        return $scope.model.value.length === 0;
    }

    // Click... polls the OpenCalais API for tag data
    $scope.tag = function () {

        $scope.loading = true;
        noMatch = false;
        var stringToTag = '';

        $scope.model.value = [];
        $scope.propertyForm.tagCount.$setViewValue(0);

        // extract the required properties to submit for tagging
        angular.forEach(editorState.getCurrent().tabs, function (tab) {
            angular.forEach(tab.properties, function (prop) {
                if ($scope.model.config.properties.toLowerCase().split(',').indexOf(prop.alias.toLowerCase()) !== -1) {
                    stringToTag += prop.value;
                }
            });
        });

        // send the string and api key 
        if (stringToTag.length) {
            tagFactory.getTags($scope.model.config.apiKey, stringToTag, $scope.model.config.tagCount).then(function (resp) {
                if (resp.data.length) {
                    // Push the tags into the model value
                    angular.forEach(resp.data, function (o) {
                        addTag(o);
                    });
                } else {
                    showNoMatch();
                }

                $scope.loading = false;
            });
        } else {
            showNoMatch();
        }
    }

    // no results? inform the user
    function showNoMatch() {
        noMatch = true;
        $scope.showPlaceholder();
    }

    // Maybe we don't want to keep all suggested tags
    $scope.removeTag = function (t) {
        $scope.model.value.splice($scope.model.value.indexOf(t), 1);
        $scope.propertyForm.tagCount.$setViewValue($scope.model.value.length);

        $scope.showPlaceholder();
    }

    // Helper method to add a tag on enter or on typeahead select
    function addTag(tagToAdd) {
        if (tagToAdd != null && tagToAdd.length > 0) {
            if ($scope.model.value.indexOf(tagToAdd) < 0) {
                $scope.model.value.push(tagToAdd);
                $scope.propertyForm.tagCount.$setViewValue($scope.model.value.length);
            }
        }
    }     

    //vice versa
    $scope.model.onValueChanged = function (newVal, oldVal) {
        $scope.model.value = newVal;
        $scope.model.value = $scope.model.value.split(',');
    };
}]);

angular.module('umbraco.resources').factory('tagFactory', function ($http) {
    return {
        getTags: function (apiKey, stringToTag, tagCount) {
            var data = { apiKey: apiKey, stringToTag: stringToTag, tagCount: tagCount };
            return $http.post('backoffice/mctaggart/tagsapi/gettags', JSON.stringify(data));
        }
    }
});