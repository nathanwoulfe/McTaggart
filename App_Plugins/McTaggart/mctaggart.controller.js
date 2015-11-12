/* Extends the core Umbraco tags property editor to include auto-generated tags from the OpenCalais API */

angular.module('umbraco').controller('mctaggart.controller', ['$rootScope', '$scope', 'assetsService', 'editorState', 'tagFactory', '$element', 'angularHelper', 'umbRequestHelper', '$timeout',
    function ($rootScope, $scope, assetsService, editorState, tagFactory, $element, angularHelper, umbRequestHelper, $timeout) {

    var $typeahed;
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
        return $scope.loading ? 'Thinking...' : 'There\'s nothing here, yet';
    }

    // Do we display the placeholder text? Only if the model value is empty
    $scope.showPlaceholder = function () {
        return $scope.model.value.length === 0;
    }

    // Fetch the typeahead script and start the fun...
    assetsService.loadJs("~/App_Plugins/McTaggart/lib/typeahead.bundle.min.js").then(function () {

        // Click... polls the OpenCalais API for tag data
        $scope.tag = function () {

            $scope.loading = true;
            var stringToTag = '';

            $scope.model.value = [];
            $scope.propertyForm.tagCount.$setViewValue(0);

            // extract the required properties to submit for tagging
            angular.forEach(editorState.getCurrent().tabs, function (tab) {
                angular.forEach(tab.properties, function (prop) {
                    if ($scope.model.config.properties.split(',').indexOf(prop.alias) !== -1) {
                        stringToTag += prop.value;
                    }
                });
            });

            // send the string and api key 
            tagFactory.getTags($scope.model.config.apiKey, stringToTag).then(function (resp) {                
                
                // Push the tags into the model value
                angular.forEach(resp.data, function (o) {
                    addTag(o);
                });

                $scope.loading = false;
            });
        }

        // Maybe we don't want to keep all suggested tags
        $scope.removeTag = function (t) {
            $scope.model.value.splice($scope.model.value.indexOf(t), 1);
            $scope.propertyForm.tagCount.$setViewValue($scope.model.value.length);

            $scope.showPlaceholder();
        }


        // This is the Umbraco core tag property editor
        // includes helper functions and Bloodhound config/init

        // Helper method to add a tag on enter or on typeahead select
        function addTag(tagToAdd) {
            if (tagToAdd != null && tagToAdd.length > 0) {
                if ($scope.model.value.indexOf(tagToAdd) < 0) {
                    $scope.model.value.push(tagToAdd);
                    $scope.propertyForm.tagCount.$setViewValue($scope.model.value.length);
                }
            }
        }

        $scope.addTagOnEnter = function (e) {
            var code = e.keyCode || e.which;
            if (code == 13) { //Enter keycode   
                if ($element.find('.tags-' + $scope.model.alias).parent().find(".tt-dropdown-menu .tt-cursor").length === 0) {
                    //this is required, otherwise the html form will attempt to submit.
                    e.preventDefault();
                    $scope.addTag();
                }
            }
        };

        $scope.addTag = function () {
            addTag($scope.tagToAdd);
            $scope.tagToAdd = "";
            $typeahead.typeahead('val', '');
        };

        //vice versa
        $scope.model.onValueChanged = function (newVal, oldVal) {
            $scope.model.value = newVal;
            $scope.model.value = $scope.model.value.split(',');
        };

        //configure the tags data source

        //helper method to format the data for bloodhound
        function dataTransform(list) {
            //transform the result to what bloodhound wants
            var tagList = _.map(list, function (i) {
                return { value: i.text };
            });

            // remove current tags from the list
            return $.grep(tagList, function (tag) {
                return ($.inArray(tag.value, $scope.model.value) === -1);
            });
        }

        // helper method to remove current tags
        function removeCurrentTagsFromSuggestions(suggestions) {
            return $.grep(suggestions, function (suggestion) {
                return ($.inArray(suggestion.value, $scope.model.value) === -1);
            });
        }

        var tagsHound = new Bloodhound({
            datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            dupDetector: function (remoteMatch, localMatch) {
                return (remoteMatch["value"] == localMatch["value"]);
            },
            //pre-fetch the tags for this category
            prefetch: {
                url: umbRequestHelper.getApiUrl("tagsDataBaseUrl", "GetTags", [{ tagGroup: $scope.model.config.group }]),
                //TTL = 5 minutes
                ttl: 300000,
                filter: dataTransform
            },
            //dynamically get the tags for this category (they may have changed on the server)
            remote: {
                url: umbRequestHelper.getApiUrl("tagsDataBaseUrl", "GetTags", [{ tagGroup: $scope.model.config.group }]),
                filter: dataTransform
            }
        });

        tagsHound.initialize(true);
        //configure the type ahead
        $timeout(function () {
            $typeahead = $element.find('.tags-' + $scope.model.alias).typeahead(
            {
                //This causes some strangeness as it duplicates the textbox, best leave off for now.
                hint: false,
                highlight: true,
                cacheKey: new Date(),  // Force a cache refresh each time the control is initialized
                minLength: 1
            }, {
                //see: https://github.com/twitter/typeahead.js/blob/master/doc/jquery_typeahead.md#options
                // name = the data set name, we'll make this the tag group name
                name: $scope.model.config.group,
                displayKey: "value",
                source: function (query, cb) {
                    tagsHound.get(query, function (suggestions) {
                        console.log(suggestions);
                        cb(removeCurrentTagsFromSuggestions(suggestions));
                    });
                },
            }).bind("typeahead:selected", function (obj, datum, name) {
                angularHelper.safeApply($scope, function () {
                    addTag(datum["value"]);
                    $scope.tagToAdd = "";
                    // clear the typed text
                    $typeahead.typeahead('val', '');
                });

            }).bind("typeahead:autocompleted", function (obj, datum, name) {
                angularHelper.safeApply($scope, function () {
                    $scope.tagToAdd = "";
                });

            }).bind("typeahead:opened", function (obj) {
                //console.log("opened ");
            });
        });

        $scope.$on('$destroy', function () {
            tagsHound.clearPrefetchCache();
            tagsHound.clearRemoteCache();
            $element.find('.tags-' + $scope.model.alias).typeahead('destroy');
            delete tagsHound;
        });
    });
}]);

angular.module('umbraco.resources').factory('tagFactory', function ($http) {
    return {
        getTags: function (apiKey, stringToTag) {
            var data = { apiKey: apiKey, stringToTag: stringToTag };
            return $http.post('backoffice/mctaggart/tagsapi/gettags', JSON.stringify(data));
        }
    }
});