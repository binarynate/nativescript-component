'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _observable = require('data/observable');

var _parameterValidator = require('parameter-validator');

var _frame = require('ui/frame');

var _frame2 = _interopRequireDefault(_frame);

var _ComponentManager = require('./ComponentManager');

var _ComponentManager2 = _interopRequireDefault(_ComponentManager);

var _componentUtils = require('./component-utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
* Base class for authoring a vanilla NativeScript component using a friendly syntax.
* This class introduces functionality like automatically providing a reference
* to its view and automatically binding properties to the component that are passed in
* as XML attributes or as `navigationContext` properties.
*/
var Component = function () {
    function Component() {
        _classCallCheck(this, Component);
    }

    _createClass(Component, [{
        key: 'set',


        /**
        * Sets a property on the component's binding context.
        *
        * @param {string} name  - property name
        * @param {}       value - property value
        */
        value: function set(name, value) {

            this._validateBindingContext();

            if (typeof this.bindingContext.set === 'function') {
                // bindingContext is observable, so use its `set` function.
                this.bindingContext.set(name, value);
                return;
            }
            // bindingContext is not observable, so treat it like a plain object.
            this.bindingContext[name] = value;
        }

        /**
        * Gets a property from the component's binding context.
        *
        * @param   {string} name  - property name
        * @returns {}
        */

    }, {
        key: 'get',
        value: function get(name) {
            this._validateBindingContext();
            return (0, _componentUtils.getBindingContextProperty)(this.bindingContext, name);
        }

        /**
        * The component's view.
        * @type {ui/View}
        */

    }, {
        key: 'onNavigatingTo',


        /**
        * Hook for the view's `navigationTo` event which automatically sets the component's
        * `view` property and automatically binds the `navigationContext` properties to the
        * component instance.
        *
        * **Note that this hook can only be used for components whose
        * root element is `Page`.**
        *
        * @param {Object}  options
        * @param {ui/View} options.object
        */
        value: function onNavigatingTo() /* options */{

            this.init.apply(this, arguments);
        }

        /**
        * Hook for the view's `navigatedTo` event.
        *
        * **Note that this hook can only be used for components whose
        * root element is `Page`.**
        *
        * @param {Object}  options
        * @param {ui/View} options.object
        * @param {Object}  options.object.navigationContext
        */

    }, {
        key: 'onNavigatedTo',
        value: function onNavigatedTo() /* options */{

            this.init.apply(this, arguments);
        }

        /**
        * Hook for the view's `loaded` event which automatically sets the component's `view` property
        * and binds any properties passed as XML attributes to the component's `bindingContext`.
        *
        * If your component's root element isn't `Page` (i.e. if it's embedded within another component),
        * then **you must specify either this hook or `onShownModally` in your template**, because the `onNavigatedTo`
        * and `onNavigatingTo` hooks are only called for `Page` components.
        *
        * @param {Object}  options
        * @param {ui/View} options.object
        */

    }, {
        key: 'onLoaded',
        value: function onLoaded() /* options */{

            this.init.apply(this, arguments);
        }

        /**
        * Hook for the view's `shownModally` event which automatically sets the component's
        * `view` property, binds the `navigationContext` properties to the
        * component instance and sets its `closeModal` function.
        *
        * If your component's root element isn't `Page` (i.e. if it's embedded within another component),
        * then **you must specify either this hook or `onLoaded` in your template**, because the `onNavigatedTo`
        * and `onNavigatingTo` hooks are only called for `Page` components.
        *
        * @param {Object}   options
        * @param {ui/View}  options.object
        * @param {}         options.context       - Modal context
        * @param {Function} options.closeCallback
        */

    }, {
        key: 'onShownModally',
        value: function onShownModally(options) {

            this.init.apply(this, arguments);
            this._modalContext = options.context;
            this._closeModalCallback = options.closeCallback;
            this._setNavigationContextProperties(this._modalContext);
        }

        /**
        * Launches the given modal on the current page, passing the modal page a Node-style callback to call.
        *
        * @param   {Object}      options
        * @param   {string|Page} options.modal        - The path, from the root of the project, to the modal view or the
        *                                               Page instance you which to display as the modal.
        * @param   {}            [options.context]    - Optional context to pass to to the modal view.
        * @param   {boolean}     [options.fullscreen] - Optionally specify whether the modal should appear full screen.
        * @returns {Promise}     A promise containing the results passed back by the modal.
        */

    }, {
        key: 'showModal',
        value: function showModal(options) {

            return (0, _parameterValidator.validateAsync)(options, ['modal']).then(function () {
                var modal = options.modal,
                    context = options.context,
                    fullscreen = options.fullscreen,
                    resolve = void 0,
                    reject = void 0,
                    currentPage = _frame2.default.topmost().currentPage;

                var promise = new Promise(function () {
                    var _args, _args2;

                    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                        args[_key] = arguments[_key];
                    }

                    return _args = args, _args2 = _slicedToArray(_args, 2), resolve = _args2[0], reject = _args2[1], _args;
                });
                var callback = function callback(err, ret) {
                    return err ? reject(err) : resolve(ret);
                };

                currentPage.showModal(modal, context, callback, fullscreen);
                return promise;
            });
        }

        /**
        * An alias for [`frame.topmost().navigate`](http://docs.nativescript.org/api-reference/classes/_ui_frame_.frame.html#navigate)
        * which navigates to a specific Page.
        *
        * This method also adds support for an optional `component` parameter that can be specified
        * when providing a [NavigationEntry](http://docs.nativescript.org/api-reference/interfaces/_ui_frame_.navigationentry.html)
        * object to `navigate`. This simply makes it so that calling `navigate({ component: 'my-component', ... })` is automatically converted
        * to `navigate({ moduleName: 'components/my-component/my-component', ... })`.
        *
        * @param {NavigationEntry} [entry]
        * @param {string}          [entry.component] - The name of the component to transition to.
        */

    }, {
        key: 'navigate',
        value: function navigate() {
            var _frame$topmost;

            var arg = arguments[0];

            if ((typeof arg === 'undefined' ? 'undefined' : _typeof(arg)) === 'object' && typeof arg.component === 'string') {
                var component = arg.component;

                arg.moduleName = 'components/' + component + '/' + component;
            }
            return (_frame$topmost = _frame2.default.topmost()).navigate.apply(_frame$topmost, arguments);
        }

        /**
        * If the component was shown modally, this method calls the callback that was provided to `showModal()`.
        * If it was shown modally using this class's `showModal` method, the callback is a Node-style callback.
        * If it was not shown modally using this class's `showModal` method, the parameters depend on what is
        * expected by the code that showed the modal.
        *
        * @param  {Error|string|null} err  - The error if an error ocurred, or else `null`.
        * @param  {}                  data - The result, if there is one.
        *
        * @throws {Error} - Throws an error if the component wasn't shown modally.
        */

    }, {
        key: 'closeModal',
        value: function closeModal() {

            if (this._closeModalCallback) {
                return this._closeModalCallback.apply(this, arguments);
            }
            throw new Error('No \'closeCallback\' function has been set, probably because the component hasn\'t been shown modally');
        }

        /**
        * A common initialization method invoked by the various lifecycle hooks (e.g. `onLoaded`, `onNavigatingTo`).
        *
        * @param {Object}  options
        * @param {ui/View} options.object
        * @param {}        options.object.navigationContext
        * @param {}        options.object[x]                 - Any properties passed as custom XML attributes.
        * @private
        */

    }, {
        key: 'init',
        value: function init(options) {

            this._view = options.object;

            // First, get the names of all the properties passed as XML attributes in the template.f
            var paramNames = this._getNamesOfPropertiesPassedAsXmlAttributes();

            var xmlParamsToApply = {};

            // NativeScript sets properties on the view for every parameter passed as an XML attribute,
            // however the parameters that are expressions (e.g. "{{ myBoundVariable }}") are empty objects
            // on the view and are actually set on the original bindingContext (i.e. the parent's bindingContext).
            // To handle that, for each of the properties passed as XML attributes, we first try to get the
            // value from the original bindingContext and if it's not there, fall back to the value from the view object.
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = paramNames[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var _paramName = _step.value;


                    var valueFromOriginalBindingContext = void 0,
                        valueFromParentBindingContext = void 0,
                        valueFromView = this.view[_paramName];

                    try {
                        // In a try / catch block, because the view's bindingContext could be undefined before _setNewBindingContextIfNeeded() is invoked.
                        valueFromOriginalBindingContext = this.get(_paramName);
                    } catch (error) {}

                    try {
                        // In a try / catch block, because the parent view's bindingContext could be undefined.
                        var parentBindingContext = this.view._parent.bindingContext;
                        valueFromParentBindingContext = (0, _componentUtils.getBindingContextProperty)(parentBindingContext, _paramName);
                    } catch (error) {}

                    xmlParamsToApply[_paramName] = valueFromOriginalBindingContext || valueFromParentBindingContext || valueFromView;
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

            this._setNewBindingContextIfNeeded();

            // Set all of the properties passed as XML attributes on the bindingContext, because a new bindingContext
            // was probably applied, and even if the original bindingContext is still used, it won't contain the
            // parameters that weren't expressions (e.g. myStaticValue="foo" as opposed to myDynamicValue="{{ myBoundVariable }}") .
            for (var paramName in xmlParamsToApply) {
                var value = xmlParamsToApply[paramName];
                this.set(paramName, value);
            }

            this._setNavigationContextProperties(this.view.navigationContext);
            this._hookUpPageLoadedEvent();
        }

        /**
        * Exports the component's public methods as named exports for a module. This should be called
        * after the `Component` subclass is defined.
        *
        * @example
        * class MyComponent extends Component {
        *     // Extend component methods and use properties
        * }
        * MyComponent.export(exports);
        *
        * @param {Object} exports - The `exports` variable for the module from which the component's
        *                           methods should be exported.
        */

    }, {
        key: '_getNamesOfPropertiesPassedAsXmlAttributes',


        /**
        * When parameters are passed to a component as XML attributes, they provided as
        * properties on the container. This method picks out such properties by comparing
        * the container to a new instance of the same class.
        *
        * @private
        */
        value: function _getNamesOfPropertiesPassedAsXmlAttributes() {

            var exampleInstance = new this.view.constructor(),
                parameters = [];

            var shouldIgnoreKey = function shouldIgnoreKey(key) {
                return key === 'exports' || key.includes('xmlns');
            };

            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
                for (var _iterator2 = Object.getOwnPropertyNames(this.view)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var key = _step2.value;

                    if (exampleInstance[key] === undefined && key[0] !== '_' && !shouldIgnoreKey(key)) {
                        parameters.push(key);
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

            return parameters;
        }

        /**
        * @param   {ui/View}        view
        * @returns {Component|null}
        * @private
        */

    }, {
        key: '_getParentComponent',
        value: function _getParentComponent() {

            if (!this.view.parent) return null;
            return (0, _componentUtils.getComponentForView)(this.view.parent);
        }
    }, {
        key: '_hookUpPageLoadedEvent',
        value: function _hookUpPageLoadedEvent() {

            if (this.view.page === this.view && this.view.isLoaded) {
                this._callPageLoadedHook();
            }

            this.view.page.on('loaded', this._onPageLoaded.bind(this));

            var page = this.view.page;


            if (!page.onLoaded._patched) {
                (function () {

                    var originalPageOnLoaded = page.onLoaded.bind(page);

                    page.onLoaded = function () {

                        return originalPageOnLoaded.apply(undefined, arguments);
                    };
                })();
            }
        }
    }, {
        key: '_callPageLoadedHook',
        value: function _callPageLoadedHook() {

            // `_wasCalled` is used by child components to determine when their hooks can be called.
            this.onPageLoaded._wasCalled = true;
            // `_returnValue` is used by child components so that if this component's hook returns a Promise,
            // the child's hook isn't invoked until that Promise is resolved or rejected.
            this.onPageLoaded._returnValue = this.onPageLoaded();
            return this.onPageLoaded._returnValue;
        }

        /**
        * Placeholder for a hook where subclasses can place their initialization code
        */

    }, {
        key: 'onPageLoaded',
        value: function onPageLoaded() {}
    }, {
        key: '_onPageLoaded',
        value: function _onPageLoaded() {
            var _this = this;

            var parentComponent = this._getParentComponent();

            if (!parentComponent) {
                // This component is the outermost component, so go ahead and call the hook.
                return this._callPageLoadedHook();
            }

            if (parentComponent.onPageLoaded._wasCalled) {
                // The parent component's page loaded hook has already been called, so call this
                // component's hook, waiting for the parent's component's promise to resolve if needed.
                if (parentComponent.onPageLoaded._returnValue instanceof Promise) {
                    return parentComponent.onPageLoaded._returnValue.catch(function () {}).then(function () {
                        return _this._callPageLoadedHook();
                    });
                }
                return this._callPageLoadedHook();
            }

            // The parent component's hook hasn't been called yet, so let's monkey patch it so that
            // this component's hook is called after it, waiting for the parent's promise to resolve if needed.
            var originalParentOnPageLoaded = parentComponent.onPageLoaded.bind(parentComponent);

            parentComponent.onPageLoaded = function () {
                var _this2 = this;

                var returnValue = void 0;
                try {
                    returnValue = originalParentOnPageLoaded.apply(undefined, arguments);
                } catch (error) {}

                if (returnValue instanceof Promise) {
                    return returnValue.catch(function () {}).then(function () {
                        return _this2._callPageLoadedHook();
                    });
                }
                return this._callPageLoadedHook();
            };
        }

        /**
        * Assigns this component its own, new bindingContext if its bindingContext is
        * undefined or has been inherited from its parent.
        */

    }, {
        key: '_setNewBindingContextIfNeeded',
        value: function _setNewBindingContextIfNeeded() {

            var parent = this.view._parent;
            var parentBindingContext = parent ? parent.bindingContext : undefined;

            if (this.view.bindingContext === parentBindingContext) {
                this.view.bindingContext = new _observable.Observable();
            }
        }
    }, {
        key: '_setNavigationContextProperties',
        value: function _setNavigationContextProperties(context) {

            if ((typeof context === 'undefined' ? 'undefined' : _typeof(context)) === 'object') {
                for (var key in context) {
                    this.set(key, context[key]);
                }
            }
        }
    }, {
        key: '_validateBindingContext',
        value: function _validateBindingContext() {

            if (this.bindingContext === undefined) {
                var message = 'Component ' + this.constructor.name + ' has not been initialized via an initialization hook. ' + 'Please ensure that one of the component\'s initialization hooks (e.g. onLoaded) is hooked up in its XML template ' + 'and that if it overrides the base class\'s implementation of the hook, it still invokes base class\'s implementation.';
                throw new Error(message);
            }
        }
    }, {
        key: 'view',
        get: function get() {

            if (this._view) {
                return this._view;
            }
            throw new Error('Cannot get view, because it has not been set yet.');
        }

        /**
        * The component's unique binding context.
        *
        * Normally, a NativeScript view implicitly inherits its parent view's `bindingContext` if
        * its own hasn't been set. However, in order to ensure that each Component instance has its own
        * context (i.e. so that the context of a Component doesn't collide with that of its parent or
        * siblings) component its own unique `bindingContext` if its bindingContext hasn't already been set.
        *
        * @type {Observable|Object}
        */

    }, {
        key: 'bindingContext',
        get: function get() {

            return this.view.bindingContext;
        },
        set: function set(context) {
            this.view.bindingContext = context;
        }

        /**
        * Contains any navigation context properties passed during the transition.
        *
        * @type {Object}
        */

    }, {
        key: 'navigationContext',
        get: function get() {
            return this.view.navigationContext;
        }

        /**
        * Optional context provided if the component was shown modally.
        *
        * @type {}
        */

    }, {
        key: 'modalContext',
        get: function get() {
            return this._modalContext;
        }

        /**
        * By default, multiple instances of the component can be created,
        * and each instance is destroyed upon its view's `unloaded` event. To change this behavior so
        * that only a single instance of your component is created and is kept alive throughout
        * the lifetime of your application, override this property to be `true`.
        *
        * @type {boolean}
        */

    }], [{
        key: 'export',
        value: function _export(moduleExports) {

            var componentManager = new _ComponentManager2.default({ componentClass: this });
            componentManager.export(moduleExports);
        }
    }, {
        key: 'isSingleton',
        get: function get() {
            return false;
        }
    }]);

    return Component;
}();

exports.default = Component;