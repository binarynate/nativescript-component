import { Observable } from 'data/observable';
import { validateAsync } from 'parameter-validator';
import frame from 'ui/frame';
import ComponentManager from './ComponentManager';
import { getBindingContextProperty, getComponentForView } from './component-utils';

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
    get(name) {
        this._validateBindingContext();
        return getBindingContextProperty(this.bindingContext, name);
    }

    /**
    * Override this hook to perform any initialization your component needs. Use `get()` to get
    * properties that were passed to your component as XML attributes or via the navigation context.
    *
    * This hook is called after the parent component has been initialized and before child
    * components have been initialized, so parents can safely pass values and dependencies to their
    * children.
    */
    init() {
        // Userland
    }

    /**
    * The component's view.
    * @type {ui/View}
    */
    get view() {

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
    get bindingContext() {

        return this.view.bindingContext;
    }

    set bindingContext(context) {
        this.view.bindingContext = context;
    }

    /**
    * Contains any navigation context properties passed during the transition.
    *
    * @type {Object}
    */
    get navigationContext() {
        return this.view.navigationContext;
    }

    /**
    * Optional context provided if the component was shown modally.
    *
    * @type {}
    */
    get modalContext() {
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
    static get isSingleton() {
        return false;
    }

    /**
    * If the component's root element is `Page`, hook this method up to its XML template's `navigatingTo` event (i.e. `navigatingTo="onNavigatingTo"`)
    * so that the component is instantiated when the view is loaded.
    *
    * @see init           - The hook in which you place initialization code
    * @see onLoaded       - The hook that should be used instead of `onNavigatingTo` for components whose root element is not `Page`
    *
    * **Note that this hook can only be used for components whose
    * root element is `Page`.**
    *
    * @param {Object}  options
    * @param {ui/View} options.object
    */
    onNavigatingTo(/* options */) {

        this._internalInit(...arguments);
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
    onNavigatedTo(/* options */) {

        this._internalInit(...arguments);
    }

    /**
    * If the component's root element is not `Page`, hook this method up to its XML template's `loaded` event (i.e. `loaded="onLoaded"`)
    * so that the component is instantiated when the view is loaded.
    *
    * @see init           - The hook in which you place initialization code
    * @see onShownModally - Can be used instead of `onLoaded` if the component is presented via `showModal`
    * @see onNavigatingTo - The hook that should be used instead of `onLoaded` for components whose root element is `Page`
    *
    * @param {Object}  options
    * @param {ui/View} options.object
    */
    onLoaded(/* options */) {

        this._internalInit(...arguments);
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
    onShownModally(options) {

        this._internalInit(...arguments);
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
    showModal(options) {

        return validateAsync(options, [ 'modal' ])
        .then(() => {

            let { modal, context, fullscreen } = options,
                resolve,
                reject,
                currentPage = frame.topmost().currentPage;

            let promise = new Promise((...args) => ([ resolve, reject ] = args));
            let callback = (err, ret) => err ? reject(err) : resolve(ret);

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
    navigate() {

        let arg = arguments[0];

        if (typeof arg === 'object' && typeof arg.component === 'string') {
            let { component } = arg;
            arg.moduleName = `components/${component}/${component}`;
        }
        return frame.topmost().navigate(...arguments);
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

        let componentManager = new ComponentManager({ componentClass: this });
        componentManager.export(moduleExports);
    }

    /**
    * When parameters are passed to a component as XML attributes, they provided as
    * properties on the container. This method picks out such properties by comparing
    * the container to a new instance of the same class.
    *
    * @private
    */
    _getNamesOfPropertiesPassedAsXmlAttributes() {

        let exampleInstance = new this.view.constructor(),
            parameters = [];

        let shouldIgnoreKey = key => key === 'exports' || key.includes('xmlns');

        for (let key of Object.getOwnPropertyNames(this.view)) {
            if (exampleInstance[key] === undefined && key[0] !== '_' && !shouldIgnoreKey(key)) {
                parameters.push(key);
            }
        }
        return parameters;
    }

    /**
    * @param   {ui/View}        view
    * @returns {Component|null}
    * @private
    */
    _getParentComponent() {
        // When a view's parent is itself, it's the outermost view.
        if (this.view.parent === this.view) return null;
        return getComponentForView(this.view.parent);
    }

    /**
    * Hooks up a listener for the Page's loaded event. The listener is used to ensure
    * that the outer components' `init` methods are called before those of the inner components.
    * @private
    */
    _hookUpPageLoadedEvent() {

        if ((this.view.page === this.view) && this.view.isLoaded) {
            this._callPublicInitHook();
        }

        this.view.page.on('loaded', this._onPageLoaded.bind(this));
    }

    /**
    * A common internal initialization method invoked by the various lifecycle hooks (e.g. `onLoaded`, `onNavigatingTo`) to initialize the instance.
    *
    * @param {Object}  options
    * @param {ui/View} options.object
    * @param {}        options.object.navigationContext
    * @param {}        options.object[x]                 - Any properties passed as custom XML attributes.
    * @private
    */
    _internalInit(options) {

        this._view = options.object;

        // First, get the names of all the properties passed as XML attributes in the template.f
        let paramNames = this._getNamesOfPropertiesPassedAsXmlAttributes();

        let xmlParamsToApply = {};

        // NativeScript sets properties on the view for every parameter passed as an XML attribute,
        // however the parameters that are expressions (e.g. "{{ myBoundVariable }}") are empty objects
        // on the view and are actually set on the original bindingContext (i.e. the parent's bindingContext).
        // To handle that, for each of the properties passed as XML attributes, we first try to get the
        // value from the original bindingContext and if it's not there, fall back to the value from the view object.
        for (let paramName of paramNames) {

            let valueFromOriginalBindingContext,
                valueFromParentBindingContext,
                valueFromView = this.view[paramName];

            try {
                // In a try / catch block, because the view's bindingContext could be undefined before _setNewBindingContextIfNeeded() is invoked.
                valueFromOriginalBindingContext = this.get(paramName);
            } catch(error) {}

            try {
                // In a try / catch block, because the parent view's bindingContext could be undefined.
                let parentBindingContext = this.view._parent.bindingContext;
                valueFromParentBindingContext = getBindingContextProperty(parentBindingContext, paramName);
            } catch (error) {}

            xmlParamsToApply[paramName] = valueFromOriginalBindingContext || valueFromParentBindingContext || valueFromView;
        }

        this._setNewBindingContextIfNeeded();

        // Set all of the properties passed as XML attributes on the bindingContext, because a new bindingContext
        // was probably applied, and even if the original bindingContext is still used, it won't contain the
        // parameters that weren't expressions (e.g. myStaticValue="foo" as opposed to myDynamicValue="{{ myBoundVariable }}") .
        for (let paramName in xmlParamsToApply) {
            let value = xmlParamsToApply[paramName];
            this.set(paramName, value);
        }

        this._setNavigationContextProperties(this.view.navigationContext);
        this._hookUpPageLoadedEvent();
    }

    /**
    * Invokes the public `init` hook and sets properties which help ensure that the `init` is called for outer components
    * before it's called for nested components.
    * @private
    */
    _callPublicInitHook() {

        // `_wasCalled` is used by child components to determine when their hooks can be called.
        this.init._wasCalled = true;
        // `_returnValue` is used by child components so that if this component's hook returns a Promise,
        // the child's hook isn't invoked until that Promise is resolved or rejected.
        this.init._returnValue = this.init();
        return this.init._returnValue;
    }

    /**
    * Callback invoked on the Page's loaded event, which does most of the work to ensure that outer
    * components' `init` methods are called before `init` is called for their nested components (and
    * the nested components of those components, and so on). This is *opposite* of the order in which
    * components' `onLoaded` events are naturally called (i.e. inside-out).
    *
    * One strange quirk of Page components is that listeners for the Page's onLoaded event are called
    * *before* the component's own `onLoaded` hook is called. Due to this, the outside-in `init` flow
    * only works when using the `onNavigatingTo` hook to hook up top-level Page components; if `onLoaded`
    * is used to hook up an outer Page component, the Page component's `init` hook will be called *after*
    * `init` is called for the nested components. Therefore, a warning is logged ot the console if
    * `onLoaded` is used to hook up a Page component.
    *
    * @private
    */
    _onPageLoaded() {

        let parentComponent = this._getParentComponent();

        if (!parentComponent) {
            // This component is the outermost component, so go ahead and call the hook.
            return this._callPublicInitHook();
        }

        if (parentComponent.init._wasCalled) {
            // The parent component's page loaded hook has already been called, so call this
            // component's hook, waiting for the parent's component's promise to resolve if needed.
            if (parentComponent.init._returnValue instanceof Promise) {
                return parentComponent.init._returnValue
                .catch(() => {})
                .then(() => this._callPublicInitHook());
            }
            return this._callPublicInitHook();
        }

        // The parent component's hook hasn't been called yet, so let's monkey patch it so that
        // this component's hook is called after it, waiting for the parent's promise to resolve if needed.
        let originalParentInitFunction = parentComponent.init.bind(parentComponent);

        parentComponent.init = (...args) => {

            let returnValue;
            try {
                returnValue = originalParentInitFunction(...args);
            } catch (error) {}

            if (returnValue instanceof Promise) {
                return returnValue
                .catch(() => {})
                .then(() => this._callPublicInitHook());
            }
            return this._callPublicInitHook();
        };
    }

    /**
    * Assigns this component its own, new bindingContext if its bindingContext is
    * undefined or has been inherited from its parent.
    */
    _setNewBindingContextIfNeeded() {

        let parent = this.view._parent;
        let parentBindingContext = parent ? parent.bindingContext : undefined;

        if (this.view.bindingContext === parentBindingContext) {
            this.view.bindingContext = new Observable();
        }
    }

    _setNavigationContextProperties(context) {

        if (typeof context === 'object') {
            for (let key in context) {
                this.set(key, context[key]);
            }
        }
    }

    _validateBindingContext() {

        if (this.bindingContext === undefined) {
            let message = `Component ${this.constructor.name} has not been initialized via an initialization hook. ` +
                          `Please ensure that one of the component's initialization hooks (e.g. onLoaded) is hooked up in its XML template ` +
                          `and that if it overrides the base class's implementation of the hook, it still invokes base class's implementation.`;
            throw new Error(message);
        }
    }
}

export default Component;
