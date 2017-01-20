'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _observable = require('data/observable');

var _parameterValidator = require('parameter-validator');

var _frame = require('ui/frame');

var _frame2 = _interopRequireDefault(_frame);

var _ComponentManager = require('./ComponentManager');

var _ComponentManager2 = _interopRequireDefault(_ComponentManager);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
* Base class for authoring a vanilla NativeScript component using a friendly syntax.
* This class introduces functionality like automatically providing a reference
* to its view and automatically binding properties to the component that are passed in
* as XML attributes or as `navigationContext` properties.
*/
class Component {

    /**
    * Sets a property on the component's binding context.
    *
    * @param {string} name  - property name
    * @param {}       value - property value
    */
    set(name, value) {
        return this.bindingContext.set(name, value);
    }

    /**
    * Gets a property from the component's binding context.
    *
    * @param   {string} name  - property name
    * @returns {}
    */
    get(name) {
        return this.bindingContext.get(name);
    }

    /**
    * @type {ui/View} - The component's view.
    */
    get view() {

        if (this._view) {
            return this._view;
        }
        throw new Error('Cannot get view, because it has not been set yet.');
    }

    /**
    * @type {Observable} The component's unique binding context.
    *
    * Normally, a NativeScript view implicitly inherits its parent view's `bindingContext` if
    * its own hasn't been set. However, in order to ensure that each Component instance has its own
    * context (i.e. so that the context of a Component doesn't collide with that of its parent or
    * siblings) this class automatically assigns the view its own unique `bindingContext`.
    */
    get bindingContext() {

        if (!(this.view.bindingContext && this._bindingContextSet)) {
            this._view.bindingContext = new _observable.Observable();
            this._bindingContextSet = true;
        }
        return this.view.bindingContext;
    }

    set bindingContext(context) {
        this.view.bindingContext = context;
    }

    /**
    * @type {Object} - Contains any navigation context properties passed during the transition.
    */
    get navigationContext() {
        return this.view.navigationContext;
    }

    /**
    * @type {} - Optional context provided if the component was shown modally.
    */
    get modalContext() {
        return this._modalContext;
    }

    /**
    * @type {boolean} - By default, multiple instances of the component can be created,
    *                   and each instance is destroyed upon its view's `unloaded` event. To change this behavior so
    *                   that only a single instance of your component is created and is kept alive throughout
    *                   the lifetime of your application, override this property to be `true`.
    */
    static get isSingleton() {
        return false;
    }

    /**
    * Hook for the view's `navigationTo` event which automatically sets the component's
    * `view` property and automatically binds the `navigationContext` properties to the
    * component instance.
    *
    * @param {Object}  options
    * @param {ui/View} options.object
    */
    onNavigatingTo() /* options */{

        this.init(...arguments);
    }

    /**
    * Hook for the view's `navigatedTo` event.
    *
    * @param {Object}  options
    * @param {ui/View} options.object
    * @param {Object}  options.object.navigationContext
    */
    onNavigatedTo() /* options */{

        this.init(...arguments);
    }

    /**
    * Hook for the view's `loaded` event which automatically sets the component's `view` property
    * and binds any properties passed as XML attributes to the component's `bindingContext`. If the no
    * properties are passed as XML attributes, then the `bindingContext` is not set, allowing the UI
    * to instead use the parent component's `bindingContext`.
    *
    * @param {Object}  options
    * @param {ui/View} options.object
    */
    onLoaded() /* options */{

        this.init(...arguments);
    }

    /**
    * Hook for the view's `shownModally` event which automatically sets the component's
    * `view` property, binds the `navigationContext` properties to the
    * component instance and sets its `closeModal` function.
    *
    * @param {Object}   options
    * @param {ui/View}  options.object
    * @param {}         options.context       - Modal context
    * @param {Function} options.closeCallback
    */
    onShownModally(options) {

        this.init(...arguments);
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
    * @returns {Promise.<>}  - A promise containing the results passed back by the modal.
    */
    showModal(options) {

        return (0, _parameterValidator.validateAsync)(options, ['modal']).then(() => {

            let { modal, context, fullscreen } = options,
                resolve,
                reject,
                currentPage = _frame2.default.topmost().currentPage;

            let promise = new Promise((...args) => [resolve, reject] = args);
            let callback = (err, ret) => err ? reject(err) : resolve(ret);

            currentPage.showModal(modal, context, callback, fullscreen);
            return promise;
        });
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
    closeModal() {

        if (this._closeModalCallback) {
            return this._closeModalCallback(...arguments);
        }
        throw new Error(`No 'closeCallback' function has been set, probably because the component hasn't been shown modally`);
    }

    /**
    * A common initialization method invoked by the various lifecycle hooks (e.g. `onLoaded`, `onNavigatingTo`).
    *
    * @param {Object}  options
    * @param {ui/View} options.object
    * @param {}        options.object.navigationContext
    * @param {}        options.object[*]                - Any properties passed as custom XML attributes.
    */
    init(options) {

        this._view = options.object;

        // If any properties were passed as custom XML attributes, set those as properties within
        // the binding context.
        let params = this._getPropertiesPassedAsXmlAttributes(this._view);

        for (let key in params) {
            this.set(key, params[key]);
        }

        this._setNavigationContextProperties(this._view.navigationContext);
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
    static export(moduleExports) {

        let componentManager = new _ComponentManager2.default({ componentClass: this });
        componentManager.export(moduleExports);
    }

    /**
    * When parameters are passed to a component as XML attributes, they provided as
    * properties on the container. This method picks out such properties by comparing
    * the container to a new instance of the same class.
    *
    * @private
    */
    _getPropertiesPassedAsXmlAttributes(container) {

        let exampleInstance = new container.constructor(),
            parameters = {};

        let shouldIgnoreKey = key => key === 'exports' || key.includes('xmlns');

        for (let key of Object.getOwnPropertyNames(container)) {
            if (exampleInstance[key] === undefined && key[0] !== '_' && !shouldIgnoreKey(key)) {
                parameters[key] = container[key];
            }
        }
        return parameters;
    }

    _setNavigationContextProperties(context) {

        if (typeof context === 'object') {
            for (let key in context) {
                this.set(key, context[key]);
            }
        }
    }
}

exports.default = Component;