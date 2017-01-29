'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _parameterValidator = require('parameter-validator');

var _page = require('ui/page');

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
* The `Component` class defines the behavior for a single component instance, however the
* NativeScript framework expects a view module to export functions which handle *all*
* instances of the view. Because of this, this ComponentManager class does two things:
*
* - Exports module-level functions which NativeScript calls for all instances of the view like it requires.
* - Allows each instance of the view to have its own Component instance and, thus, independent state.
*   It does this by maintaining a list of loaded component instances under the hood
*   and proxying invocation of module-level functions to the corresponding method the correct Component instance.
*
* @private
*/
var ComponentManager = function () {

    /**
    * @param {Object} options
    * @param {Class}  options.componentClass
    */
    function ComponentManager(options) {
        _classCallCheck(this, ComponentManager);

        (0, _parameterValidator.validate)(options, ['componentClass'], this);
        this._instances = []; // For keeping track of the instances of the component that are currently loaded.
        this._addProxyMethods();
    }

    /**
    * Exports the component's public methods as named exports for a module.
    * @private
    */


    _createClass(ComponentManager, [{
        key: 'export',
        value: function _export(moduleExports) {

            var publicMethodNames = this._getPublicMethodNames();

            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = publicMethodNames[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var methodName = _step.value;

                    moduleExports[methodName] = this[methodName].bind(this);
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator.return) {
                        _iterator.return();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }
        }

        /**
        * Creates a new component instance, assigns it and its view a component ID, and
        * attaches an event listener so that the reference to the component is removed
        * upon the view's `unloaded` event.
        *
        * @param   {ui/View} view
        * @returns {Component}
        * @private
        */

    }, {
        key: '_addNewComponent',
        value: function _addNewComponent(view) {
            var _this = this;

            var component = new this.componentClass();
            var componentId = generateUuid();
            component._id = componentId;
            // Note: component.set() can't yet be used to set the _componentId on the component's binding context,
            // because using component.set() before the component.onLoaded() prevents variables in XML attributes
            // from being bound to the component correctly. So, the _componentId is set on the binding context
            // *after* the initialization method is invoked.
            component._view = view;
            this._instances.push(component);

            if (this.componentClass.isSingleton) {
                // Singleton components are kept alive throughout the life of the application, so we should attach the event
                // listener that removes the component when its view is unloaded.
                return component;
            }

            // By default, components are not created as singletons, so each component instance is released when its
            // view is unloaded.
            view.on(_page.Page.unloadedEvent, function (options) {

                var view = options.object;

                if (!view.bindingContext) {
                    throw new Error('Cannot deallocate component for view, because view has no binding context.');
                }

                var componentId = view.bindingContext.get('_componentId');

                var componentIndex = _this._instances.findIndex(function (_ref) {
                    var _id = _ref._id;
                    return _id === componentId;
                });

                if (componentIndex === -1) {
                    throw new Error('Cannot deallocate component for view, because no component matches the view\'s component ID of \'' + componentId + '\'');
                }

                _this._instances.splice(componentIndex, 1);
            });
            return component;
        }
    }, {
        key: '_addProxyMethods',
        value: function _addProxyMethods() {

            var initializationHooks = ['onLoaded', 'onNavigatingTo', 'onNavigatedTo', 'onShownModally'];

            var publicMethodNames = this._getPublicMethodNames();

            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
                for (var _iterator2 = publicMethodNames[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var methodName = _step2.value;


                    if (initializationHooks.includes(methodName)) {
                        this._addInitHookProxyMethod(methodName);
                    } else {
                        this._addProxyMethod(methodName);
                    }
                }
            } catch (err) {
                _didIteratorError2 = true;
                _iteratorError2 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion2 && _iterator2.return) {
                        _iterator2.return();
                    }
                } finally {
                    if (_didIteratorError2) {
                        throw _iteratorError2;
                    }
                }
            }
        }

        /**
        * Adds a method to this instance which does the following:
        *
        * - Checks if the view already has an ID.
        *   - If so:
        *       - Looks up the component instance that matches that view
        *       - Proxy the function call to that instance
        *   - If not:
        *       - creates a component instance and give it an ID.
        *       - Attach the event listener for the unload event
        *       - Add the component to _instances
        *       - Proxy the function call to that instance
        *
        * @param {string} methodName
        * @private
        */

    }, {
        key: '_addInitHookProxyMethod',
        value: function _addInitHookProxyMethod(methodName) {
            var _this2 = this;

            /**
            * @param {Object}  options
            * @param {ui/View} options.object
            * @private
            */
            this[methodName] = function () {
                var _component;

                for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                    args[_key] = arguments[_key];
                }

                var options = args[0],
                    view = options.object,
                    newComponentAdded = false;


                var component = _this2._getComponentForRootView(view);

                if (!component && _this2.componentClass.isSingleton && _this2._instances[0]) {
                    component = _this2._instances[0];
                }

                if (!component) {
                    component = _this2._addNewComponent(view);
                    newComponentAdded = true;
                }

                // Proxy the function call to the matching component instance.
                var result = (_component = component)[methodName].apply(_component, args);

                if (newComponentAdded) {
                    // The _componentId is set *after* the init hook is proxied, because calling
                    // component.set() before the initialization hook is invoked prevents variables
                    // passed as XML attributes from being bound correctly.
                    component.set('_componentId', component._id);
                }
                return result;
            };
        }

        /**
        * Adds a method to this instance which does the following:
        *
        * - Looks up the component instance for the given view.
        * - Proxies the function call to that component instance.
        *
        * @private
        */

    }, {
        key: '_addProxyMethod',
        value: function _addProxyMethod(methodName) {
            var _this3 = this;

            /**
            * @param {Object}  options
            * @param {ui/View} options.object
            * @private
            */
            this[methodName] = function () {
                var _component2;

                for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
                    args[_key2] = arguments[_key2];
                }

                var options = args[0];

                var view = options.object;
                var component = void 0;

                if (_this3.componentClass.isSingleton) {

                    component = _this3._instances[0];

                    if (!component) {
                        var message = 'Method \'' + methodName + '\' called for singleton component ' + _this3.componentClass.name + ', ' + 'but the component has not been instantiated yet. Please ensure that one of the component\'s ' + 'lifecycle hooks (e.g. onLoaded, onNavigatingTo) are hooked up in its template.';
                        throw new Error(message);
                    }
                } else {
                    component = _this3._getComponentForNestedView(view);
                }
                // Proxy the function call to the matching component instance.
                return (_component2 = component)[methodName].apply(_component2, args);
            };
        }

        /**
        * Returns the component instance that matches the view's component ID or null
        * if the view has no component ID.
        *
        * @param   {ui/View} view
        * @returns {Component|null}
        * @private
        */

    }, {
        key: '_getComponentForRootView',
        value: function _getComponentForRootView(view) {

            try {
                if (!view.bindingContext.get('_componentId')) {
                    return null;
                }
            } catch (error) {
                // `view.bindingContext` is either undefined or is not an Observable.
                return null;
            }

            var componentId = view.bindingContext.get('_componentId');
            var component = this._instances.find(function (_ref2) {
                var _id = _ref2._id;
                return _id === componentId;
            });
            return component || null;
        }

        /**
        * For the given view nested within a component, this method traverses the XML tree until it finds
        * a view with a _componentId. That view is the component's root view, and the _componentId is used
        * to look up and return the component.
        *
        * @param   {ui/View} view
        * @returns {Component}
        * @private
        */

    }, {
        key: '_getComponentForNestedView',
        value: function _getComponentForNestedView(view) {
            var _this4 = this;

            var maxIterations = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 500;


            if (maxIterations < 1) {
                // This shouldn't ever happen, but is included in case to prevent infinite recursion.
                throw new Error('Couldn\'t locate the component containing the ' + view.typeName + ' view, because the maximum number of iterations was reached.');
            }

            if (view.bindingContext && view.bindingContext.get('_componentId')) {
                var _ret = function () {
                    // We found the component's root view containing the component ID, so now we can find and return the right component.
                    var componentId = view.bindingContext.get('_componentId');
                    var component = _this4._instances.find(function (_ref3) {
                        var _id = _ref3._id;
                        return _id === componentId;
                    });

                    if (component) {
                        return {
                            v: component
                        };
                    }
                    // This error would indicate that an event from a nested component bubbled up to and was handled by this component, which shouldn't happen.
                    throw new Error('Couldn\'t locate the component containing the ' + view.typeName + ' view; a view with component ID \'' + componentId + '\' was found, but no component matches that ID');
                }();

                if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
            }

            // There's no _componentId defined for this view, which is normal if the view is that of a tag
            // embedded within a component. That's OK - let's just try its parent until we get to the component's root view.
            if (view._parent) {
                return this._getComponentForNestedView(view._parent, --maxIterations);
            }
            // This shouldn't ever happen, either.
            throw new Error('Couldn\'t locate the component containing the ' + view.typeName + ' view; the root view was reached without encountering a component ID.');
        }
    }, {
        key: '_getPublicMethodNames',
        value: function _getPublicMethodNames() {

            var instance = new this.componentClass();

            var publicMethodNames = getAllPropertyNames(instance).filter(function (key) {

                var value = void 0;
                try {
                    value = instance[key];
                } catch (error) {}

                return typeof value === 'function' && key[0] !== '_' && key !== 'constructor';
            });

            return publicMethodNames;
        }
    }]);

    return ComponentManager;
}();

exports.default = ComponentManager;


function getAllPropertyNames(object) {
    var propertyNames = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];


    propertyNames.push.apply(propertyNames, _toConsumableArray(Object.getOwnPropertyNames(object)));
    var prototype = Object.getPrototypeOf(object);
    return prototype === Object.prototype ? propertyNames : getAllPropertyNames(prototype, propertyNames);
}

/**
* Creates a v4 uuid (a random number in the form of a UUID).
*
* http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
* @private
*/
function generateUuid() {
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + (s4() + s4() + s4());
}

function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}